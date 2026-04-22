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

  void app.register(cors, {
    origin: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
  });

  // ─── Health ───────────────────────────────────────────────────────────────

  app.get("/health", async () => ({ status: "ok" }));

  app.get("/stats", async () => {
    const [students, classes, grades] = await Promise.all([
      studentStore.list(),
      classStore.list(),
      gradeStore.getAll()
    ]);
    const gradeValues: Record<string, number> = { MANA: 4, MPA: 7, MA: 10 };
    const totalScore = grades.reduce((acc, grade) => acc + (gradeValues[grade.concept] ?? 0), 0);
    const averageGrade = grades.length > 0 ? Number((totalScore / grades.length).toFixed(2)) : 0;

    return {
      studentCount: students.length,
      classCount: classes.length,
      gradeCount: grades.length,
      averageGrade
    };
  });

  // ─── Students ─────────────────────────────────────────────────────────────

  app.get("/students", async (request) => {
    const searchFromQuery = (request.query as { search?: string } | undefined)?.search;
    const queryString = (request.raw.url ?? "").split("?")[1] ?? "";
    const searchFromUrl = new URLSearchParams(queryString).get("search") ?? "";
    const search = searchFromQuery || searchFromUrl;
    const students = await studentStore.list();
    const term = search?.trim().toLowerCase();
    const filtered = !term
      ? students
      : students.filter(
          (student) =>
            student.name.toLowerCase().includes(term) ||
            student.email.toLowerCase().includes(term) ||
            student.cpf.includes(term.replace(/\D/g, ""))
        );
    return { students: filtered };
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

  app.get("/classes", async (request) => {
    const searchFromQuery = (request.query as { search?: string } | undefined)?.search;
    const queryString = (request.raw.url ?? "").split("?")[1] ?? "";
    const searchFromUrl = new URLSearchParams(queryString).get("search") ?? "";
    const search = searchFromQuery || searchFromUrl;
    const classes = await classStore.list();
    const term = search?.trim().toLowerCase();
    const filtered = !term
      ? classes
      : classes.filter(
          (cls) =>
            cls.topic.toLowerCase().includes(term) ||
            String(cls.year).includes(term) ||
            String(cls.semester).includes(term)
        );
    return { classes: filtered };
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
    const payload = request.body as {
      topic?: string;
      year?: unknown;
      semester?: unknown;
      capacity?: unknown;
    };
    const topic = payload.topic?.trim() ?? "";
    const year = Number(payload.year);
    const semester = Number(payload.semester);
    const capacity = Number(payload.capacity);

    if (!topic || !year || !semester || !capacity)
      return reply
        .status(400)
        .send({ message: "Campos obrigatórios: tópico, ano, semestre e capacidade." });
    if (!Number.isInteger(year) || year < 2000)
      return reply.status(400).send({ message: "Ano inválido." });
    if (semester !== 1 && semester !== 2)
      return reply.status(400).send({ message: "Semestre deve ser 1 ou 2." });
    if (!Number.isInteger(capacity) || capacity < 1)
      return reply.status(400).send({ message: "Capacidade deve ser um inteiro maior que zero." });

    try {
      const newClass = await classStore.add({ topic, year, semester, capacity });
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
    const payload = request.body as {
      topic?: string;
      year?: unknown;
      semester?: unknown;
      capacity?: unknown;
    };
    const topic = payload.topic?.trim() ?? "";
    const year = Number(payload.year);
    const semester = Number(payload.semester);
    const capacity = Number(payload.capacity);

    if (!topic || !year || !semester || !capacity)
      return reply
        .status(400)
        .send({ message: "Campos obrigatórios: tópico, ano, semestre e capacidade." });
    if (!Number.isInteger(year) || year < 2000)
      return reply.status(400).send({ message: "Ano inválido." });
    if (semester !== 1 && semester !== 2)
      return reply.status(400).send({ message: "Semestre deve ser 1 ou 2." });
    if (!Number.isInteger(capacity) || capacity < 1)
      return reply.status(400).send({ message: "Capacidade deve ser um inteiro maior que zero." });

    try {
      const updated = await classStore.update(id, { topic, year, semester, capacity });
      return reply.status(200).send(updated);
    } catch (error) {
      const msg = (error as Error).message;
      if (msg === "DUPLICATE_CLASS")
        return reply
          .status(409)
          .send({ message: "Já existe uma turma com esse tópico, ano e semestre." });
      if (msg === "CLASS_NOT_FOUND")
        return reply.status(404).send({ message: "Turma não encontrada." });
      if (msg === "CAPACITY_BELOW_ENROLLMENTS")
        return reply.status(409).send({ message: "Capacidade menor que o total de alunos matriculados." });
      throw error;
    }
  });

  app.delete("/classes/:id", async (request, reply) => {
    const { id = "" } = request.params as { id?: string };
    try {
      await classStore.remove(id);
      await gradeStore.removeForClass(id);
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
      if (msg === "CLASS_CAPACITY_REACHED")
        return reply.status(409).send({ message: "Turma está com capacidade máxima atingida." });
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

  app.delete("/classes/:classId/grades/:studentId/:meta", async (request, reply) => {
    const { classId = "", studentId = "", meta = "" } = request.params as {
      classId?: string;
      studentId?: string;
      meta?: string;
    };
    const cls = await classStore.getById(classId);
    if (!cls) return reply.status(404).send({ message: "Turma não encontrada." });

    try {
      await gradeStore.removeGrade({ classId, studentId, meta });
      return reply.status(204).send();
    } catch (error) {
      if ((error as Error).message === "GRADE_NOT_FOUND") {
        return reply.status(404).send({ message: "Avaliação não encontrada." });
      }
      throw error;
    }
  });

  // ─── Notifications ────────────────────────────────────────────────────────

  app.post("/notifications/daily", async (request, reply) => {
    const { date } = (request.body as { date?: string }) ?? {};
    await emailService.runDailyNotifications(date);
    return reply.status(200).send({ message: "Notificações processadas." });
  });

  app.get("/notifications", async () => {
    const [logs, students] = await Promise.all([emailLogStore.list(), studentStore.list()]);
    const studentsMap = new Map(students.map((student) => [student.id, student]));

    const notifications = logs
      .slice()
      .sort((a, b) => (b.sentAt ?? b.date).localeCompare(a.sentAt ?? a.date))
      .map((log) => {
        const student = studentsMap.get(log.studentId);
        return {
          id: log.id,
          status: log.status,
          date: log.date,
          sentAt: log.sentAt,
          retryCount: log.retryCount,
          studentName: student?.name ?? "Aluno removido",
          studentEmail: student?.email ?? "",
          totalChanges: log.changeIds.length
        };
      });

    return { notifications };
  });

  return { app, emailService };
}
