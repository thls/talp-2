import { describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { mkdtemp, readFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

async function createAppWithTempStore() {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "students-test-"));
  const { app } = buildApp({
    studentsFilePath: path.join(tempDir, "students.json"),
    classesFilePath: path.join(tempDir, "classes.json"),
    gradesFilePath: path.join(tempDir, "grades.json"),
    emailLogsFilePath: path.join(tempDir, "email-logs.json")
  });
  return { app, tempDir };
}

describe("GET /health", () => {
  it("retorna status ok", async () => {
    const { app } = buildApp();
    const response = await app.inject({ method: "GET", url: "/health" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok" });
    await app.close();
  });
});

describe("Busca e métricas", () => {
  it("filtra alunos e turmas por termo com query search", async () => {
    const { app } = await createAppWithTempStore();

    await app.inject({
      method: "POST",
      url: "/students",
      payload: { name: "Ana Paula", cpf: "12345678901", email: "ana@exemplo.com" }
    });
    await app.inject({
      method: "POST",
      url: "/students",
      payload: { name: "Bruno", cpf: "12345678902", email: "bruno@exemplo.com" }
    });
    await app.inject({
      method: "POST",
      url: "/classes",
      payload: { topic: "Matemática", year: 2026, semester: 1, capacity: 40 }
    });
    await app.inject({
      method: "POST",
      url: "/classes",
      payload: { topic: "Física", year: 2026, semester: 2, capacity: 40 }
    });

    const students = await app.inject({ method: "GET", url: "/students?search=ana%20paula" });
    const classes = await app.inject({ method: "GET", url: "/classes?search=mat" });

    expect(students.statusCode).toBe(200);
    expect(students.json().students.some((student: { name: string }) => student.name === "Ana Paula")).toBe(
      true
    );
    expect(classes.statusCode).toBe(200);
    expect(classes.json().classes.some((cls: { topic: string }) => cls.topic === "Matemática")).toBe(true);
    await app.close();
  });

  it("retorna média real das notas em GET /stats", async () => {
    const { app } = await createAppWithTempStore();

    const student = await app.inject({
      method: "POST",
      url: "/students",
      payload: { name: "Ana", cpf: "12345678901", email: "ana@exemplo.com" }
    });
    const studentId = (student.json() as { id: string }).id;
    const cls = await app.inject({
      method: "POST",
      url: "/classes",
      payload: { topic: "ES", year: 2026, semester: 1, capacity: 40 }
    });
    const classId = (cls.json() as { id: string }).id;

    await app.inject({
      method: "POST",
      url: `/classes/${classId}/students`,
      payload: { studentId }
    });
    await app.inject({
      method: "PUT",
      url: `/classes/${classId}/grades/${studentId}/Requisitos`,
      payload: { concept: "MANA" }
    });
    await app.inject({
      method: "PUT",
      url: `/classes/${classId}/grades/${studentId}/Testes`,
      payload: { concept: "MA" }
    });

    const stats = await app.inject({ method: "GET", url: "/stats" });
    expect(stats.statusCode).toBe(200);
    expect(stats.json().averageGrade).toBe(7);
    await app.close();
  });
});

describe("POST /students", () => {
  it("cadastra aluno válido e lista no GET /students", async () => {
    const { app } = await createAppWithTempStore();

    const createResponse = await app.inject({
      method: "POST",
      url: "/students",
      payload: { name: "Ana Silva", cpf: "123.456.789-01", email: "ana@example.com" }
    });

    expect(createResponse.statusCode).toBe(201);
    expect(createResponse.json()).toMatchObject({
      name: "Ana Silva",
      cpf: "12345678901",
      email: "ana@example.com"
    });

    const listResponse = await app.inject({ method: "GET", url: "/students" });
    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json().students).toHaveLength(1);
    expect(listResponse.json().students[0]).toMatchObject({
      name: "Ana Silva",
      cpf: "12345678901",
      email: "ana@example.com"
    });

    await app.close();
  });

  it("bloqueia CPF duplicado", async () => {
    const { app } = await createAppWithTempStore();

    await app.inject({
      method: "POST",
      url: "/students",
      payload: { name: "Aluno 1", cpf: "12345678901", email: "aluno1@example.com" }
    });

    const duplicateResponse = await app.inject({
      method: "POST",
      url: "/students",
      payload: { name: "Aluno 2", cpf: "12345678901", email: "aluno2@example.com" }
    });

    expect(duplicateResponse.statusCode).toBe(409);
    expect(duplicateResponse.json()).toEqual({ message: "CPF já cadastrado." });
    await app.close();
  });

  it("valida campos obrigatórios, cpf e email", async () => {
    const { app } = await createAppWithTempStore();

    const emptyResponse = await app.inject({
      method: "POST",
      url: "/students",
      payload: { name: "", cpf: "", email: "" }
    });
    expect(emptyResponse.statusCode).toBe(400);

    const invalidCpfResponse = await app.inject({
      method: "POST",
      url: "/students",
      payload: { name: "Ana", cpf: "123", email: "ana@example.com" }
    });
    expect(invalidCpfResponse.statusCode).toBe(400);
    expect(invalidCpfResponse.json()).toEqual({ message: "CPF inválido. Informe 11 dígitos." });

    const invalidEmailResponse = await app.inject({
      method: "POST",
      url: "/students",
      payload: { name: "Ana", cpf: "12345678901", email: "ana-invalido" }
    });
    expect(invalidEmailResponse.statusCode).toBe(400);
    expect(invalidEmailResponse.json()).toEqual({ message: "Email inválido." });

    await app.close();
  });

  it("persiste em JSON após cadastro", async () => {
    const { app, tempDir } = await createAppWithTempStore();

    await app.inject({
      method: "POST",
      url: "/students",
      payload: { name: "Carlos", cpf: "99988877766", email: "carlos@example.com" }
    });

    const fileContent = await readFile(path.join(tempDir, "students.json"), "utf-8");
    const parsed = JSON.parse(fileContent) as { students: unknown[] };
    expect(parsed.students).toHaveLength(1);
    expect(parsed.students[0]).toMatchObject({
      name: "Carlos",
      cpf: "99988877766",
      email: "carlos@example.com"
    });

    await app.close();
  });
});

describe("PUT /students/:id", () => {
  it("atualiza aluno com dados válidos", async () => {
    const { app } = await createAppWithTempStore();

    const created = await app.inject({
      method: "POST",
      url: "/students",
      payload: { name: "Ana", cpf: "12345678901", email: "ana@example.com" }
    });
    const studentId = (created.json() as { id: string }).id;

    const updateResponse = await app.inject({
      method: "PUT",
      url: `/students/${studentId}`,
      payload: { name: "Ana Souza", cpf: "12345678901", email: "ana.souza@example.com" }
    });

    expect(updateResponse.statusCode).toBe(200);
    expect(updateResponse.json()).toMatchObject({
      id: studentId,
      name: "Ana Souza",
      cpf: "12345678901",
      email: "ana.souza@example.com"
    });

    const listResponse = await app.inject({ method: "GET", url: "/students" });
    expect(listResponse.json().students[0]).toMatchObject({
      id: studentId,
      name: "Ana Souza",
      email: "ana.souza@example.com"
    });

    await app.close();
  });

  it("bloqueia edição com CPF de outro aluno", async () => {
    const { app } = await createAppWithTempStore();

    const first = await app.inject({
      method: "POST",
      url: "/students",
      payload: { name: "Aluno 1", cpf: "11111111111", email: "aluno1@example.com" }
    });
    const second = await app.inject({
      method: "POST",
      url: "/students",
      payload: { name: "Aluno 2", cpf: "22222222222", email: "aluno2@example.com" }
    });
    const secondId = (second.json() as { id: string }).id;

    const response = await app.inject({
      method: "PUT",
      url: `/students/${secondId}`,
      payload: {
        name: "Aluno 2",
        cpf: (first.json() as { cpf: string }).cpf,
        email: "aluno2@example.com"
      }
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({ message: "CPF já cadastrado." });
    await app.close();
  });

  it("retorna 404 ao editar aluno inexistente", async () => {
    const { app } = await createAppWithTempStore();

    const response = await app.inject({
      method: "PUT",
      url: "/students/nao-existe",
      payload: { name: "Ana", cpf: "12345678901", email: "ana@example.com" }
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ message: "Aluno não encontrado." });
    await app.close();
  });
});

describe("DELETE /students/:id", () => {
  it("remove aluno existente e some da lista", async () => {
    const { app, tempDir } = await createAppWithTempStore();

    const created = await app.inject({
      method: "POST",
      url: "/students",
      payload: { name: "Aluno", cpf: "99988877766", email: "aluno@example.com" }
    });
    const id = (created.json() as { id: string }).id;

    const removeResponse = await app.inject({ method: "DELETE", url: `/students/${id}` });
    expect(removeResponse.statusCode).toBe(204);

    const listResponse = await app.inject({ method: "GET", url: "/students" });
    expect(listResponse.json().students).toHaveLength(0);

    const fileContent = await readFile(path.join(tempDir, "students.json"), "utf-8");
    const parsed = JSON.parse(fileContent) as { students: unknown[] };
    expect(parsed.students).toHaveLength(0);

    await app.close();
  });

  it("retorna 404 ao remover aluno inexistente", async () => {
    const { app } = await createAppWithTempStore();

    const removeResponse = await app.inject({
      method: "DELETE",
      url: "/students/nao-existe"
    });
    expect(removeResponse.statusCode).toBe(404);
    expect(removeResponse.json()).toEqual({ message: "Aluno não encontrado." });
    await app.close();
  });

  it("cascade: remove aluno das turmas e apaga suas avaliações", async () => {
    const { app } = await createAppWithTempStore();

    const studentRes = await app.inject({
      method: "POST",
      url: "/students",
      payload: { name: "Ana", cpf: "12345678901", email: "ana@example.com" }
    });
    const studentId = (studentRes.json() as { id: string }).id;

    const classRes = await app.inject({
      method: "POST",
      url: "/classes",
      payload: { topic: "Engenharia de Software", year: 2026, semester: 1, capacity: 40 }
    });
    const classId = (classRes.json() as { id: string }).id;

    await app.inject({
      method: "POST",
      url: `/classes/${classId}/students`,
      payload: { studentId }
    });

    await app.inject({
      method: "PUT",
      url: `/classes/${classId}/grades/${studentId}/Requisitos`,
      payload: { concept: "MANA" }
    });

    await app.inject({ method: "DELETE", url: `/students/${studentId}` });

    const classDetail = await app.inject({ method: "GET", url: `/classes/${classId}` });
    const detail = classDetail.json() as { students: unknown[]; grades: unknown[] };
    expect(detail.students).toHaveLength(0);
    expect(detail.grades).toHaveLength(0);

    await app.close();
  });
});
