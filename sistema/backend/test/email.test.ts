import { describe, expect, it, vi } from "vitest";
import { mkdtemp } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { StudentStore } from "../src/student-store.js";
import { ClassStore } from "../src/class-store.js";
import { GradeStore } from "../src/grade-store.js";
import { EmailLogStore } from "../src/email-log-store.js";
import { EmailService } from "../src/email-service.js";

async function createStores() {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "email-test-"));
  const studentStore = new StudentStore(path.join(tempDir, "students.json"));
  const classStore = new ClassStore(path.join(tempDir, "classes.json"));
  const gradeStore = new GradeStore(path.join(tempDir, "grades.json"));
  const emailLogStore = new EmailLogStore(path.join(tempDir, "email-logs.json"));
  return { studentStore, classStore, gradeStore, emailLogStore };
}

const TODAY = "2026-04-22";

async function setupStudentWithGradeChange(
  studentStore: StudentStore,
  classStore: ClassStore,
  gradeStore: GradeStore,
  date: string
) {
  const student = await studentStore.add({
    name: "Ana",
    cpf: "12345678901",
    email: "ana@example.com"
  });
  const cls = await classStore.add({ topic: "ES", year: 2026, semester: 1 });
  await classStore.enrollStudent(cls.id, student.id);

  vi.setSystemTime(new Date(`${date}T10:00:00.000Z`));
  await gradeStore.setGrade({
    studentId: student.id,
    classId: cls.id,
    meta: "Requisitos",
    concept: "MANA"
  });
  vi.useRealTimers();

  return { student, cls };
}

