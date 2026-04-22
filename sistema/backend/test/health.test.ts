import { describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { mkdtemp, readFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

describe("GET /health", () => {
  it("retorna status ok", async () => {
    const app = buildApp();
    const response = await app.inject({
      method: "GET",
      url: "/health"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok" });

    await app.close();
  });
});

describe("POST /students", () => {
  async function createAppWithTempStore() {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "students-test-"));
    const app = buildApp({
      studentsFilePath: path.join(tempDir, "students.json")
    });
    return { app, tempDir };
  }

  it("cadastra aluno válido e lista no GET /students", async () => {
    const { app } = await createAppWithTempStore();

    const createResponse = await app.inject({
      method: "POST",
      url: "/students",
      payload: {
        name: "Ana Silva",
        cpf: "123.456.789-01",
        email: "ana@example.com"
      }
    });

    expect(createResponse.statusCode).toBe(201);
    expect(createResponse.json()).toMatchObject({
      name: "Ana Silva",
      cpf: "12345678901",
      email: "ana@example.com"
    });

    const listResponse = await app.inject({
      method: "GET",
      url: "/students"
    });

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
      payload: {
        name: "Aluno 1",
        cpf: "12345678901",
        email: "aluno1@example.com"
      }
    });

    const duplicateResponse = await app.inject({
      method: "POST",
      url: "/students",
      payload: {
        name: "Aluno 2",
        cpf: "12345678901",
        email: "aluno2@example.com"
      }
    });

    expect(duplicateResponse.statusCode).toBe(409);
    expect(duplicateResponse.json()).toEqual({
      message: "CPF já cadastrado."
    });

    await app.close();
  });

  it("valida campos obrigatórios, cpf e email", async () => {
    const { app } = await createAppWithTempStore();

    const emptyFieldsResponse = await app.inject({
      method: "POST",
      url: "/students",
      payload: {
        name: "",
        cpf: "",
        email: ""
      }
    });
    expect(emptyFieldsResponse.statusCode).toBe(400);

    const invalidCpfResponse = await app.inject({
      method: "POST",
      url: "/students",
      payload: {
        name: "Ana",
        cpf: "123",
        email: "ana@example.com"
      }
    });
    expect(invalidCpfResponse.statusCode).toBe(400);
    expect(invalidCpfResponse.json()).toEqual({
      message: "CPF inválido. Informe 11 dígitos."
    });

    const invalidEmailResponse = await app.inject({
      method: "POST",
      url: "/students",
      payload: {
        name: "Ana",
        cpf: "12345678901",
        email: "ana-invalido"
      }
    });
    expect(invalidEmailResponse.statusCode).toBe(400);
    expect(invalidEmailResponse.json()).toEqual({
      message: "Email inválido."
    });

    await app.close();
  });

  it("persiste em JSON após cadastro", async () => {
    const { app, tempDir } = await createAppWithTempStore();

    await app.inject({
      method: "POST",
      url: "/students",
      payload: {
        name: "Carlos",
        cpf: "99988877766",
        email: "carlos@example.com"
      }
    });

    const fileContent = await readFile(path.join(tempDir, "students.json"), "utf-8");
    const parsed = JSON.parse(fileContent);

    expect(parsed.students).toHaveLength(1);
    expect(parsed.students[0]).toMatchObject({
      name: "Carlos",
      cpf: "99988877766",
      email: "carlos@example.com"
    });

    await app.close();
  });
});
