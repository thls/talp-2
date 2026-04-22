import Fastify from "fastify";
import cors from "@fastify/cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isValidCpf, isValidEmail, normalizeCpf, StudentStore } from "./student-store.js";
import { ClassStore } from "./class-store.js";
import { GradeStore } from "./grade-store.js";
import { EmailLogStore } from "./email-log-store.js";
import { EmailService, type SendMailFn } from "./email-service.js";
import { GRADE_CONCEPTS } from "./constants.js";

const dataDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../data");

type BuildAppOptions = {
  studentsFilePath?: string;
  classesFilePath?: string;
  gradesFilePath?: string;
  emailLogsFilePath?: string;
  sendMail?: SendMailFn;
};

export function buildApp(options: BuildAppOptions = {}): {
  app: ReturnType<typeof Fastify>;
  emailService: EmailService;
} {
  const app = Fastify();

  const studentStore = new StudentStore(
    options.studentsFilePath ?? path.join(dataDir, "students.json")
  );
  const classStore = new ClassStore(
    options.classesFilePath ?? path.join(dataDir, "classes.json")
  );
  const gradeStore = new GradeStore(
    options.gradesFilePath ?? path.join(dataDir, "grades.json")
  );
  const emailLogStore = new EmailLogStore(
    options.emailLogsFilePath ?? path.join(dataDir, "email-logs.json")
  );

  const noopSendMail: SendMailFn = async () => {};
  const emailService = new EmailService(
    studentStore,
    classStore,
    gradeStore,
    emailLogStore,
    options.sendMail ?? noopSendMail
  );

  void app.register(cors, { origin: true });

  // ─── Health ───────────────────────────────────────────────────────────────

  app.get("/health", async () => ({ status: "ok" }));

  // ─── Students ─────────────────────────────────────────────────────────────

  app.get("/students", async () => {
    const students = await studentStore.list();
    return { students };
  });

  app.post("/students", async (request, reply) => {
    const payload = request.body as { name?: string; cpf?: string; email?: string };
    const name = payload.name?.trim() ?? "";
    const cpf = payload.cpf?.trim() ?? "";
    const email = payload.email?.trim() ?? "";

    if (!name || !cpf || !email)
      return reply.status(400).send({ message: "Campos obrigatórios: nome, CPF e email." });
    if (!isValidCpf(cpf))
      return reply.status(400).send({ message: "CPF inválido. Informe 11 dígitos." });
    if (!isValidEmail(email)) return reply.status(400).send({ message: "Email inválido." });

    try {
      const student = await studentStore.add({ name, cpf: normalizeCpf(cpf), email });
      return reply.status(201).send(student);
    } catch (error) {
      if ((error as Error).message === "DUPLICATE_CPF")
        return reply.status(409).send({ message: "CPF já cadastrado." });
      throw error;
    }
  });

  app.put("/students/:id", async (request, reply) => {
    const { id = "" } = request.params as { id?: string };
    const payload = request.body as { name?: string; cpf?: string; email?: string };
    const name = payload.name?.trim() ?? "";
    const cpf = payload.cpf?.trim() ?? "";
    const email = payload.email?.trim() ?? "";

    if (!id) return reply.status(400).send({ message: "Identificador do aluno é obrigatório." });
    if (!name || !cpf || !email)
      return reply.status(400).send({ message: "Campos obrigatórios: nome, CPF e email." });
    if (!isValidCpf(cpf))
      return reply.status(400).send({ message: "CPF inválido. Informe 11 dígitos." });
    if (!isValidEmail(email)) return reply.status(400).send({ message: "Email inválido." });

    try {
      const updated = await studentStore.update(id, { name, cpf: normalizeCpf(cpf), email });
      return reply.status(200).send(updated);
    } catch (error) {
      const msg = (error as Error).message;
      if (msg === "DUPLICATE_CPF")
        return reply.status(409).send({ message: "CPF já cadastrado." });
      if (msg === "STUDENT_NOT_FOUND")
        return reply.status(404).send({ message: "Aluno não encontrado." });
      throw error;
    }
  });

  app.delete("/students/:id", async (request, reply) => {
    const { id = "" } = request.params as { id?: string };
    if (!id) return reply.status(400).send({ message: "Identificador do aluno é obrigatório." });

    try {
      await studentStore.remove(id);
      await classStore.removeStudentFromAllClasses(id);
      await gradeStore.removeForStudent(id);
      return reply.status(204).send();
    } catch (error) {
      if ((error as Error).message === "STUDENT_NOT_FOUND")
        return reply.status(404).send({ message: "Aluno não encontrado." });
      throw error;
    }
  });

  // ─── Classes ──────────────────────────────────────────────────────────────

  app.get("/classes", async () => {
    const classes = await classStore.list();
    return { classes };
  });

  app.get("/classes/:id", async (request, reply) => {
    const { id = "" } = request.params as { id?: string };
    const cls = await classStore.getById(id);
    if (!cls) return reply.status(404).send({ message: "Turma não encontrada." });

    const allStudents = await studentStore.list();
    const students = allStudents.filter((s) => cls.studentIds.includes(s.id));
    const grades = await gradeStore.getForClass(id);

    return { ...cls, students, grades };
  });

  app.post("/classes", async (request, reply) => {
    const payload = request.body as { topic?: string; year?: unknown; semester?: unknown };
    const topic = payload.topic?.trim() ?? "";
    const year = Number(payload.year);
    const semester = Number(payload.semester);

    if (!topic || !year || !semester)
      return reply
        .status(400)
        .send({ message: "Campos obrigatórios: tópico, ano e semestre." });
    if (!Number.isInteger(year) || year < 2000)
      return reply.status(400).send({ message: "Ano inválido." });
    if (semester !== 1 && semester !== 2)
      return reply.status(400).send({ message: "Semestre deve ser 1 ou 2." });

    try {
      const newClass = await classStore.add({ topic, year, semester });
      return reply.status(201).send(newClass);
    } catch (error) {
      if ((error as Error).message === "DUPLICATE_CLASS")
        return reply
          .status(409)
          .send({ message: "Já existe uma turma com esse tópico, ano e semestre." });
      throw error;
    }
  });

  app.put("/classes/:id", async (request, reply) => {
    const { id = "" } = request.params as { id?: string };
    const payload = request.body as { topic?: string; year?: unknown; semester?: unknown };
    const topic = payload.topic?.trim() ?? "";
    const year = Number(payload.year);
    const semester = Number(payload.semester);

    if (!topic || !year || !semester)
      return reply
        .status(400)
        .send({ message: "Campos obrigatórios: tópico, ano e semestre." });
    if (!Number.isInteger(year) || year < 2000)
      return reply.status(400).send({ message: "Ano inválido." });
    if (semester !== 1 && semester !== 2)
      return reply.status(400).send({ message: "Semestre deve ser 1 ou 2." });

    try {
      const updated = await classStore.update(id, { topic, year, semester });
      return reply.status(200).send(updated);
    } catch (error) {
      const msg = (error as Error).message;
      if (msg === "DUPLICATE_CLASS")
        return reply
          .status(409)
          .send({ message: "Já existe uma turma com esse tópico, ano e semestre." });
      if (msg === "CLASS_NOT_FOUND")
        return reply.status(404).send({ message: "Turma não encontrada." });
      throw error;
    }
  });

  app.delete("/classes/:id", async (request, reply) => {
    const { id = "" } = request.params as { id?: string };
    try {
      await classStore.remove(id);
      return reply.status(204).send();
    } catch (error) {
      if ((error as Error).message === "CLASS_NOT_FOUND")
        return reply.status(404).send({ message: "Turma não encontrada." });
      throw error;
    }
  });

  // ─── Enrollment ───────────────────────────────────────────────────────────

  app.post("/classes/:classId/students", async (request, reply) => {
    const { classId = "" } = request.params as { classId?: string };
    const { studentId = "" } = request.body as { studentId?: string };

    if (!studentId)
      return reply.status(400).send({ message: "studentId é obrigatório." });

    const student = await studentStore.list().then((l) => l.find((s) => s.id === studentId));
    if (!student) return reply.status(404).send({ message: "Aluno não encontrado." });

    try {
      const updated = await classStore.enrollStudent(classId, studentId);
      return reply.status(200).send(updated);
    } catch (error) {
      const msg = (error as Error).message;
      if (msg === "CLASS_NOT_FOUND")
        return reply.status(404).send({ message: "Turma não encontrada." });
      if (msg === "STUDENT_ALREADY_ENROLLED")
        return reply.status(409).send({ message: "Aluno já matriculado nesta turma." });
      throw error;
    }
  });

  app.delete("/classes/:classId/students/:studentId", async (request, reply) => {
    const { classId = "", studentId = "" } = request.params as {
      classId?: string;
      studentId?: string;
    };

    try {
      const updated = await classStore.unenrollStudent(classId, studentId);
      return reply.status(200).send(updated);
    } catch (error) {
      if ((error as Error).message === "CLASS_NOT_FOUND")
        return reply.status(404).send({ message: "Turma não encontrada." });
      throw error;
    }
  });

  // ─── Grades ───────────────────────────────────────────────────────────────

  app.get("/classes/:classId/grades", async (request, reply) => {
    const { classId = "" } = request.params as { classId?: string };
    const cls = await classStore.getById(classId);
    if (!cls) return reply.status(404).send({ message: "Turma não encontrada." });
    const grades = await gradeStore.getForClass(classId);
    return { grades };
  });

  app.put("/classes/:classId/grades/:studentId/:meta", async (request, reply) => {
    const { classId = "", studentId = "", meta = "" } = request.params as {
      classId?: string;
      studentId?: string;
      meta?: string;
    };
    const { concept } = request.body as { concept?: string };

    if (!concept || !GRADE_CONCEPTS.includes(concept as never))
      return reply
        .status(400)
        .send({ message: `Conceito inválido. Use: ${GRADE_CONCEPTS.join(", ")}.` });

    const cls = await classStore.getById(classId);
    if (!cls) return reply.status(404).send({ message: "Turma não encontrada." });
    if (!cls.studentIds.includes(studentId))
      return reply.status(404).send({ message: "Aluno não matriculado nesta turma." });

    const grade = await gradeStore.setGrade({
      studentId,
      classId,
      meta,
      concept: concept as "MANA" | "MPA" | "MA"
    });
    return reply.status(200).send(grade);
  });

  // ─── Notifications ────────────────────────────────────────────────────────

  app.post("/notifications/daily", async (request, reply) => {
    const { date } = (request.body as { date?: string }) ?? {};
    await emailService.runDailyNotifications(date);
    return reply.status(200).send({ message: "Notificações processadas." });
  });

  return { app, emailService };
}
