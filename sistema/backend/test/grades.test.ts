import { describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { mkdtemp } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

async function createAppWithTempStore() {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "grades-test-"));
  const { app } = buildApp({
    studentsFilePath: path.join(tempDir, "students.json"),
    classesFilePath: path.join(tempDir, "classes.json"),
    gradesFilePath: path.join(tempDir, "grades.json"),
    emailLogsFilePath: path.join(tempDir, "email-logs.json")
  });
  return { app };
}

async function setupClassWithStudent(app: Awaited<ReturnType<typeof createAppWithTempStore>>["app"]) {
  const studentRes = await app.inject({
    method: "POST",
    url: "/students",
    payload: { name: "Ana", cpf: "12345678901", email: "ana@example.com" }
  });
  const studentId = (studentRes.json() as { id: string }).id;

  const classRes = await app.inject({
    method: "POST",
    url: "/classes",
    payload: { topic: "ES", year: 2026, semester: 1 }
  });
  const classId = (classRes.json() as { id: string }).id;

  await app.inject({
    method: "POST",
    url: `/classes/${classId}/students`,
    payload: { studentId }
  });

  return { studentId, classId };
}

describe("GET /classes/:classId/grades", () => {
  it("retorna lista vazia antes de qualquer avaliação", async () => {
    const { app } = await createAppWithTempStore();
    const { classId } = await setupClassWithStudent(app);

    const res = await app.inject({ method: "GET", url: `/classes/${classId}/grades` });
    expect(res.statusCode).toBe(200);
    expect(res.json().grades).toEqual([]);
    await app.close();
  });

  it("retorna 404 para turma inexistente", async () => {
    const { app } = await createAppWithTempStore();
    const res = await app.inject({ method: "GET", url: "/classes/nao-existe/grades" });
    expect(res.statusCode).toBe(404);
    await app.close();
  });
});

