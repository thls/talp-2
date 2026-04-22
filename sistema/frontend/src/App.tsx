import { FormEvent, useEffect, useMemo, useState } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

type Student = { id: string; name: string; cpf: string; email: string };

type Class = {
  id: string;
  topic: string;
  year: number;
  semester: number;
  studentIds: string[];
};

type ClassDetail = Class & { students: Student[]; grades: Grade[] };

type Grade = { studentId: string; classId: string; meta: string; concept: string };

type View =
  | { type: "dashboard" }
  | { type: "students" }
  | { type: "classes" }
  | { type: "classDetail"; classId: string };

type Stats = {
  studentCount: number;
  classCount: number;
  gradeCount: number;
};

type StudentFormValues = { name: string; cpf: string; email: string };
type ClassFormValues = { topic: string; year: string; semester: string };

// ─── Constants ───────────────────────────────────────────────────────────────

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
const METAS = ["Requisitos", "Testes", "Implementação"] as const;
const GRADE_CONCEPTS = ["MANA", "MPA", "MA"] as const;

const initialStudentForm: StudentFormValues = { name: "", cpf: "", email: "" };
const initialClassForm: ClassFormValues = { topic: "", year: "", semester: "" };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isValidCpf(cpf: string): boolean {
  return /^\d{11}$/.test(cpf.replace(/\D/g, ""));
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function toApiCpf(cpf: string): string {
  return cpf.replace(/\D/g, "");
}

// ─── App ─────────────────────────────────────────────────────────────────────

export function App() {
  const [view, setView] = useState<View>({ type: "students" });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);

  // Students state
  const [students, setStudents] = useState<Student[]>([]);
  const [studentForm, setStudentForm] = useState<StudentFormValues>(initialStudentForm);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [pendingDeleteStudentId, setPendingDeleteStudentId] = useState<string | null>(null);

  // Classes state
  const [classes, setClasses] = useState<Class[]>([]);
  const [classForm, setClassForm] = useState<ClassFormValues>(initialClassForm);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [pendingDeleteClassId, setPendingDeleteClassId] = useState<string | null>(null);

  // Class detail state
  const [classDetail, setClassDetail] = useState<ClassDetail | null>(null);
  const [gradeEdits, setGradeEdits] = useState<Map<string, string>>(new Map());

  // ─── Data fetching ────────────────────────────────────────────────────────

  useEffect(() => {
    void fetchStudents();
  }, []);

  useEffect(() => {
    if (view.type === "classes") void fetchClasses();
    if (view.type === "classDetail") void fetchClassDetail(view.classId);
    if (view.type === "dashboard") void fetchStats();
  }, [view]);

  async function fetchStudents() {
    const res = await fetch(`${API_URL}/students`);
    if (!res.ok) throw new Error("Falha ao carregar alunos.");
    const data = (await res.json()) as { students: Student[] };
    setStudents(data.students);
  }

  async function fetchClasses() {
    const res = await fetch(`${API_URL}/classes`);
    if (!res.ok) throw new Error("Falha ao carregar turmas.");
    const data = (await res.json()) as { classes: Class[] };
    setClasses(data.classes);
  }

  async function fetchClassDetail(classId: string) {
    const res = await fetch(`${API_URL}/classes/${classId}`);
    if (!res.ok) {
      setError("Turma não encontrada.");
      setView({ type: "classes" });
      return;
    }
    const data = (await res.json()) as ClassDetail;
    setClassDetail(data);
    setGradeEdits(new Map());
  }

  async function fetchStats() {
    try {
      const res = await fetch(`${API_URL}/stats`);
      if (!res.ok) throw new Error();
      const data = (await res.json()) as Stats;
      setStats(data);
    } catch {
      setStats({ studentCount: students.length, classCount: classes.length, gradeCount: 0 });
    }
  }

  // ─── Navigation ──────────────────────────────────────────────────────────

  function clearMessages() {
    setError(null);
    setSuccess(null);
  }

  function navigateTo(v: View) {
    clearMessages();
    setView(v);
  }

  // ─── Student CRUD ─────────────────────────────────────────────────────────

  const hasMissingStudentFields = useMemo(
    () => !studentForm.name.trim() || !studentForm.cpf.trim() || !studentForm.email.trim(),
    [studentForm]
  );

  async function handleStudentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearMessages();

    if (hasMissingStudentFields) { setError("Preencha nome, CPF e email."); return; }
    if (!isValidCpf(studentForm.cpf)) { setError("CPF inválido. Informe 11 dígitos."); return; }
    if (!isValidEmail(studentForm.email)) { setError("Email inválido."); return; }

    try {
      setLoading(true);
      const isEditing = Boolean(editingStudentId);
      const url = isEditing ? `${API_URL}/students/${editingStudentId}` : `${API_URL}/students`;
      const res = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: studentForm.name.trim(),
          cpf: toApiCpf(studentForm.cpf),
          email: studentForm.email.trim().toLowerCase()
        })
      });
      if (!res.ok) {
        const data = (await res.json()) as { message?: string };
        setError(data.message ?? "Erro ao salvar aluno.");
        return;
      }
      const saved = (await res.json()) as Student;
      if (isEditing) {
        setStudents((c) => c.map((s) => (s.id === saved.id ? saved : s)));
      } else {
        setStudents((c) => [...c, saved]);
      }
      setStudentForm(initialStudentForm);
      setEditingStudentId(null);
      setSuccess(isEditing ? "Aluno atualizado com sucesso." : "Aluno cadastrado com sucesso.");
    } catch {
      setError("Erro de comunicação com o servidor.");
    } finally {
      setLoading(false);
    }
  }

  function startEditStudent(student: Student) {
    clearMessages();
    setEditingStudentId(student.id);
    setStudentForm({ name: student.name, cpf: student.cpf, email: student.email });
  }

  function cancelEditStudent() {
    setEditingStudentId(null);
    setStudentForm(initialStudentForm);
    clearMessages();
  }

  function requestDeleteStudent(student: Student) {
    clearMessages();
    setPendingDeleteStudentId(student.id);
  }

  function cancelDeleteStudent() { setPendingDeleteStudentId(null); }

  async function confirmDeleteStudent(student: Student) {
    try {
      const res = await fetch(`${API_URL}/students/${student.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json()) as { message?: string };
        setError(data.message ?? "Erro ao remover aluno.");
        return;
      }
      setStudents((c) => c.filter((s) => s.id !== student.id));
      if (editingStudentId === student.id) cancelEditStudent();
      setPendingDeleteStudentId(null);
      setSuccess("Aluno removido com sucesso.");
    } catch {
      setError("Erro de comunicação com o servidor.");
    }
  }

  // ─── Class CRUD ───────────────────────────────────────────────────────────

  const hasMissingClassFields = useMemo(
    () => !classForm.topic.trim() || !classForm.year.trim() || !classForm.semester.trim(),
    [classForm]
  );

  async function handleClassSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearMessages();

    if (hasMissingClassFields) { setError("Preencha tópico, ano e semestre."); return; }

    const year = Number(classForm.year);
    const semester = Number(classForm.semester);
    if (!Number.isInteger(year) || year < 2000) { setError("Ano inválido."); return; }
    if (semester !== 1 && semester !== 2) { setError("Semestre deve ser 1 ou 2."); return; }

    try {
      setLoading(true);
      const isEditing = Boolean(editingClassId);
      const url = isEditing ? `${API_URL}/classes/${editingClassId}` : `${API_URL}/classes`;
      const res = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: classForm.topic.trim(), year, semester })
      });
      if (!res.ok) {
        const data = (await res.json()) as { message?: string };
        setError(data.message ?? "Erro ao salvar turma.");
        return;
      }
      const saved = (await res.json()) as Class;
      if (isEditing) {
        setClasses((c) => c.map((cls) => (cls.id === saved.id ? saved : cls)));
      } else {
        setClasses((c) => [...c, saved]);
      }
      setClassForm(initialClassForm);
      setEditingClassId(null);
      setSuccess(isEditing ? "Turma atualizada com sucesso." : "Turma cadastrada com sucesso.");
    } catch {
      setError("Erro de comunicação com o servidor.");
    } finally {
      setLoading(false);
    }
  }

  function startEditClass(cls: Class) {
    clearMessages();
    setEditingClassId(cls.id);
    setClassForm({ topic: cls.topic, year: String(cls.year), semester: String(cls.semester) });
  }

  function cancelEditClass() {
    setEditingClassId(null);
    setClassForm(initialClassForm);
    clearMessages();
  }

  function requestDeleteClass(cls: Class) {
    clearMessages();
    setPendingDeleteClassId(cls.id);
  }

  function cancelDeleteClass() { setPendingDeleteClassId(null); }

  async function confirmDeleteClass(cls: Class) {
    try {
      const res = await fetch(`${API_URL}/classes/${cls.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json()) as { message?: string };
        setError(data.message ?? "Erro ao remover turma.");
        return;
      }
      setClasses((c) => c.filter((c2) => c2.id !== cls.id));
      if (editingClassId === cls.id) cancelEditClass();
      setPendingDeleteClassId(null);
      setSuccess("Turma removida com sucesso.");
    } catch {
      setError("Erro de comunicação com o servidor.");
    }
  }

  // ─── Enrollment ───────────────────────────────────────────────────────────

  async function handleEnroll(studentId: string) {
    if (!classDetail) return;
    clearMessages();
    try {
      const res = await fetch(`${API_URL}/classes/${classDetail.id}/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId })
      });
      if (!res.ok) {
        const data = (await res.json()) as { message?: string };
        setError(data.message ?? "Erro ao matricular aluno.");
        return;
      }
      await fetchClassDetail(classDetail.id);
      setSuccess("Aluno matriculado com sucesso.");
    } catch {
      setError("Erro de comunicação com o servidor.");
    }
  }

  async function handleUnenroll(studentId: string) {
    if (!classDetail) return;
    clearMessages();
    try {
      const res = await fetch(
        `${API_URL}/classes/${classDetail.id}/students/${studentId}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = (await res.json()) as { message?: string };
        setError(data.message ?? "Erro ao desmatricular aluno.");
        return;
      }
      await fetchClassDetail(classDetail.id);
      setSuccess("Aluno desmatriculado.");
    } catch {
      setError("Erro de comunicação com o servidor.");
    }
  }

  // ─── Grades ───────────────────────────────────────────────────────────────

  function handleGradeEdit(studentId: string, meta: string, concept: string) {
    const key = `${studentId}:${meta}`;
    setGradeEdits((prev) => new Map(prev).set(key, concept));
  }

  async function handleSaveStudentGrades(studentId: string) {
    if (!classDetail) return;
    clearMessages();

    const editsForStudent = METAS.map((meta) => ({
      meta,
      concept: gradeEdits.get(`${studentId}:${meta}`)
    })).filter((e) => e.concept !== undefined);

    if (editsForStudent.length === 0) return;

    try {
      setLoading(true);
      for (const { meta, concept } of editsForStudent) {
        const res = await fetch(
          `${API_URL}/classes/${classDetail.id}/grades/${studentId}/${encodeURIComponent(meta)}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ concept })
          }
        );
        if (!res.ok) {
          const data = (await res.json()) as { message?: string };
          setError(data.message ?? "Erro ao salvar avaliação.");
          return;
        }
      }
      await fetchClassDetail(classDetail.id);
      setSuccess("Avaliações salvas com sucesso.");
    } catch {
      setError("Erro de comunicação com o servidor.");
    } finally {
      setLoading(false);
    }
  }

  function getGradeValue(studentId: string, meta: string): string {
    const key = `${studentId}:${meta}`;
    if (gradeEdits.has(key)) return gradeEdits.get(key)!;
    return classDetail?.grades.find((g) => g.studentId === studentId && g.meta === meta)?.concept ?? "";
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  const navButtonBase =
    "flex w-full items-center gap-3 px-4 py-3 text-left text-body-md font-medium transition-all active:opacity-80";
  const panelClass = "rounded-xl border border-slate-200 bg-white shadow-sm";
  const tableHeaderClass = "px-4 py-3 text-label-caps uppercase tracking-wider text-slate-500";
  const tableCellClass = "px-4 py-4 text-data-table text-slate-700";
  const dashboardActivities = [
    { title: "Notas publicadas", desc: "Resultados de Cálculo do semestre foram liberados.", time: "12:45" },
    { title: "Novas matrículas", desc: "12 novos alunos ingressaram no período atual.", time: "10:30" },
    { title: "Manutenção", desc: "Portal de alunos ficará indisponível por 15 minutos.", time: "09:15" }
  ];
  const classesWithMeta = classes.map((cls, idx) => ({
    ...cls,
    room: `Sala ${100 + idx}`,
    occupancy: cls.studentIds.length > 0 ? Math.min(100, Math.round((cls.studentIds.length / 45) * 100)) : 0
  }));

  return (
    <div className="min-h-screen bg-background text-on-background font-body-md">
      <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-slate-200 bg-white py-6">
        <h1 className="mb-8 px-6 font-h1 text-xl font-black tracking-tight text-[#2D3282]">
          EduCore Admin
        </h1>
        <nav className="space-y-1 px-2">
          <button
            type="button"
            onClick={() => navigateTo({ type: "dashboard" })}
            aria-current={view.type === "dashboard" ? "page" : undefined}
            className={`${navButtonBase} ${
              view.type === "dashboard"
                ? "border-r-4 border-[#2D3282] bg-slate-50 text-[#2D3282] font-bold"
                : "text-slate-500 hover:bg-slate-50 hover:text-[#2D3282]"
            }`}
          >
            <span className="material-symbols-outlined">dashboard</span>
            Dashboard
          </button>
          <button
            type="button"
            onClick={() => navigateTo({ type: "students" })}
            aria-current={view.type === "students" ? "page" : undefined}
            className={`${navButtonBase} ${
              view.type === "students"
                ? "border-r-4 border-[#2D3282] bg-slate-50 text-[#2D3282] font-bold"
                : "text-slate-500 hover:bg-slate-50 hover:text-[#2D3282]"
            }`}
          >
            <span className="material-symbols-outlined">group</span>
            Alunos
          </button>
          <button
            type="button"
            onClick={() => navigateTo({ type: "classes" })}
            aria-current={view.type === "classes" || view.type === "classDetail" ? "page" : undefined}
            className={`${navButtonBase} ${
              view.type === "classes" || view.type === "classDetail"
                ? "border-r-4 border-[#2D3282] bg-slate-50 text-[#2D3282] font-bold"
                : "text-slate-500 hover:bg-slate-50 hover:text-[#2D3282]"
            }`}
          >
            <span className="material-symbols-outlined">calendar_today</span>
            Turmas
          </button>
          <button
            type="button"
            onClick={() =>
              classDetail
                ? navigateTo({ type: "classDetail", classId: classDetail.id })
                : navigateTo({ type: "classes" })
            }
            className={`${navButtonBase} text-slate-500 hover:bg-slate-50 hover:text-[#2D3282]`}
          >
            <span className="material-symbols-outlined">grade</span>
            Avaliações
          </button>
          <button type="button" className={`${navButtonBase} text-slate-500 hover:bg-slate-50 hover:text-[#2D3282]`}>
            <span className="material-symbols-outlined">settings</span>
            Settings
          </button>
        </nav>
        <div className="mt-auto px-6">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="mb-2 text-[10px] font-label-caps uppercase tracking-widest text-secondary">System Status</p>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-body-sm text-[#2D3282]">All systems operational</span>
            </div>
          </div>
        </div>
      </aside>

      <div className="ml-64 min-h-screen">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-8 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button type="button" className="rounded-full p-2 text-[#2D3282] hover:bg-slate-100">
              <span className="material-symbols-outlined">menu</span>
            </button>
            <h2 className="font-h3 text-lg text-[#2D3282]">
              Institutional Overview
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-body-sm text-secondary md:flex">
              <span className="material-symbols-outlined text-sm">search</span>
              <input className="w-44 bg-transparent" placeholder="Search records..." />
            </div>
            <div className="relative">
              <span className="material-symbols-outlined text-slate-500">notifications</span>
              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-error" />
            </div>
            <div className="hidden items-center gap-3 border-l border-slate-200 pl-4 md:flex">
              <div className="text-right">
                <p className="text-body-sm font-bold text-[#2D3282]">Admin User</p>
                <p className="text-[10px] uppercase text-slate-500">Principal's Office</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-primary-container" />
            </div>
          </div>
        </header>

        <main className="space-y-8 p-8">
          {error && <p role="alert" className="rounded-lg border border-error bg-error-container px-4 py-3 text-on-error-container">{error}</p>}
          {success && (
            <p role="status" className="rounded-lg border border-tertiary-fixed-dim bg-tertiary-fixed/40 px-4 py-3 text-on-tertiary-fixed-variant">
              {success}
            </p>
          )}

          {view.type === "dashboard" && (
            <section className="space-y-8">
              <div className="mb-2 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h1 className="text-h1 text-primary">Welcome back, Sarah</h1>
                  <p className="text-body-lg text-secondary">Here's a summary of the academic performance for the current semester.</p>
                </div>
                <button className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-on-primary shadow-sm hover:bg-primary-container">
                  <span className="material-symbols-outlined text-lg">add</span>
                  New Enrollment
                </button>
              </div>
              <div className="mb-2 grid gap-6 md:grid-cols-4">
                <article className={`${panelClass} h-32 border-slate-200 p-6 hover:border-primary/30`}>
                  <div className="mb-4 flex items-center justify-between">
                    <span className="material-symbols-outlined rounded-lg bg-primary-fixed/50 p-2 text-primary">groups</span>
                    <span className="text-[12px] font-bold text-tertiary-fixed-dim">+4.2%</span>
                  </div>
                  <p className="text-label-caps text-secondary">Total Students</p>
                  <p className="text-h2 font-black text-on-surface">{stats?.studentCount ?? students.length}</p>
                </article>
                <article className={`${panelClass} h-32 border-slate-200 p-6 hover:border-primary/30`}>
                  <div className="mb-4 flex items-center justify-between">
                    <span className="material-symbols-outlined rounded-lg bg-primary-fixed/50 p-2 text-primary">school</span>
                    <span className="text-[12px] font-bold text-secondary">Stable</span>
                  </div>
                  <p className="text-label-caps text-secondary">Active Classes</p>
                  <p className="text-h2 font-black text-on-surface">{stats?.classCount ?? classes.length}</p>
                </article>
                <article className={`${panelClass} h-32 border-slate-200 p-6 hover:border-primary/30`}>
                  <div className="mb-4 flex items-center justify-between">
                    <span className="material-symbols-outlined rounded-lg bg-primary-fixed/50 p-2 text-primary">assessment</span>
                    <span className="text-[12px] font-bold text-tertiary-fixed-dim">+1.8%</span>
                  </div>
                  <p className="text-label-caps text-secondary">Saved Grades</p>
                  <p className="text-h2 font-black text-on-surface">{stats?.gradeCount ?? 0}</p>
                </article>
                <article className={`${panelClass} h-32 border-slate-200 p-6 hover:border-primary/30`}>
                  <div className="mb-4 flex items-center justify-between">
                    <span className="material-symbols-outlined rounded-lg bg-primary-fixed/50 p-2 text-primary">pending_actions</span>
                    <span className="text-[12px] font-bold text-error">-2.1%</span>
                  </div>
                  <p className="text-label-caps text-secondary">Attendance Rate</p>
                  <p className="text-h2 font-black text-on-surface">92.4%</p>
                </article>
              </div>
              <div className="grid gap-8 xl:grid-cols-3">
                <div className="space-y-8 xl:col-span-2">
                  <div className={panelClass}>
                    <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
                      <h3 className="flex items-center gap-2 text-h3 text-primary"><span className="material-symbols-outlined">event</span>Today's Schedule</h3>
                      <span className="text-body-sm text-secondary">Wednesday</span>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {["09:00 • Advanced Macroeconomics", "11:30 • Digital Ethics & Society", "14:00 • Board Meeting"].map((item) => (
                        <div key={item} className="px-6 py-4 text-body-md text-on-surface hover:bg-slate-50">{item}</div>
                      ))}
                    </div>
                  </div>
                  <div className={panelClass}>
                    <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                      <h3 className="text-h3 text-primary">Recent Registrations</h3>
                      <button className="text-body-sm font-bold text-primary">View All</button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50/60">
                          <tr>
                            <th className={tableHeaderClass}>Student Name</th>
                            <th className={tableHeaderClass}>Course ID</th>
                            <th className={tableHeaderClass}>Status</th>
                            <th className={tableHeaderClass}>Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-t border-slate-100">
                            <td className={tableCellClass}>Marcus Aurelius</td>
                            <td className={tableCellClass}>PHL-101</td>
                            <td className={tableCellClass}><span className="rounded-full bg-tertiary-fixed/40 px-2 py-1 text-[11px] font-bold text-on-tertiary-fixed-variant">Confirmed</span></td>
                            <td className={tableCellClass}>2 mins ago</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                <div className="space-y-8">
                  <div className={panelClass}>
                    <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
                      <h3 className="text-h3 text-primary">Recent Activity</h3>
                    </div>
                    <div className="space-y-4 p-6">
                      {dashboardActivities.map((item) => (
                        <div key={item.title}>
                          <p className="text-body-sm font-bold text-on-surface">{item.title}</p>
                          <p className="text-body-sm text-secondary">{item.desc}</p>
                          <p className="text-[10px] font-label-caps text-secondary">{item.time}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl bg-primary-container p-6 text-on-primary shadow-sm">
                    <h3 className="mb-3 text-h3">Department Load</h3>
                    <p className="text-body-sm text-on-primary-container">Humanities 85%, STEM 94%, Business 72%</p>
                  </div>
                </div>
              </div>
            </section>
          )}

          {view.type === "students" && (
            <section className="space-y-8">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h1 className="text-h1 text-primary">Gerenciamento de alunos</h1>
                  <p className="text-body-md text-secondary">Student Directory</p>
                </div>
                <div className="flex gap-2">
                  <button type="button" className="flex items-center gap-2 rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-2 text-body-sm">
                    <span className="material-symbols-outlined text-sm">filter_list</span>
                    Filter
                  </button>
                  <button type="button" className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-body-sm text-on-primary">
                    <span className="material-symbols-outlined text-sm">file_download</span>
                    Export CSV
                  </button>
                </div>
              </div>
              <div className="grid gap-6 lg:grid-cols-12">
                <div className="space-y-6 lg:col-span-8">
                  <div className={`${panelClass} p-6`}>
                    <form className="grid gap-4 md:grid-cols-4" onSubmit={handleStudentSubmit}>
                  <div className="md:col-span-2">
                    <label htmlFor="name" className="mb-1 block text-sm font-medium">Nome</label>
                    <input
                      id="name"
                      name="name"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2"
                      value={studentForm.name}
                      onChange={(e) => setStudentForm((c) => ({ ...c, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label htmlFor="cpf" className="mb-1 block text-sm font-medium">CPF</label>
                    <input
                      id="cpf"
                      name="cpf"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2"
                      value={studentForm.cpf}
                      onChange={(e) => setStudentForm((c) => ({ ...c, cpf: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="mb-1 block text-sm font-medium">Email</label>
                    <input
                      id="email"
                      name="email"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2"
                      value={studentForm.email}
                      onChange={(e) => setStudentForm((c) => ({ ...c, email: e.target.value }))}
                    />
                  </div>
                  <div className="md:col-span-4 flex gap-2">
                    <button type="submit" disabled={loading} className="rounded-lg bg-primary px-4 py-2 font-semibold text-on-primary hover:bg-primary-container">
                      {loading ? "Salvando..." : editingStudentId ? "Salvar edição" : "Cadastrar aluno"}
                    </button>
                    {editingStudentId && (
                      <button type="button" onClick={cancelEditStudent} className="rounded-lg border border-slate-200 px-4 py-2">
                        Cancelar edição
                      </button>
                    )}
                  </div>
                </form>
                  </div>

                  <div className={`${panelClass} overflow-hidden`}>
                    <h2 className="border-b border-slate-200 px-6 py-4 text-h3 text-primary">Alunos cadastrados</h2>
                {students.length === 0 ? (
                  <p className="px-6 py-6 text-secondary">Nenhum aluno cadastrado.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left font-data-table">
                      <thead className="bg-slate-50/60">
                        <tr>
                          <th className={tableHeaderClass}>Nome</th>
                          <th className={tableHeaderClass}>CPF</th>
                          <th className={tableHeaderClass}>Email</th>
                          <th className={tableHeaderClass}>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map((student, idx) => (
                          <tr key={student.id} className={`border-t border-slate-100 hover:bg-slate-50 ${idx % 2 ? "bg-slate-50/50" : ""}`}>
                            <td className={tableCellClass}>{student.name}</td>
                            <td className={tableCellClass}>{student.cpf}</td>
                            <td className={tableCellClass}>{student.email}</td>
                            <td className={tableCellClass}>
                              <div className="flex flex-wrap gap-2">
                                <button type="button" onClick={() => startEditStudent(student)} className="rounded border border-slate-200 px-3 py-1 hover:border-primary">
                                  Editar
                                </button>
                                <button type="button" onClick={() => requestDeleteStudent(student)} className="rounded border border-slate-200 px-3 py-1 hover:border-primary">
                                  Remover
                                </button>
                                {pendingDeleteStudentId === student.id && (
                                  <>
                                    <button type="button" onClick={() => confirmDeleteStudent(student)} className="rounded border border-slate-200 px-3 py-1">
                                      Confirmar remoção
                                    </button>
                                    <button type="button" onClick={cancelDeleteStudent} className="rounded border border-slate-200 px-3 py-1">
                                      Cancelar remoção
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                  </div>
                </div>
                <aside className="space-y-6 lg:col-span-4">
                  <div className={`${panelClass} p-6`}>
                    <h3 className="mb-4 text-h3 text-primary">Enrollment Distribution</h3>
                    <div className="space-y-3 text-body-sm">
                      <div><p className="mb-1 flex justify-between"><span>Grade 10</span><span className="font-bold text-primary">42%</span></p><div className="h-2 rounded-full bg-surface-container"><div className="h-full w-[42%] rounded-full bg-primary" /></div></div>
                      <div><p className="mb-1 flex justify-between"><span>Grade 11</span><span className="font-bold text-primary">35%</span></p><div className="h-2 rounded-full bg-surface-container"><div className="h-full w-[35%] rounded-full bg-primary-container" /></div></div>
                      <div><p className="mb-1 flex justify-between"><span>Grade 12</span><span className="font-bold text-primary">23%</span></p><div className="h-2 rounded-full bg-surface-container"><div className="h-full w-[23%] rounded-full bg-secondary" /></div></div>
                    </div>
                  </div>
                  <div className="rounded-xl bg-primary p-6 text-on-primary shadow-lg">
                    <h3 className="mb-2 text-h3">Academic Insights</h3>
                    <p className="mb-5 text-body-sm text-on-primary-container">12 estudantes precisam de reforço em matemática.</p>
                    <button type="button" className="w-full rounded-lg bg-surface-container-lowest py-3 font-bold text-primary">View Intervention Report</button>
                  </div>
                </aside>
              </div>
            </section>
          )}

          {view.type === "classes" && (
            <section className="space-y-lg">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <h1 className="text-h1 text-primary">Gerenciamento de turmas</h1>
                  <p className="font-body-md text-secondary">Schedule and monitor institutional curriculum delivery.</p>
                </div>
                <div className="flex rounded-lg border border-outline-variant bg-surface-container p-1">
                  <button type="button" className="flex items-center space-x-2 rounded-md bg-white px-4 py-2 font-bold text-primary shadow-sm">
                    <span className="material-symbols-outlined text-[20px]">list</span>
                    <span className="text-body-sm">List View</span>
                  </button>
                  <button type="button" className="flex items-center space-x-2 rounded-md px-4 py-2 font-medium text-secondary">
                    <span className="material-symbols-outlined text-[20px]">calendar_view_day</span>
                    <span className="text-body-sm">Calendar View</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-gutter md:grid-cols-4">
                <div className="flex items-center space-x-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-md">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary-container text-primary">
                    <span className="material-symbols-outlined">school</span>
                  </div>
                  <div>
                    <p className="text-label-caps uppercase text-secondary">Total Classes</p>
                    <p className="text-h2 text-primary">{classes.length}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-md">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-tertiary-fixed-dim/20 text-on-tertiary-fixed-variant">
                    <span className="material-symbols-outlined">person_add</span>
                  </div>
                  <div>
                    <p className="text-label-caps uppercase text-secondary">Enrollments</p>
                    <p className="text-h2 text-primary">{classes.reduce((acc, cls) => acc + cls.studentIds.length, 0)}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-md">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-fixed/30 text-primary-container">
                    <span className="material-symbols-outlined">meeting_room</span>
                  </div>
                  <div>
                    <p className="text-label-caps uppercase text-secondary">Rooms Active</p>
                    <p className="text-h2 text-primary">{Math.max(0, classes.length - 1)}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-md">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-error-container/20 text-error">
                    <span className="material-symbols-outlined">warning</span>
                  </div>
                  <div>
                    <p className="text-label-caps uppercase text-secondary">At Capacity</p>
                    <p className="text-h2 text-primary">{classes.filter((c) => c.studentIds.length >= 40).length}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-12 gap-gutter">
                <div className="col-span-12 space-y-md lg:col-span-3">
                  <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-md">
                    <h3 className="mb-md text-h3 text-primary">Cadastro de turma</h3>
                    <form className="space-y-4" onSubmit={handleClassSubmit}>
                      <div>
                        <label htmlFor="topic" className="mb-2 block text-label-caps text-secondary">TÓPICO</label>
                        <input
                          id="topic"
                          name="topic"
                          className="w-full rounded-lg border border-outline-variant bg-background px-3 py-2 text-body-sm"
                          value={classForm.topic}
                          onChange={(e) => setClassForm((c) => ({ ...c, topic: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label htmlFor="year" className="mb-2 block text-label-caps text-secondary">ANO</label>
                        <input
                          id="year"
                          name="year"
                          type="number"
                          className="w-full rounded-lg border border-outline-variant bg-background px-3 py-2 text-body-sm"
                          value={classForm.year}
                          onChange={(e) => setClassForm((c) => ({ ...c, year: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label htmlFor="semester" className="mb-2 block text-label-caps text-secondary">SEMESTRE</label>
                        <select
                          id="semester"
                          name="semester"
                          className="w-full rounded-lg border border-outline-variant bg-background px-3 py-2 text-body-sm"
                          value={classForm.semester}
                          onChange={(e) => setClassForm((c) => ({ ...c, semester: e.target.value }))}
                        >
                          <option value="">Selecione</option>
                          <option value="1">1</option>
                          <option value="2">2</option>
                        </select>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button type="submit" disabled={loading} className="rounded-lg bg-primary px-4 py-2 font-bold text-white">
                          {loading ? "Salvando..." : editingClassId ? "Salvar edição" : "Cadastrar turma"}
                        </button>
                        {editingClassId && (
                          <button type="button" onClick={cancelEditClass} className="rounded-lg border border-outline-variant px-4 py-2">
                            Cancelar edição
                          </button>
                        )}
                      </div>
                    </form>
                  </div>
                </div>

                <div className="col-span-12 lg:col-span-9">
                  <div className="overflow-hidden rounded-xl border border-outline-variant bg-white shadow-sm">
                    <table className="w-full border-collapse text-left">
                      <thead>
                        <tr className="border-b border-outline-variant bg-slate-50">
                          <th className="px-md py-4 text-left text-xs font-label-caps uppercase tracking-wider text-secondary">Class Name</th>
                          <th className="px-md py-4 text-left text-xs font-label-caps uppercase tracking-wider text-secondary">Room / Time</th>
                          <th className="px-md py-4 text-left text-xs font-label-caps uppercase tracking-wider text-secondary">Enrollment</th>
                          <th className="px-md py-4 text-right text-xs font-label-caps uppercase tracking-wider text-secondary">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {classesWithMeta.length === 0 ? (
                          <tr>
                            <td className="px-6 py-6 text-secondary" colSpan={4}>Nenhuma turma cadastrada.</td>
                          </tr>
                        ) : (
                          classesWithMeta.map((cls) => (
                            <tr key={cls.id} className="transition-colors hover:bg-slate-50">
                              <td className="px-md py-4">
                                <p className="text-body-md font-bold text-primary">{cls.topic}</p>
                                <p className="text-xs text-secondary">{cls.year} • Semestre {cls.semester}</p>
                              </td>
                              <td className="px-md py-4 text-body-sm text-secondary">
                                <p>{cls.room}</p>
                                <p>Seg, Qua 10:00 AM</p>
                              </td>
                              <td className="px-md py-4">
                                <div className="flex w-32 flex-col">
                                  <div className="mb-1 flex justify-between text-xs">
                                    <span className="font-medium">{cls.studentIds.length}/45</span>
                                    <span className="text-secondary">{cls.occupancy}%</span>
                                  </div>
                                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                                    <div className="h-full rounded-full bg-on-tertiary-container" style={{ width: `${cls.occupancy}%` }} />
                                  </div>
                                </div>
                              </td>
                              <td className="px-md py-4">
                                <div className="flex justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => navigateTo({ type: "classDetail", classId: cls.id })}
                                    className="rounded border border-outline-variant px-3 py-1 text-body-sm hover:border-primary"
                                  >
                                    Ver turma
                                  </button>
                                  <button type="button" onClick={() => startEditClass(cls)} className="rounded border border-outline-variant px-3 py-1 text-body-sm hover:border-primary">
                                    Editar
                                  </button>
                                  <button type="button" onClick={() => requestDeleteClass(cls)} className="rounded border border-outline-variant px-3 py-1 text-body-sm hover:border-primary">
                                    Remover
                                  </button>
                                  {pendingDeleteClassId === cls.id && (
                                    <>
                                      <button type="button" onClick={() => confirmDeleteClass(cls)} className="rounded border border-outline-variant px-3 py-1 text-body-sm">
                                        Confirmar remoção
                                      </button>
                                      <button type="button" onClick={cancelDeleteClass} className="rounded border border-outline-variant px-3 py-1 text-body-sm">
                                        Cancelar remoção
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </section>
          )}

          {view.type === "classDetail" && classDetail && (
            <section className="space-y-8">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h1 className="text-h1 text-primary">Detalhe da turma</h1>
                  <p className="text-body-md text-secondary">Grading & Evaluations</p>
                </div>
                <div className="flex items-center gap-3">
                  <select className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-body-md">
                    <option>Final Examination</option>
                    <option>Mid-term Project</option>
                  </select>
                  <button type="button" className="rounded-lg bg-primary px-6 py-2.5 text-on-primary">Aplicar alterações</button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <button type="button" onClick={() => navigateTo({ type: "classes" })} className="rounded-lg border border-slate-200 px-4 py-2 hover:border-primary">
                  Voltar para turmas
                </button>
              </div>
              <h1 className="text-h2 text-primary">
                {classDetail.topic} — {classDetail.year}/{classDetail.semester}
              </h1>
              <div className="grid gap-6 lg:grid-cols-12">
                <div className="lg:col-span-8">
                  <div className={`${panelClass} p-6`}>
                    <h3 className="mb-4 text-h3 text-primary">Grade Distribution</h3>
                    <div className="flex h-40 items-end justify-between gap-3">
                      {[15, 25, 65, 85, 45].map((value, idx) => (
                        <div key={`${value}-${idx}`} className="flex flex-1 flex-col items-center gap-2">
                          <div className="w-full rounded-t-lg bg-slate-200" style={{ height: `${value}%` }} />
                          <span className="text-label-caps text-secondary">{["F", "D", "C", "B", "A"][idx]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="space-y-6 lg:col-span-4">
                  <div className="rounded-xl bg-primary-container p-6 text-on-primary">
                    <p className="text-label-caps text-on-primary-container">Class Average</p>
                    <p className="text-4xl font-bold">84.2%</p>
                  </div>
                  <div className={`${panelClass} p-6`}>
                    <p className="text-label-caps text-secondary">Pending Entry</p>
                    <p className="text-4xl font-bold text-primary">06</p>
                  </div>
                </div>
              </div>

              <div className={`${panelClass} p-6`}>
                <h2 className="mb-4 text-h3 text-primary">Alunos matriculados</h2>
                {classDetail.students.length === 0 ? (
                  <p>Nenhum aluno matriculado.</p>
                ) : (
                  <ul className="space-y-2">
                    {classDetail.students.map((s) => (
                      <li key={s.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-2">
                        <span>{s.name}</span>
                        <button type="button" onClick={() => handleUnenroll(s.id)} className="rounded border border-slate-200 px-3 py-1">
                          Desmatricular
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {students.filter((s) => !classDetail.studentIds.includes(s.id)).length > 0 && (
                  <div className="mt-4">
                    <label htmlFor="enroll-select" className="mb-1 block text-sm font-medium">Matricular aluno</label>
                    <select
                      id="enroll-select"
                      defaultValue=""
                      className="w-full max-w-xs rounded-lg border border-slate-200 px-3 py-2"
                      onChange={(e) => {
                        if (e.target.value) void handleEnroll(e.target.value);
                        e.target.value = "";
                      }}
                    >
                      <option value="">Selecione um aluno</option>
                      {students
                        .filter((s) => !classDetail.studentIds.includes(s.id))
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                    </select>
                  </div>
                )}
              </div>

              <div className={`${panelClass} overflow-hidden`}>
                <h2 className="border-b border-slate-200 px-6 py-4 text-h3 text-primary">Avaliações</h2>
                {classDetail.students.length === 0 ? (
                  <p className="px-6 py-6">Matricule alunos para registrar avaliações.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left font-data-table">
                      <thead className="bg-slate-50/60">
                        <tr>
                          <th className={tableHeaderClass}>Aluno</th>
                          {METAS.map((meta) => (
                            <th key={meta} className={tableHeaderClass}>{meta}</th>
                          ))}
                          <th className={tableHeaderClass}>Ações</th>
                          <th className={tableHeaderClass}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {classDetail.students.map((student, idx) => (
                          <tr key={student.id} className={`border-t border-slate-100 hover:bg-slate-50 ${idx % 2 ? "bg-slate-50/50" : ""}`}>
                            <td className={tableCellClass}>{student.name}</td>
                            {METAS.map((meta) => (
                              <td key={meta} className={tableCellClass}>
                                <select
                                  aria-label={`${meta} de ${student.name}`}
                                  value={getGradeValue(student.id, meta)}
                                  className="w-full min-w-28 rounded-lg border border-slate-200 bg-white px-2 py-1"
                                  onChange={(e) => handleGradeEdit(student.id, meta, e.target.value)}
                                >
                                  <option value="">—</option>
                                  {GRADE_CONCEPTS.map((c) => (
                                    <option key={c} value={c}>
                                      {c}
                                    </option>
                                  ))}
                                </select>
                              </td>
                            ))}
                            <td className={tableCellClass}>
                              <button
                                type="button"
                                disabled={loading}
                                onClick={() => handleSaveStudentGrades(student.id)}
                                className="rounded border border-slate-200 px-3 py-1 hover:border-primary"
                              >
                                Salvar
                              </button>
                            </td>
                            <td className={tableCellClass}>
                              <span className="rounded-full bg-tertiary-fixed/40 px-2 py-1 text-[11px] font-bold uppercase text-on-tertiary-fixed-variant">
                                Saved
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
