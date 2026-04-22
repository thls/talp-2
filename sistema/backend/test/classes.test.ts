import { describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { mkdtemp } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

async function createAppWithTempStore() {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "classes-test-"));
  const { app } = buildApp({
    studentsFilePath: path.join(tempDir, "students.json"),
    classesFilePath: path.join(tempDir, "classes.json"),
    gradesFilePath: path.join(tempDir, "grades.json"),
    emailLogsFilePath: path.join(tempDir, "email-logs.json")
  });
  return { app };
}

async function createStudent(app: Awaited<ReturnType<typeof createAppWithTempStore>>["app"]) {
  const res = await app.inject({
    method: "POST",
    url: "/students",
    payload: { name: "Ana", cpf: "12345678901", email: "ana@example.com" }
  });
  return res.json() as { id: string };
}

async function createClass(
  app: Awaited<ReturnType<typeof createAppWithTempStore>>["app"],
  overrides: { topic?: string; year?: number; semester?: number; capacity?: number } = {}
) {
  const res = await app.inject({
    method: "POST",
    url: "/classes",
    payload: {
      topic: overrides.topic ?? "Engenharia de Software",
      year: overrides.year ?? 2026,
      semester: overrides.semester ?? 1,
      capacity: overrides.capacity ?? 40
    }
  });
  return res.json() as {
    id: string;
    topic: string;
    year: number;
    semester: number;
    capacity: number;
    studentIds: string[];
  };
}

describe("GET /classes", () => {
  it("retorna lista vazia inicialmente", async () => {
    const { app } = await createAppWithTempStore();
    const res = await app.inject({ method: "GET", url: "/classes" });
    expect(res.statusCode).toBe(200);
    expect(res.json().classes).toEqual([]);
    await app.close();
  });

  it("lista turmas cadastradas", async () => {
    const { app } = await createAppWithTempStore();
    await createClass(app);
    const res = await app.inject({ method: "GET", url: "/classes" });
    expect(res.json().classes).toHaveLength(1);
    await app.close();
  });
});

