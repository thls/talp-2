export type Student = { id: string; name: string; cpf: string; email: string };

export type Class = {
  id: string;
  topic: string;
  year: number;
  semester: number;
  studentIds: string[];
};

export type Grade = { studentId: string; classId: string; meta: string; concept: string };

export type ClassDetail = Class & { students: Student[]; grades: Grade[] };

export type View =
  | { type: "dashboard" }
  | { type: "students" }
  | { type: "classes" }
  | { type: "classDetail"; classId: string };

export type Stats = {
  studentCount: number;
  classCount: number;
  gradeCount: number;
};

export type StudentFormValues = { name: string; cpf: string; email: string };
export type ClassFormValues = { topic: string; year: string; semester: string };