describe("EmailService.runDailyNotifications", () => {
  it("envia um e-mail para aluno com alterações no dia", async () => {
    vi.useFakeTimers();
    const { studentStore, classStore, gradeStore, emailLogStore } = await createStores();
    const sendMail = vi.fn().mockResolvedValue(undefined);
    const service = new EmailService(studentStore, classStore, gradeStore, emailLogStore, sendMail);

    const { student } = await setupStudentWithGradeChange(
      studentStore,
      classStore,
      gradeStore,
      TODAY
    );

    await service.runDailyNotifications(TODAY);

    expect(sendMail).toHaveBeenCalledOnce();
    expect(sendMail).toHaveBeenCalledWith(
      student.email,
      "Avaliações atualizadas",
      expect.stringContaining("Ana")
    );
    vi.useRealTimers();
  });

  it("não envia e-mail se não houver alterações no dia", async () => {
    const { studentStore, classStore, gradeStore, emailLogStore } = await createStores();
    const sendMail = vi.fn().mockResolvedValue(undefined);
    const service = new EmailService(studentStore, classStore, gradeStore, emailLogStore, sendMail);

    await service.runDailyNotifications(TODAY);

    expect(sendMail).not.toHaveBeenCalled();
  });

  it("não envia e-mail duplicado se já enviou hoje", async () => {
    vi.useFakeTimers();
    const { studentStore, classStore, gradeStore, emailLogStore } = await createStores();
    const sendMail = vi.fn().mockResolvedValue(undefined);
    const service = new EmailService(studentStore, classStore, gradeStore, emailLogStore, sendMail);

    await setupStudentWithGradeChange(studentStore, classStore, gradeStore, TODAY);

    await service.runDailyNotifications(TODAY);
    await service.runDailyNotifications(TODAY);

    expect(sendMail).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });

  it("consolida múltiplas alterações do mesmo aluno em um único e-mail", async () => {
    vi.useFakeTimers();
    const { studentStore, classStore, gradeStore, emailLogStore } = await createStores();
    const sendMail = vi.fn().mockResolvedValue(undefined);
    const service = new EmailService(studentStore, classStore, gradeStore, emailLogStore, sendMail);

    const student = await studentStore.add({
      name: "Bruno",
      cpf: "99988877766",
      email: "bruno@example.com"
    });
    const cls = await classStore.add({ topic: "ES", year: 2026, semester: 1 });
    await classStore.enrollStudent(cls.id, student.id);

    vi.setSystemTime(new Date(`${TODAY}T10:00:00.000Z`));
    await gradeStore.setGrade({ studentId: student.id, classId: cls.id, meta: "Requisitos", concept: "MANA" });
    await gradeStore.setGrade({ studentId: student.id, classId: cls.id, meta: "Testes", concept: "MPA" });
    await gradeStore.setGrade({ studentId: student.id, classId: cls.id, meta: "Implementação", concept: "MA" });
    vi.useRealTimers();

    await service.runDailyNotifications(TODAY);

    expect(sendMail).toHaveBeenCalledOnce();
    const body = (sendMail.mock.calls[0] as string[])[2];
    expect(body).toContain("Requisitos");
    expect(body).toContain("Testes");
    expect(body).toContain("Implementação");
  });

  it("envia e-mails separados para alunos diferentes", async () => {
    vi.useFakeTimers();
    const { studentStore, classStore, gradeStore, emailLogStore } = await createStores();
    const sendMail = vi.fn().mockResolvedValue(undefined);
    const service = new EmailService(studentStore, classStore, gradeStore, emailLogStore, sendMail);

    const s1 = await studentStore.add({ name: "Ana", cpf: "11111111111", email: "ana@example.com" });
    const s2 = await studentStore.add({ name: "Carlos", cpf: "22222222222", email: "carlos@example.com" });
    const cls = await classStore.add({ topic: "ES", year: 2026, semester: 1 });
    await classStore.enrollStudent(cls.id, s1.id);
    await classStore.enrollStudent(cls.id, s2.id);

    vi.setSystemTime(new Date(`${TODAY}T10:00:00.000Z`));
    await gradeStore.setGrade({ studentId: s1.id, classId: cls.id, meta: "Requisitos", concept: "MANA" });
    await gradeStore.setGrade({ studentId: s2.id, classId: cls.id, meta: "Testes", concept: "MA" });
    vi.useRealTimers();

    await service.runDailyNotifications(TODAY);

    expect(sendMail).toHaveBeenCalledTimes(2);
  });

  it("o corpo do e-mail discrimina turma, meta, conceito anterior e novo", async () => {
    vi.useFakeTimers();
    const { studentStore, classStore, gradeStore, emailLogStore } = await createStores();
    const sendMail = vi.fn().mockResolvedValue(undefined);
    const service = new EmailService(studentStore, classStore, gradeStore, emailLogStore, sendMail);

    const student = await studentStore.add({
      name: "Ana",
      cpf: "12345678901",
      email: "ana@example.com"
    });
    const cls = await classStore.add({ topic: "Engenharia de Software", year: 2026, semester: 1 });
    await classStore.enrollStudent(cls.id, student.id);

    const day1 = "2026-04-21";
    vi.setSystemTime(new Date(`${day1}T10:00:00.000Z`));
    await gradeStore.setGrade({ studentId: student.id, classId: cls.id, meta: "Requisitos", concept: "MANA" });

    vi.setSystemTime(new Date(`${TODAY}T10:00:00.000Z`));
    await gradeStore.setGrade({ studentId: student.id, classId: cls.id, meta: "Requisitos", concept: "MPA" });
    vi.useRealTimers();

    await service.runDailyNotifications(TODAY);

    const body = (sendMail.mock.calls[0] as string[])[2];
    expect(body).toContain("Engenharia de Software");
    expect(body).toContain("Requisitos");
    expect(body).toContain("MANA");
    expect(body).toContain("MPA");
  });

  it("não processa alterações de outros dias", async () => {
    vi.useFakeTimers();
    const { studentStore, classStore, gradeStore, emailLogStore } = await createStores();
    const sendMail = vi.fn().mockResolvedValue(undefined);
    const service = new EmailService(studentStore, classStore, gradeStore, emailLogStore, sendMail);

    await setupStudentWithGradeChange(studentStore, classStore, gradeStore, "2026-04-21");

    await service.runDailyNotifications(TODAY);

    expect(sendMail).not.toHaveBeenCalled();
  });

  it("marca falha no log e não envia duplicado em reprocessamento", async () => {
    vi.useFakeTimers();
    const { studentStore, classStore, gradeStore, emailLogStore } = await createStores();
    let callCount = 0;
    const sendMail = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) return Promise.reject(new Error("SMTP error"));
      return Promise.resolve();
    });
    const service = new EmailService(studentStore, classStore, gradeStore, emailLogStore, sendMail);

    await setupStudentWithGradeChange(studentStore, classStore, gradeStore, TODAY);

    await service.runDailyNotifications(TODAY);
    expect(sendMail).toHaveBeenCalledOnce();

    await service.runDailyNotifications(TODAY);
    expect(sendMail).toHaveBeenCalledTimes(2);

    await service.runDailyNotifications(TODAY);
    expect(sendMail).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});

describe("POST /notifications/daily (via HTTP)", () => {
  it("processa notificações e retorna 200", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "notif-test-"));
    const sendMail = vi.fn().mockResolvedValue(undefined);
    const { buildApp } = await import("../src/app.js");
    const { app } = buildApp({
      studentsFilePath: path.join(tempDir, "students.json"),
      classesFilePath: path.join(tempDir, "classes.json"),
      gradesFilePath: path.join(tempDir, "grades.json"),
      emailLogsFilePath: path.join(tempDir, "email-logs.json"),
      sendMail
    });

    const res = await app.inject({
      method: "POST",
      url: "/notifications/daily",
      payload: { date: TODAY }
    });
    expect(res.statusCode).toBe(200);
    await app.close();
  });
});