describe("POST /classes", () => {
  it("cadastra turma com dados válidos", async () => {
    const { app } = await createAppWithTempStore();
    const res = await app.inject({
      method: "POST",
      url: "/classes",
      payload: { topic: "Requisitos", year: 2026, semester: 1, capacity: 40 }
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({
      topic: "Requisitos",
      year: 2026,
      semester: 1,
      capacity: 40,
      studentIds: []
    });
    await app.close();
  });

  it("bloqueia duplicidade de tópico+ano+semestre", async () => {
    const { app } = await createAppWithTempStore();
    await createClass(app, { topic: "ES", year: 2026, semester: 1 });
    const dup = await app.inject({
      method: "POST",
      url: "/classes",
      payload: { topic: "ES", year: 2026, semester: 1, capacity: 40 }
    });
    expect(dup.statusCode).toBe(409);
    expect(dup.json().message).toMatch(/tópico/i);
    await app.close();
  });

  it("permite mesma turma em semestres diferentes", async () => {
    const { app } = await createAppWithTempStore();
    await createClass(app, { topic: "ES", year: 2026, semester: 1 });
    const res = await app.inject({
      method: "POST",
      url: "/classes",
      payload: { topic: "ES", year: 2026, semester: 2, capacity: 40 }
    });
    expect(res.statusCode).toBe(201);
    await app.close();
  });

  it("valida campos obrigatórios", async () => {
    const { app } = await createAppWithTempStore();
    const res = await app.inject({
      method: "POST",
      url: "/classes",
      payload: { topic: "", year: 2026, semester: 1 }
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  it("valida semestre inválido", async () => {
    const { app } = await createAppWithTempStore();
    const res = await app.inject({
      method: "POST",
      url: "/classes",
      payload: { topic: "ES", year: 2026, semester: 3, capacity: 40 }
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().message).toMatch(/semestre/i);
    await app.close();
  });

  it("persiste turma após criação (recarrego = turma presente)", async () => {
    const { app } = await createAppWithTempStore();
    await createClass(app);
    const list = await app.inject({ method: "GET", url: "/classes" });
    expect(list.json().classes).toHaveLength(1);
    await app.close();
  });
});

describe("PUT /classes/:id", () => {
  it("atualiza tópico, ano e semestre sem perder alunos", async () => {
    const { app } = await createAppWithTempStore();
    const student = await createStudent(app);
    const cls = await createClass(app, { topic: "ES", year: 2026, semester: 1 });

    await app.inject({
      method: "POST",
      url: `/classes/${cls.id}/students`,
      payload: { studentId: student.id }
    });

    const update = await app.inject({
      method: "PUT",
      url: `/classes/${cls.id}`,
      payload: { topic: "Testes", year: 2027, semester: 2, capacity: 40 }
    });

    expect(update.statusCode).toBe(200);
    expect(update.json()).toMatchObject({ topic: "Testes", year: 2027, semester: 2, capacity: 40 });
    expect((update.json() as { studentIds: string[] }).studentIds).toContain(student.id);
    await app.close();
  });

  it("bloqueia duplicidade na edição", async () => {
    const { app } = await createAppWithTempStore();
    await createClass(app, { topic: "ES", year: 2026, semester: 1 });
    const cls2 = await createClass(app, { topic: "ES", year: 2026, semester: 2 });

    const res = await app.inject({
      method: "PUT",
      url: `/classes/${cls2.id}`,
      payload: { topic: "ES", year: 2026, semester: 1, capacity: 40 }
    });
    expect(res.statusCode).toBe(409);
    await app.close();
  });

  it("retorna 404 para turma inexistente", async () => {
    const { app } = await createAppWithTempStore();
    const res = await app.inject({
      method: "PUT",
      url: "/classes/nao-existe",
      payload: { topic: "ES", year: 2026, semester: 1, capacity: 40 }
    });
    expect(res.statusCode).toBe(404);
    await app.close();
  });
});

describe("DELETE /classes/:id", () => {
  it("remove turma existente", async () => {
    const { app } = await createAppWithTempStore();
    const cls = await createClass(app);
    const del = await app.inject({ method: "DELETE", url: `/classes/${cls.id}` });
    expect(del.statusCode).toBe(204);

    const list = await app.inject({ method: "GET", url: "/classes" });
    expect(list.json().classes).toHaveLength(0);
    await app.close();
  });

  it("retorna 404 ao remover turma inexistente", async () => {
    const { app } = await createAppWithTempStore();
    const res = await app.inject({ method: "DELETE", url: "/classes/nao-existe" });
    expect(res.statusCode).toBe(404);
    await app.close();
  });

  it("remove avaliações vinculadas ao excluir turma", async () => {
    const { app } = await createAppWithTempStore();
    const student = await createStudent(app);
    const cls = await createClass(app);
    await app.inject({
      method: "POST",
      url: `/classes/${cls.id}/students`,
      payload: { studentId: student.id }
    });
    await app.inject({
      method: "PUT",
      url: `/classes/${cls.id}/grades/${student.id}/Requisitos`,
      payload: { concept: "MANA" }
    });

    const del = await app.inject({ method: "DELETE", url: `/classes/${cls.id}` });
    expect(del.statusCode).toBe(204);

    const gradesAfter = await app.inject({ method: "GET", url: `/classes/${cls.id}/grades` });
    expect(gradesAfter.statusCode).toBe(404);
    await app.close();
  });
});

describe("GET /classes/:id (detalhe)", () => {
  it("retorna turma com alunos matriculados e avaliações", async () => {
    const { app } = await createAppWithTempStore();
    const student = await createStudent(app);
    const cls = await createClass(app);

    await app.inject({
      method: "POST",
      url: `/classes/${cls.id}/students`,
      payload: { studentId: student.id }
    });
    await app.inject({
      method: "PUT",
      url: `/classes/${cls.id}/grades/${student.id}/Requisitos`,
      payload: { concept: "MANA" }
    });

    const detail = await app.inject({ method: "GET", url: `/classes/${cls.id}` });
    expect(detail.statusCode).toBe(200);
    const body = detail.json() as {
      students: Array<{ id: string }>;
      grades: Array<{ meta: string; concept: string }>;
    };
    expect(body.students).toHaveLength(1);
    expect(body.students[0].id).toBe(student.id);
    expect(body.grades).toHaveLength(1);
    expect(body.grades[0]).toMatchObject({ meta: "Requisitos", concept: "MANA" });
    await app.close();
  });

  it("retorna 404 para turma inexistente", async () => {
    const { app } = await createAppWithTempStore();
    const res = await app.inject({ method: "GET", url: "/classes/nao-existe" });
    expect(res.statusCode).toBe(404);
    await app.close();
  });

  it("mostra apenas alunos desta turma (isolamento entre turmas)", async () => {
    const { app } = await createAppWithTempStore();

    const s1 = await app.inject({
      method: "POST",
      url: "/students",
      payload: { name: "Ana", cpf: "11111111111", email: "ana@x.com" }
    });
    const s2 = await app.inject({
      method: "POST",
      url: "/students",
      payload: { name: "Bruno", cpf: "22222222222", email: "bruno@x.com" }
    });

    const c1 = await createClass(app, { topic: "ES", year: 2026, semester: 1 });
    const c2 = await createClass(app, { topic: "ES", year: 2026, semester: 2 });

    await app.inject({
      method: "POST",
      url: `/classes/${c1.id}/students`,
      payload: { studentId: (s1.json() as { id: string }).id }
    });
    await app.inject({
      method: "POST",
      url: `/classes/${c2.id}/students`,
      payload: { studentId: (s2.json() as { id: string }).id }
    });

    const detail1 = await app.inject({ method: "GET", url: `/classes/${c1.id}` });
    const students1 = (detail1.json() as { students: Array<{ id: string }> }).students;
    expect(students1).toHaveLength(1);
    expect(students1[0].id).toBe((s1.json() as { id: string }).id);

    await app.close();
  });
});

describe("POST /classes/:classId/students (matrícula)", () => {
  it("matricula aluno existente", async () => {
    const { app } = await createAppWithTempStore();
    const student = await createStudent(app);
    const cls = await createClass(app);

    const res = await app.inject({
      method: "POST",
      url: `/classes/${cls.id}/students`,
      payload: { studentId: student.id }
    });
    expect(res.statusCode).toBe(200);
    expect((res.json() as { studentIds: string[] }).studentIds).toContain(student.id);
    await app.close();
  });

  it("bloqueia matrícula duplicada", async () => {
    const { app } = await createAppWithTempStore();
    const student = await createStudent(app);
    const cls = await createClass(app);

    await app.inject({
      method: "POST",
      url: `/classes/${cls.id}/students`,
      payload: { studentId: student.id }
    });
    const dup = await app.inject({
      method: "POST",
      url: `/classes/${cls.id}/students`,
      payload: { studentId: student.id }
    });
    expect(dup.statusCode).toBe(409);
    await app.close();
  });

  it("retorna 404 para aluno inexistente", async () => {
    const { app } = await createAppWithTempStore();
    const cls = await createClass(app);
    const res = await app.inject({
      method: "POST",
      url: `/classes/${cls.id}/students`,
      payload: { studentId: "nao-existe" }
    });
    expect(res.statusCode).toBe(404);
    await app.close();
  });

  it("bloqueia matrícula quando turma atinge capacidade", async () => {
    const { app } = await createAppWithTempStore();
    const s1 = await app.inject({
      method: "POST",
      url: "/students",
      payload: { name: "Ana", cpf: "12345678901", email: "ana@example.com" }
    });
    const s2 = await app.inject({
      method: "POST",
      url: "/students",
      payload: { name: "Bruno", cpf: "12345678902", email: "bruno@example.com" }
    });
    const cls = await createClass(app, { capacity: 1 });
    await app.inject({
      method: "POST",
      url: `/classes/${cls.id}/students`,
      payload: { studentId: (s1.json() as { id: string }).id }
    });
    const full = await app.inject({
      method: "POST",
      url: `/classes/${cls.id}/students`,
      payload: { studentId: (s2.json() as { id: string }).id }
    });
    expect(full.statusCode).toBe(409);
    expect(full.json().message).toMatch(/capacidade/i);
    await app.close();
  });
});

describe("DELETE /classes/:classId/students/:studentId (desmatricular)", () => {
  it("remove aluno da turma", async () => {
    const { app } = await createAppWithTempStore();
    const student = await createStudent(app);
    const cls = await createClass(app);

    await app.inject({
      method: "POST",
      url: `/classes/${cls.id}/students`,
      payload: { studentId: student.id }
    });

    const res = await app.inject({
      method: "DELETE",
      url: `/classes/${cls.id}/students/${student.id}`
    });
    expect(res.statusCode).toBe(200);
    expect((res.json() as { studentIds: string[] }).studentIds).not.toContain(student.id);
    await app.close();
  });
});
