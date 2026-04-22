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

  const activeNavClass =
    "flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-semibold transition";
  const baseCardClass = "rounded-xl border border-slate-200 bg-white shadow-sm";

  return (
    <div className="min-h-screen bg-background text-on-background">
      <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-slate-200 bg-white p-6">
        <h1 className="mb-8 font-['Lexend'] text-xl font-black tracking-tight text-primary-container">
          EduCore Admin
        </h1>
        <nav className="space-y-1">
          <button
            type="button"
            onClick={() => navigateTo({ type: "dashboard" })}
            aria-current={view.type === "dashboard" ? "page" : undefined}
            className={`${activeNavClass} ${
              view.type === "dashboard"
                ? "border-r-4 border-primary-container bg-slate-50 text-primary-container"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <span className="material-symbols-outlined">dashboard</span>
            Dashboard
          </button>
          <button
            type="button"
            onClick={() => navigateTo({ type: "students" })}
            aria-current={view.type === "students" ? "page" : undefined}
            className={`${activeNavClass} ${
              view.type === "students"
                ? "border-r-4 border-primary-container bg-slate-50 text-primary-container"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <span className="material-symbols-outlined">group</span>
            Alunos
          </button>
          <button
            type="button"
            onClick={() => navigateTo({ type: "classes" })}
            aria-current={view.type === "classes" || view.type === "classDetail" ? "page" : undefined}
            className={`${activeNavClass} ${
              view.type === "classes" || view.type === "classDetail"
                ? "border-r-4 border-primary-container bg-slate-50 text-primary-container"
                : "text-slate-600 hover:bg-slate-50"
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
            className={`${activeNavClass} text-slate-600 hover:bg-slate-50`}
          >
            <span className="material-symbols-outlined">grade</span>
            Avaliações
          </button>
        </nav>
      </aside>

      <div className="ml-64 min-h-screen">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-8 backdrop-blur">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary-container">menu</span>
            <h2 className="font-['Lexend'] text-lg font-semibold text-primary-container">
              Institutional Overview
            </h2>
          </div>
          <div className="hidden items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-500 md:flex">
            <span className="material-symbols-outlined text-base">search</span>
            Search records...
          </div>
        </header>

        <main className="space-y-6 p-8">
          {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">{error}</p>}
          {success && (
            <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700">
              {success}
            </p>
          )}

          {view.type === "dashboard" && (
            <section className="space-y-6">
              <div>
                <h1 className="font-['Lexend'] text-3xl font-semibold text-primary">Dashboard</h1>
                <p className="text-secondary">Resumo institucional do semestre atual.</p>
              </div>
              <div className="grid gap-6 md:grid-cols-3">
                <article className={`${baseCardClass} p-6`}>
                  <p className="text-xs font-semibold uppercase tracking-wider text-secondary">Total de alunos</p>
                  <p className="mt-2 text-3xl font-black text-on-surface">{stats?.studentCount ?? students.length}</p>
                </article>
                <article className={`${baseCardClass} p-6`}>
                  <p className="text-xs font-semibold uppercase tracking-wider text-secondary">Turmas ativas</p>
                  <p className="mt-2 text-3xl font-black text-on-surface">{stats?.classCount ?? classes.length}</p>
                </article>
                <article className={`${baseCardClass} p-6`}>
                  <p className="text-xs font-semibold uppercase tracking-wider text-secondary">Avaliações lançadas</p>
                  <p className="mt-2 text-3xl font-black text-on-surface">{stats?.gradeCount ?? 0}</p>
                </article>
              </div>
            </section>
          )}

          {view.type === "students" && (
            <section className="space-y-6">
              <h1 className="font-['Lexend'] text-3xl font-semibold text-primary">Gerenciamento de alunos</h1>
              <div className={`${baseCardClass} p-6`}>
                <form className="grid gap-4 md:grid-cols-4" onSubmit={handleStudentSubmit}>
                  <div className="md:col-span-2">
                    <label htmlFor="name" className="mb-1 block text-sm font-medium">Nome</label>
                    <input
                      id="name"
                      name="name"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                      value={studentForm.name}
                      onChange={(e) => setStudentForm((c) => ({ ...c, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label htmlFor="cpf" className="mb-1 block text-sm font-medium">CPF</label>
                    <input
                      id="cpf"
                      name="cpf"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                      value={studentForm.cpf}
                      onChange={(e) => setStudentForm((c) => ({ ...c, cpf: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="mb-1 block text-sm font-medium">Email</label>
                    <input
                      id="email"
                      name="email"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                      value={studentForm.email}
                      onChange={(e) => setStudentForm((c) => ({ ...c, email: e.target.value }))}
                    />
                  </div>
                  <div className="md:col-span-4 flex gap-2">
                    <button type="submit" disabled={loading} className="rounded-lg bg-primary px-4 py-2 font-semibold text-white">
                      {loading ? "Salvando..." : editingStudentId ? "Salvar edição" : "Cadastrar aluno"}
                    </button>
                    {editingStudentId && (
                      <button type="button" onClick={cancelEditStudent} className="rounded-lg border border-slate-300 px-4 py-2">
                        Cancelar edição
                      </button>
                    )}
                  </div>
                </form>
              </div>

              <div className={`${baseCardClass} overflow-hidden`}>
                <h2 className="border-b border-slate-200 px-6 py-4 text-lg font-semibold text-primary">Alunos cadastrados</h2>
                {students.length === 0 ? (
                  <p className="px-6 py-6 text-secondary">Nenhum aluno cadastrado.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-6 py-3">Nome</th>
                          <th className="px-6 py-3">CPF</th>
                          <th className="px-6 py-3">Email</th>
                          <th className="px-6 py-3">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map((student, idx) => (
                          <tr key={student.id} className={idx % 2 ? "bg-slate-50/50" : ""}>
                            <td className="px-6 py-3">{student.name}</td>
                            <td className="px-6 py-3">{student.cpf}</td>
                            <td className="px-6 py-3">{student.email}</td>
                            <td className="px-6 py-3">
                              <div className="flex flex-wrap gap-2">
                                <button type="button" onClick={() => startEditStudent(student)} className="rounded border px-3 py-1">
                                  Editar
                                </button>
                                <button type="button" onClick={() => requestDeleteStudent(student)} className="rounded border px-3 py-1">
                                  Remover
                                </button>
                                {pendingDeleteStudentId === student.id && (
                                  <>
                                    <button type="button" onClick={() => confirmDeleteStudent(student)} className="rounded border px-3 py-1">
                                      Confirmar remoção
                                    </button>
                                    <button type="button" onClick={cancelDeleteStudent} className="rounded border px-3 py-1">
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
            </section>
          )}

          {view.type === "classes" && (
            <section className="space-y-6">
              <h1 className="font-['Lexend'] text-3xl font-semibold text-primary">Gerenciamento de turmas</h1>
              <div className={`${baseCardClass} p-6`}>
                <form className="grid gap-4 md:grid-cols-4" onSubmit={handleClassSubmit}>
                  <div className="md:col-span-2">
                    <label htmlFor="topic" className="mb-1 block text-sm font-medium">Tópico</label>
                    <input
                      id="topic"
                      name="topic"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                      value={classForm.topic}
                      onChange={(e) => setClassForm((c) => ({ ...c, topic: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label htmlFor="year" className="mb-1 block text-sm font-medium">Ano</label>
                    <input
                      id="year"
                      name="year"
                      type="number"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                      value={classForm.year}
                      onChange={(e) => setClassForm((c) => ({ ...c, year: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label htmlFor="semester" className="mb-1 block text-sm font-medium">Semestre</label>
                    <select
                      id="semester"
                      name="semester"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                      value={classForm.semester}
                      onChange={(e) => setClassForm((c) => ({ ...c, semester: e.target.value }))}
                    >
                      <option value="">Selecione</option>
                      <option value="1">1</option>
                      <option value="2">2</option>
                    </select>
                  </div>
                  <div className="md:col-span-4 flex gap-2">
                    <button type="submit" disabled={loading} className="rounded-lg bg-primary px-4 py-2 font-semibold text-white">
                      {loading ? "Salvando..." : editingClassId ? "Salvar edição" : "Cadastrar turma"}
                    </button>
                    {editingClassId && (
                      <button type="button" onClick={cancelEditClass} className="rounded-lg border border-slate-300 px-4 py-2">
                        Cancelar edição
                      </button>
                    )}
                  </div>
                </form>
              </div>

              <div className={`${baseCardClass} overflow-hidden`}>
                <h2 className="border-b border-slate-200 px-6 py-4 text-lg font-semibold text-primary">Turmas cadastradas</h2>
                {classes.length === 0 ? (
                  <p className="px-6 py-6 text-secondary">Nenhuma turma cadastrada.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-6 py-3">Tópico</th>
                          <th className="px-6 py-3">Ano</th>
                          <th className="px-6 py-3">Semestre</th>
                          <th className="px-6 py-3">Alunos</th>
                          <th className="px-6 py-3">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {classes.map((cls, idx) => (
                          <tr key={cls.id} className={idx % 2 ? "bg-slate-50/50" : ""}>
                            <td className="px-6 py-3">{cls.topic}</td>
                            <td className="px-6 py-3">{cls.year}</td>
                            <td className="px-6 py-3">{cls.semester}</td>
                            <td className="px-6 py-3">{cls.studentIds.length}</td>
                            <td className="px-6 py-3">
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => navigateTo({ type: "classDetail", classId: cls.id })}
                                  className="rounded border px-3 py-1"
                                >
                                  Ver turma
                                </button>
                                <button type="button" onClick={() => startEditClass(cls)} className="rounded border px-3 py-1">
                                  Editar
                                </button>
                                <button type="button" onClick={() => requestDeleteClass(cls)} className="rounded border px-3 py-1">
                                  Remover
                                </button>
                                {pendingDeleteClassId === cls.id && (
                                  <>
                                    <button type="button" onClick={() => confirmDeleteClass(cls)} className="rounded border px-3 py-1">
                                      Confirmar remoção
                                    </button>
                                    <button type="button" onClick={cancelDeleteClass} className="rounded border px-3 py-1">
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
            </section>
          )}

          {view.type === "classDetail" && classDetail && (
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <button type="button" onClick={() => navigateTo({ type: "classes" })} className="rounded-lg border border-slate-300 px-4 py-2">
                  Voltar para turmas
                </button>
              </div>
              <h1 className="font-['Lexend'] text-3xl font-semibold text-primary">
                {classDetail.topic} — {classDetail.year}/{classDetail.semester}
              </h1>

              <div className={`${baseCardClass} p-6`}>
                <h2 className="mb-4 text-lg font-semibold text-primary">Alunos matriculados</h2>
                {classDetail.students.length === 0 ? (
                  <p>Nenhum aluno matriculado.</p>
                ) : (
                  <ul className="space-y-2">
                    {classDetail.students.map((s) => (
                      <li key={s.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-2">
                        <span>{s.name}</span>
                        <button type="button" onClick={() => handleUnenroll(s.id)} className="rounded border px-3 py-1">
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
                      className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2"
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

              <div className={`${baseCardClass} overflow-hidden`}>
                <h2 className="border-b border-slate-200 px-6 py-4 text-lg font-semibold text-primary">Avaliações</h2>
                {classDetail.students.length === 0 ? (
                  <p className="px-6 py-6">Matricule alunos para registrar avaliações.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-6 py-3">Aluno</th>
                          {METAS.map((meta) => (
                            <th key={meta} className="px-6 py-3">{meta}</th>
                          ))}
                          <th className="px-6 py-3">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {classDetail.students.map((student, idx) => (
                          <tr key={student.id} className={idx % 2 ? "bg-slate-50/50" : ""}>
                            <td className="px-6 py-3">{student.name}</td>
                            {METAS.map((meta) => (
                              <td key={meta} className="px-6 py-3">
                                <select
                                  aria-label={`${meta} de ${student.name}`}
                                  value={getGradeValue(student.id, meta)}
                                  className="w-full min-w-28 rounded-lg border border-slate-300 px-2 py-1"
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
                            <td className="px-6 py-3">
                              <button
                                type="button"
                                disabled={loading}
                                onClick={() => handleSaveStudentGrades(student.id)}
                                className="rounded border px-3 py-1"
                              >
                                Salvar
                              </button>
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
