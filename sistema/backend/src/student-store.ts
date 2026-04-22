import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export type Student = {
  id: string;
  name: string;
  cpf: string;
  email: string;
  createdAt: string;
};

type StudentsFile = {
  students: Student[];
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export class StudentStore {
  private readonly filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  async list(): Promise<Student[]> {
    const payload = await this.readStudentsFile();
    return payload.students;
  }

  async add(input: { name: string; cpf: string; email: string }): Promise<Student> {
    const payload = await this.readStudentsFile();
    const normalizedCpf = normalizeCpf(input.cpf);
    const normalizedEmail = input.email.trim().toLowerCase();
    const normalizedName = input.name.trim();

    if (payload.students.some((student) => student.cpf === normalizedCpf)) {
      throw new Error("DUPLICATE_CPF");
    }

    const student: Student = {
      id: randomUUID(),
      name: normalizedName,
      cpf: normalizedCpf,
      email: normalizedEmail,
      createdAt: new Date().toISOString()
    };

    payload.students.push(student);
    await this.writeStudentsFile(payload);
    return student;
  }

  async update(
    id: string,
    input: { name: string; cpf: string; email: string }
  ): Promise<Student> {
    const payload = await this.readStudentsFile();
    const index = payload.students.findIndex((student) => student.id === id);
    if (index < 0) {
      throw new Error("STUDENT_NOT_FOUND");
    }

    const normalizedCpf = normalizeCpf(input.cpf);
    const normalizedEmail = input.email.trim().toLowerCase();
    const normalizedName = input.name.trim();

    const cpfInUseByAnotherStudent = payload.students.some(
      (student) => student.id !== id && student.cpf === normalizedCpf
    );
    if (cpfInUseByAnotherStudent) {
      throw new Error("DUPLICATE_CPF");
    }

    const current = payload.students[index];
    const updated: Student = {
      ...current,
      name: normalizedName,
      cpf: normalizedCpf,
      email: normalizedEmail
    };

    payload.students[index] = updated;
    await this.writeStudentsFile(payload);
    return updated;
  }

  async remove(id: string): Promise<void> {
    const payload = await this.readStudentsFile();
    const nextStudents = payload.students.filter((student) => student.id !== id);
    if (nextStudents.length === payload.students.length) {
      throw new Error("STUDENT_NOT_FOUND");
    }
    payload.students = nextStudents;
    await this.writeStudentsFile(payload);
  }

  private async readStudentsFile(): Promise<StudentsFile> {
    try {
      const raw = await readFile(this.filePath, "utf-8");
      const parsed: unknown = JSON.parse(raw);

      if (!isObject(parsed) || !Array.isArray(parsed.students)) {
        return { students: [] };
      }

      return {
        students: parsed.students.filter(isStudentLike).map((student) => ({
          id: String(student.id),
          name: String(student.name).trim(),
          cpf: normalizeCpf(String(student.cpf)),
          email: String(student.email).trim().toLowerCase(),
          createdAt: String(student.createdAt ?? new Date().toISOString())
        }))
      };
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "ENOENT") {
        const fallback = { students: [] };
        await this.writeStudentsFile(fallback);
        return fallback;
      }
      throw error;
    }
  }

  private async writeStudentsFile(payload: StudentsFile): Promise<void> {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(payload, null, 2), "utf-8");
  }
}

function isStudentLike(value: unknown): value is Student {
  if (!isObject(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.cpf === "string" &&
    typeof value.email === "string"
  );
}

export function normalizeCpf(cpf: string): string {
  return cpf.replace(/\D/g, "");
}

export function isValidCpf(cpf: string): boolean {
  return /^\d{11}$/.test(normalizeCpf(cpf));
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
