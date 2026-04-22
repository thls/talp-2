import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export type EmailLogStatus = "pending" | "sent" | "failed";

export type EmailLog = {
  id: string;
  studentId: string;
  date: string;
  status: EmailLogStatus;
  sentAt: string | null;
  changeIds: string[];
  retryCount: number;
};

type EmailLogsFile = {
  logs: EmailLog[];
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isLogLike(value: unknown): value is EmailLog {
  if (!isObject(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.studentId === "string" &&
    typeof value.date === "string" &&
    typeof value.status === "string"
  );
}

export class EmailLogStore {
  private readonly filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  async hasSentToday(studentId: string, date: string): Promise<boolean> {
    const payload = await this.readLogsFile();
    return payload.logs.some(
      (l) => l.studentId === studentId && l.date === date && l.status === "sent"
    );
  }

  async getPendingOrFailed(date: string): Promise<EmailLog[]> {
    const payload = await this.readLogsFile();
    return payload.logs.filter(
      (l) => l.date === date && (l.status === "pending" || l.status === "failed")
    );
  }

  async list(): Promise<EmailLog[]> {
    const payload = await this.readLogsFile();
    return payload.logs;
  }

  async createLog(input: {
    studentId: string;
    date: string;
    changeIds: string[];
  }): Promise<string> {
    const payload = await this.readLogsFile();
    const log: EmailLog = {
      id: randomUUID(),
      studentId: input.studentId,
      date: input.date,
      status: "pending",
      sentAt: null,
      changeIds: input.changeIds,
      retryCount: 0
    };
    payload.logs.push(log);
    await this.writeLogsFile(payload);
    return log.id;
  }

  async updateStatus(id: string, status: EmailLogStatus): Promise<void> {
    const payload = await this.readLogsFile();
    const index = payload.logs.findIndex((l) => l.id === id);
    if (index < 0) return;

    const current = payload.logs[index];
    payload.logs[index] = {
      ...current,
      status,
      sentAt: status === "sent" ? new Date().toISOString() : current.sentAt,
      retryCount: status === "failed" ? current.retryCount + 1 : current.retryCount
    };
    await this.writeLogsFile(payload);
  }

  private async readLogsFile(): Promise<EmailLogsFile> {
    try {
      const raw = await readFile(this.filePath, "utf-8");
      const parsed: unknown = JSON.parse(raw);
      if (!isObject(parsed) || !Array.isArray(parsed.logs)) return { logs: [] };
      return { logs: (parsed.logs as unknown[]).filter(isLogLike) };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        const fallback: EmailLogsFile = { logs: [] };
        await this.writeLogsFile(fallback);
        return fallback;
      }
      throw error;
    }
  }

  private async writeLogsFile(payload: EmailLogsFile): Promise<void> {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(payload, null, 2), "utf-8");
  }
}
