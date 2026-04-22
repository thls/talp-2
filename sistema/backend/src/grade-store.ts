import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { GRADE_CONCEPTS, type GradeConcept } from "./constants.js";

export type Grade = {
  id: string;
  studentId: string;
  classId: string;
  meta: string;
  concept: GradeConcept;
  updatedAt: string;
};

export type GradeChange = {
  id: string;
  studentId: string;
  classId: string;
  meta: string;
  previousConcept: GradeConcept | null;
  newConcept: GradeConcept;
  changedAt: string;
};

type GradesFile = {
  grades: Grade[];
  changes: GradeChange[];
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isGradeLike(value: unknown): value is Grade {
  if (!isObject(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.studentId === "string" &&
    typeof value.classId === "string" &&
    typeof value.meta === "string" &&
    typeof value.concept === "string"
  );
}

function isChangeLike(value: unknown): value is GradeChange {
  if (!isObject(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.studentId === "string" &&
    typeof value.classId === "string" &&
    typeof value.meta === "string" &&
    typeof value.newConcept === "string" &&
    typeof value.changedAt === "string"
  );
}

export class GradeStore {
  private readonly filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  async getForClass(classId: string): Promise<Grade[]> {
    const payload = await this.readGradesFile();
    return payload.grades.filter((g) => g.classId === classId);
  }

  async getAll(): Promise<Grade[]> {
    const payload = await this.readGradesFile();
    return payload.grades;
  }

  async setGrade(input: {
    studentId: string;
    classId: string;
    meta: string;
    concept: GradeConcept;
  }): Promise<Grade> {
    if (!GRADE_CONCEPTS.includes(input.concept)) {
      throw new Error("INVALID_CONCEPT");
    }

    const payload = await this.readGradesFile();
    const existingIndex = payload.grades.findIndex(
      (g) =>
        g.studentId === input.studentId &&
        g.classId === input.classId &&
        g.meta === input.meta
    );

    const previous = existingIndex >= 0 ? payload.grades[existingIndex] : null;
    const now = new Date().toISOString();

    const grade: Grade = {
      id: previous?.id ?? randomUUID(),
      studentId: input.studentId,
      classId: input.classId,
      meta: input.meta,
      concept: input.concept,
      updatedAt: now
    };

    if (existingIndex >= 0) {
      payload.grades[existingIndex] = grade;
    } else {
      payload.grades.push(grade);
    }

    const change: GradeChange = {
      id: randomUUID(),
      studentId: input.studentId,
      classId: input.classId,
      meta: input.meta,
      previousConcept: previous?.concept ?? null,
      newConcept: input.concept,
      changedAt: now
    };
    payload.changes.push(change);

    await this.writeGradesFile(payload);
    return grade;
  }

  async getChangesForDate(date: string): Promise<GradeChange[]> {
    const payload = await this.readGradesFile();
    return payload.changes.filter((c) => c.changedAt.startsWith(date));
  }

  async removeForStudent(studentId: string): Promise<void> {
    const payload = await this.readGradesFile();
    payload.grades = payload.grades.filter((g) => g.studentId !== studentId);
    payload.changes = payload.changes.filter((c) => c.studentId !== studentId);
    await this.writeGradesFile(payload);
  }

  private async readGradesFile(): Promise<GradesFile> {
    try {
      const raw = await readFile(this.filePath, "utf-8");
      const parsed: unknown = JSON.parse(raw);
      if (!isObject(parsed)) return { grades: [], changes: [] };
      return {
        grades: Array.isArray(parsed.grades)
          ? (parsed.grades as unknown[]).filter(isGradeLike)
          : [],
        changes: Array.isArray(parsed.changes)
          ? (parsed.changes as unknown[]).filter(isChangeLike)
          : []
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        const fallback: GradesFile = { grades: [], changes: [] };
        await this.writeGradesFile(fallback);
        return fallback;
      }
      throw error;
    }
  }

  private async writeGradesFile(payload: GradesFile): Promise<void> {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(payload, null, 2), "utf-8");
  }
}
