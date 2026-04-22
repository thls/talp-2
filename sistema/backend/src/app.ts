import Fastify from "fastify";
import cors from "@fastify/cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  isValidCpf,
  isValidEmail,
  normalizeCpf,
  StudentStore
} from "./student-store.js";

type BuildAppOptions = {
  studentsFilePath?: string;
};

const defaultStudentsFilePath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../data/students.json"
);

export function buildApp(options: BuildAppOptions = {}) {
  const app = Fastify();
  const store = new StudentStore(options.studentsFilePath ?? defaultStudentsFilePath);

  void app.register(cors, {
    origin: true
  });

  app.get("/health", async () => {
    return { status: "ok" };
  });

  app.get("/students", async () => {
    const students = await store.list();
    return { students };
  });

  app.post("/students", async (request, reply) => {
    const payload = request.body as {
      name?: string;
      cpf?: string;
      email?: string;
    };

    const name = payload.name?.trim() ?? "";
    const cpf = payload.cpf?.trim() ?? "";
    const email = payload.email?.trim() ?? "";

    if (!name || !cpf || !email) {
      return reply.status(400).send({
        message: "Campos obrigatórios: nome, CPF e email."
      });
    }

    if (!isValidCpf(cpf)) {
      return reply.status(400).send({
        message: "CPF inválido. Informe 11 dígitos."
      });
    }

    if (!isValidEmail(email)) {
      return reply.status(400).send({
        message: "Email inválido."
      });
    }

    try {
      const student = await store.add({
        name,
        cpf: normalizeCpf(cpf),
        email
      });

      return reply.status(201).send(student);
    } catch (error) {
      if ((error as Error).message === "DUPLICATE_CPF") {
        return reply.status(409).send({
          message: "CPF já cadastrado."
        });
      }
      throw error;
    }
  });

  app.put("/students/:id", async (request, reply) => {
    const params = request.params as { id?: string };
    const payload = request.body as {
      name?: string;
      cpf?: string;
      email?: string;
    };

    const id = params.id?.trim() ?? "";
    const name = payload.name?.trim() ?? "";
    const cpf = payload.cpf?.trim() ?? "";
    const email = payload.email?.trim() ?? "";

    if (!id) {
      return reply.status(400).send({
        message: "Identificador do aluno é obrigatório."
      });
    }

    if (!name || !cpf || !email) {
      return reply.status(400).send({
        message: "Campos obrigatórios: nome, CPF e email."
      });
    }

    if (!isValidCpf(cpf)) {
      return reply.status(400).send({
        message: "CPF inválido. Informe 11 dígitos."
      });
    }

    if (!isValidEmail(email)) {
      return reply.status(400).send({
        message: "Email inválido."
      });
    }

    try {
      const updated = await store.update(id, {
        name,
        cpf: normalizeCpf(cpf),
        email
      });
      return reply.status(200).send(updated);
    } catch (error) {
      const message = (error as Error).message;
      if (message === "DUPLICATE_CPF") {
        return reply.status(409).send({
          message: "CPF já cadastrado."
        });
      }
      if (message === "STUDENT_NOT_FOUND") {
        return reply.status(404).send({
          message: "Aluno não encontrado."
        });
      }
      throw error;
    }
  });

  app.delete("/students/:id", async (request, reply) => {
    const params = request.params as { id?: string };
    const id = params.id?.trim() ?? "";

    if (!id) {
      return reply.status(400).send({
        message: "Identificador do aluno é obrigatório."
      });
    }

    try {
      await store.remove(id);
      return reply.status(204).send();
    } catch (error) {
      if ((error as Error).message === "STUDENT_NOT_FOUND") {
        return reply.status(404).send({
          message: "Aluno não encontrado."
        });
      }
      throw error;
    }
  });

  return app;
}
