import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export type Class = {
  id: string;
  topic: string;
  year: number;
  semester: number;
  studentIds: string[];
  createdAt: string;
};

type ClassesFile = {
  classes: Class[];
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isClassLike(value: unknown): value is Class {
  if (!isObject(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.topic === "string" &&
    typeof value.year === "number" &&
    typeof value.semester === "number"
  );
}

export class ClassStore {
  private readonly filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  async list(): Promise<Class[]> {
    const payload = await this.readClassesFile();
    return payload.classes;
  }

  async getById(id: string): Promise<Class | null> {
    const payload = await this.readClassesFile();
    return payload.classes.find((c) => c.id === id) ?? null;
  }

  async add(input: { topic: string; year: number; semester: number }): Promise<Class> {
    const payload = await this.readClassesFile();
    const topic = input.topic.trim();

    if (
      payload.classes.some(
        (c) => c.topic === topic && c.year === input.year && c.semester === input.semester
      )
    ) {
      throw new Error("DUPLICATE_CLASS");
    }

    const newClass: Class = {
      id: randomUUID(),
      topic,
      year: input.year,
      semester: input.semester,
      studentIds: [],
      createdAt: new Date().toISOString()
    };

    payload.classes.push(newClass);
    await this.writeClassesFile(payload);
    return newClass;
  }

  async update(
    id: string,
    input: { topic: string; year: number; semester: number }
  ): Promise<Class> {
    const payload = await this.readClassesFile();
    const index = payload.classes.findIndex((c) => c.id === id);
    if (index < 0) throw new Error("CLASS_NOT_FOUND");

    const topic = input.topic.trim();
    const isDuplicate = payload.classes.some(
      (c) =>
        c.id !== id && c.topic === topic && c.year === input.year && c.semester === input.semester
    );
    if (isDuplicate) throw new Error("DUPLICATE_CLASS");

    const current = payload.classes[index];
    const updated: Class = { ...current, topic, year: input.year, semester: input.semester };
    payload.classes[index] = updated;
    await this.writeClassesFile(payload);
    return updated;
  }

  async remove(id: string): Promise<void> {
    const payload = await this.readClassesFile();
    const next = payload.classes.filter((c) => c.id !== id);
    if (next.length === payload.classes.length) throw new Error("CLASS_NOT_FOUND");
    payload.classes = next;
    await this.writeClassesFile(payload);
  }

  async enrollStudent(classId: string, studentId: string): Promise<Class> {
    const payload = await this.readClassesFile();
    const index = payload.classes.findIndex((c) => c.id === classId);
    if (index < 0) throw new Error("CLASS_NOT_FOUND");

    const cls = payload.classes[index];
    if (cls.studentIds.includes(studentId)) throw new Error("STUDENT_ALREADY_ENROLLED");

    const updated: Class = { ...cls, studentIds: [...cls.studentIds, studentId] };
    payload.classes[index] = updated;
    await this.writeClassesFile(payload);
    return updated;
  }

  async unenrollStudent(classId: string, studentId: string): Promise<Class> {
    const payload = await this.readClassesFile();
    const index = payload.classes.findIndex((c) => c.id === classId);
    if (index < 0) throw new Error("CLASS_NOT_FOUND");

    const cls = payload.classes[index];
    const updated: Class = {
      ...cls,
      studentIds: cls.studentIds.filter((id) => id !== studentId)
    };
    payload.classes[index] = updated;
    await this.writeClassesFile(payload);
    return updated;
  }

  async removeStudentFromAllClasses(studentId: string): Promise<void> {
    const payload = await this.readClassesFile();
    payload.classes = payload.classes.map((cls) => ({
      ...cls,
      studentIds: cls.studentIds.filter((id) => id !== studentId)
    }));
    await this.writeClassesFile(payload);
  }

  private async readClassesFile(): Promise<ClassesFile> {
    try {
      const raw = await readFile(this.filePath, "utf-8");
      const parsed: unknown = JSON.parse(raw);
      if (!isObject(parsed) || !Array.isArray(parsed.classes)) return { classes: [] };

      return {
        classes: parsed.classes.filter(isClassLike).map((c) => ({
          id: String(c.id),
          topic: String(c.topic).trim(),
          year: Number(c.year),
          semester: Number(c.semester),
          studentIds: Array.isArray(c.studentIds)
            ? (c.studentIds as unknown[]).filter((s): s is string => typeof s === "string")
            : [],
          createdAt: String(c.createdAt ?? new Date().toISOString())
        }))
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        const fallback: ClassesFile = { classes: [] };
        await this.writeClassesFile(fallback);
        return fallback;
      }
      throw error;
    }
  }

  private async writeClassesFile(payload: ClassesFile): Promise<void> {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(payload, null, 2), "utf-8");
  }
}
