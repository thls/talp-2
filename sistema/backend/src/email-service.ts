import type { StudentStore } from "./student-store.js";
import type { ClassStore } from "./class-store.js";
import type { GradeChange, GradeStore } from "./grade-store.js";
import type { EmailLogStore } from "./email-log-store.js";

export type SendMailFn = (to: string, subject: string, text: string) => Promise<void>;

export class EmailService {
  constructor(
    private readonly studentStore: StudentStore,
    private readonly classStore: ClassStore,
    private readonly gradeStore: GradeStore,
    private readonly emailLogStore: EmailLogStore,
    private readonly sendMail: SendMailFn
  ) {}

  async runDailyNotifications(date?: string): Promise<void> {
    const today = date ?? new Date().toISOString().slice(0, 10);
    const changes = await this.gradeStore.getChangesForDate(today);
    if (changes.length === 0) return;

    const byStudent = new Map<string, GradeChange[]>();
    for (const change of changes) {
      const list = byStudent.get(change.studentId) ?? [];
      byStudent.set(change.studentId, [...list, change]);
    }

    const students = await this.studentStore.list();
    const classes = await this.classStore.list();

    for (const [studentId, studentChanges] of byStudent) {
      const alreadySent = await this.emailLogStore.hasSentToday(studentId, today);
      if (alreadySent) continue;

      const student = students.find((s) => s.id === studentId);
      if (!student) continue;

      const existingRetries = await this.emailLogStore.getPendingOrFailed(today);
      const existingLog = existingRetries.find((l) => l.studentId === studentId);

      const logId =
        existingLog?.id ??
        (await this.emailLogStore.createLog({
          studentId,
          date: today,
          changeIds: studentChanges.map((c) => c.id)
        }));

      try {
        const text = this.buildEmailBody(
          student.name,
          studentChanges,
          classes.map((c) => ({ id: c.id, topic: c.topic, year: c.year, semester: c.semester }))
        );
        await this.sendMail(student.email, "Avaliações atualizadas", text);
        await this.emailLogStore.updateStatus(logId, "sent");
      } catch {
        await this.emailLogStore.updateStatus(logId, "failed");
      }
    }
  }

  private buildEmailBody(
    studentName: string,
    changes: GradeChange[],
    classes: Array<{ id: string; topic: string; year: number; semester: number }>
  ): string {
    const lines: string[] = [
      `Olá ${studentName},`,
      "",
      "Suas avaliações foram atualizadas hoje:",
      ""
    ];

    const byClass = new Map<string, GradeChange[]>();
    for (const change of changes) {
      const list = byClass.get(change.classId) ?? [];
      byClass.set(change.classId, [...list, change]);
    }

    for (const [classId, classChanges] of byClass) {
      const cls = classes.find((c) => c.id === classId);
      const label = cls ? `${cls.topic} — ${cls.year}/${cls.semester}` : classId;
      lines.push(`Turma: ${label}`);
      for (const change of classChanges) {
        const prev = change.previousConcept
          ? ` | Anterior: ${change.previousConcept}`
          : " (nova avaliação)";
        lines.push(`  - Meta: ${change.meta}${prev} | Novo: ${change.newConcept}`);
      }
      lines.push("");
    }

    return lines.join("\n");
  }
}