describe("PUT /classes/:classId/grades/:studentId/:meta", () => {
  it("registra avaliação válida MANA", async () => {
    const { app } = await createAppWithTempStore();
    const { studentId, classId } = await setupClassWithStudent(app);

    const res = await app.inject({
      method: "PUT",
      url: `/classes/${classId}/grades/${studentId}/Requisitos`,
      payload: { concept: "MANA" }
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      studentId,
      classId,
      meta: "Requisitos",
      concept: "MANA"
    });
    await app.close();
  });

  it("registra avaliação válida MPA", async () => {
    const { app } = await createAppWithTempStore();
    const { studentId, classId } = await setupClassWithStudent(app);

    const res = await app.inject({
      method: "PUT",
      url: `/classes/${classId}/grades/${studentId}/Testes`,
      payload: { concept: "MPA" }
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ concept: "MPA" });
    await app.close();
  });

  it("registra avaliação válida MA", async () => {
    const { app } = await createAppWithTempStore();
    const { studentId, classId } = await setupClassWithStudent(app);

    const res = await app.inject({
      method: "PUT",
      url: `/classes/${classId}/grades/${studentId}/Implementação`,
      payload: { concept: "MA" }
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ concept: "MA" });
    await app.close();
  });

  it("rejeita conceito inválido e mantém avaliação anterior", async () => {
    const { app } = await createAppWithTempStore();
    const { studentId, classId } = await setupClassWithStudent(app);

    await app.inject({
      method: "PUT",
      url: `/classes/${classId}/grades/${studentId}/Requisitos`,
      payload: { concept: "MANA" }
    });

    const invalid = await app.inject({
      method: "PUT",
      url: `/classes/${classId}/grades/${studentId}/Requisitos`,
      payload: { concept: "INVALIDO" }
    });
    expect(invalid.statusCode).toBe(400);
    expect(invalid.json().message).toMatch(/MANA.*MPA.*MA/i);

    const grades = await app.inject({
      method: "GET",
      url: `/classes/${classId}/grades`
    });
    const gradeList = (grades.json() as { grades: Array<{ concept: string }> }).grades;
    expect(gradeList[0].concept).toBe("MANA");

    await app.close();
  });

  it("atualiza avaliação existente", async () => {
    const { app } = await createAppWithTempStore();
    const { studentId, classId } = await setupClassWithStudent(app);

    await app.inject({
      method: "PUT",
      url: `/classes/${classId}/grades/${studentId}/Requisitos`,
      payload: { concept: "MANA" }
    });
    const update = await app.inject({
      method: "PUT",
      url: `/classes/${classId}/grades/${studentId}/Requisitos`,
      payload: { concept: "MA" }
    });
    expect(update.json()).toMatchObject({ concept: "MA" });

    const grades = await app.inject({ method: "GET", url: `/classes/${classId}/grades` });
    expect((grades.json() as { grades: unknown[] }).grades).toHaveLength(1);
    await app.close();
  });

  it("retorna 404 se aluno não está matriculado na turma", async () => {
    const { app } = await createAppWithTempStore();
    const classRes = await app.inject({
      method: "POST",
      url: "/classes",
      payload: { topic: "ES", year: 2026, semester: 1 }
    });
    const classId = (classRes.json() as { id: string }).id;

    const res = await app.inject({
      method: "PUT",
      url: `/classes/${classId}/grades/nao-matriculado/Requisitos`,
      payload: { concept: "MANA" }
    });
    expect(res.statusCode).toBe(404);
    await app.close();
  });

  it("retorna 404 para turma inexistente", async () => {
    const { app } = await createAppWithTempStore();
    const res = await app.inject({
      method: "PUT",
      url: "/classes/nao-existe/grades/qualquer-id/Requisitos",
      payload: { concept: "MANA" }
    });
    expect(res.statusCode).toBe(404);
    await app.close();
  });

  it("persiste avaliações — recarregar retorna valores salvos", async () => {
    const { app } = await createAppWithTempStore();
    const { studentId, classId } = await setupClassWithStudent(app);

    await app.inject({
      method: "PUT",
      url: `/classes/${classId}/grades/${studentId}/Requisitos`,
      payload: { concept: "MPA" }
    });
    await app.inject({
      method: "PUT",
      url: `/classes/${classId}/grades/${studentId}/Testes`,
      payload: { concept: "MA" }
    });

    const detail = await app.inject({ method: "GET", url: `/classes/${classId}` });
    const grades = (detail.json() as { grades: Array<{ meta: string; concept: string }> }).grades;
    expect(grades).toHaveLength(2);
    expect(grades.find((g) => g.meta === "Requisitos")?.concept).toBe("MPA");
    expect(grades.find((g) => g.meta === "Testes")?.concept).toBe("MA");
    await app.close();
  });

  it("avaliações ficam no escopo correto da turma (isolamento)", async () => {
    const { app } = await createAppWithTempStore();

    const studentRes = await app.inject({
      method: "POST",
      url: "/students",
      payload: { name: "Ana", cpf: "12345678901", email: "ana@example.com" }
    });
    const studentId = (studentRes.json() as { id: string }).id;

    const c1 = await app.inject({
      method: "POST",
      url: "/classes",
      payload: { topic: "ES", year: 2026, semester: 1 }
    });
    const c2 = await app.inject({
      method: "POST",
      url: "/classes",
      payload: { topic: "ES", year: 2026, semester: 2 }
    });
    const classId1 = (c1.json() as { id: string }).id;
    const classId2 = (c2.json() as { id: string }).id;

    await app.inject({
      method: "POST",
      url: `/classes/${classId1}/students`,
      payload: { studentId }
    });
    await app.inject({
      method: "POST",
      url: `/classes/${classId2}/students`,
      payload: { studentId }
    });

    await app.inject({
      method: "PUT",
      url: `/classes/${classId1}/grades/${studentId}/Requisitos`,
      payload: { concept: "MANA" }
    });
    await app.inject({
      method: "PUT",
      url: `/classes/${classId2}/grades/${studentId}/Requisitos`,
      payload: { concept: "MA" }
    });

    const grades1 = await app.inject({ method: "GET", url: `/classes/${classId1}/grades` });
    const grades2 = await app.inject({ method: "GET", url: `/classes/${classId2}/grades` });

    expect((grades1.json() as { grades: Array<{ concept: string }> }).grades[0].concept).toBe(
      "MANA"
    );
    expect((grades2.json() as { grades: Array<{ concept: string }> }).grades[0].concept).toBe(
      "MA"
    );

    await app.close();
  });
});
