import { FormEvent, useEffect, useMemo, useState } from "react";
import { ClassesRoute } from "./routes/ClassesRoute";
import { ClassDetailRoute } from "./routes/ClassDetailRoute";
import { DashboardRoute } from "./routes/DashboardRoute";
import { StudentsRoute } from "./routes/StudentsRoute";
import type {
  Class,
  ClassDetail,
  ClassFormValues,
  Stats,
  Student,
  StudentFormValues,
  View
} from "./routes/types";

// ─── Constants ───────────────────────────────────────────────────────────────

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
const METAS = ["Requisitos", "Testes", "Implementação"] as const;
const GRADE_CONCEPTS = ["MANA", "MPA", "MA"] as const;

const initialStudentForm: StudentFormValues = { name: "", cpf: "", email: "" };
const initialClassForm: ClassFormValues = { topic: "", year: "", semester: "", capacity: "40" };

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
  const [searchTerm, setSearchTerm] = useState("");
  const [studentsFilterTerm, setStudentsFilterTerm] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<
    Array<{ id: string; studentName: string; status: string; totalChanges: number; date: string }>
  >([]);
  const [calendarView, setCalendarView] = useState(false);

  // ─── Data fetching ────────────────────────────────────────────────────────

  useEffect(() => {
    if (view.type === "classDetail") void fetchClassDetail(view.classId);
    if (view.type === "dashboard") void fetchStats();
  }, [view]);

  useEffect(() => {
    if (view.type === "students") void fetchStudents(searchTerm);
    if (view.type === "classes") void fetchClasses(searchTerm);
  }, [searchTerm, view.type]);

  async function fetchStudents(search = "") {
    const query = search ? `?search=${encodeURIComponent(search)}` : "";
    const res = await fetch(`${API_URL}/students${query}`);
    if (!res.ok) throw new Error("Falha ao carregar alunos.");
    const data = (await res.json()) as { students: Student[] };
    setStudents(data.students);
  }

  async function fetchClasses(search = "") {
    const query = search ? `?search=${encodeURIComponent(search)}` : "";
    const res = await fetch(`${API_URL}/classes${query}`);
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
      setStats({ studentCount: students.length, classCount: classes.length, gradeCount: 0, averageGrade: 0 });
    }
  }

  async function fetchNotifications() {
    const res = await fetch(`${API_URL}/notifications`);
    if (!res.ok) throw new Error("Falha ao carregar notificações.");
    const data = (await res.json()) as {
      notifications: Array<{ id: string; studentName: string; status: string; totalChanges: number; date: string }>;
    };
    setNotifications(data.notifications);
  }

  // ─── Navigation ──────────────────────────────────────────────────────────

  function clearMessages() {
    setError(null);
    setSuccess(null);
  }

  function navigateTo(v: View) {
    clearMessages();
    setView(v);
    setSearchTerm("");
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
    () =>
      !classForm.topic.trim() ||
      !classForm.year.trim() ||
      !classForm.semester.trim() ||
      !classForm.capacity.trim(),
    [classForm]
  );

  async function handleClassSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearMessages();

    if (hasMissingClassFields) { setError("Preencha tópico, ano, semestre e capacidade."); return; }

    const year = Number(classForm.year);
    const semester = Number(classForm.semester);
    const capacity = Number(classForm.capacity);
    if (!Number.isInteger(year) || year < 2000) { setError("Ano inválido."); return; }
    if (semester !== 1 && semester !== 2) { setError("Semestre deve ser 1 ou 2."); return; }
    if (!Number.isInteger(capacity) || capacity < 1) {
      setError("Capacidade deve ser um inteiro maior que zero.");
      return;
    }

    try {
      setLoading(true);
      const isEditing = Boolean(editingClassId);
      const url = isEditing ? `${API_URL}/classes/${editingClassId}` : `${API_URL}/classes`;
      const res = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: classForm.topic.trim(), year, semester, capacity })
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
    setClassForm({
      topic: cls.topic,
      year: String(cls.year),
      semester: String(cls.semester),
      capacity: String(cls.capacity)
    });
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
        const endpoint = `${API_URL}/classes/${classDetail.id}/grades/${studentId}/${encodeURIComponent(meta)}`;
        const res =
          concept === ""
            ? await fetch(endpoint, { method: "DELETE" })
            : await fetch(endpoint, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ concept })
              });
        if (!res.ok) {
          let data: { message?: string } = {};
          try {
            data = (await res.json()) as { message?: string };
          } catch {
            data = {};
          }
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
  const classesWithMeta = classes.map((cls, idx) => ({
    ...cls,
    room: `Sala ${100 + idx}`,
    occupancy:
      cls.studentIds.length > 0 ? Math.min(100, Math.round((cls.studentIds.length / cls.capacity) * 100)) : 0
  }));
  const dashboardCalendarItems = classes.length
    ? classes.map((cls) => `${cls.year}.${cls.semester} • ${cls.topic} • ${cls.studentIds.length}/${cls.capacity} matrículas`)
    : ["Sem turmas cadastradas no calendário."];
  const classesCalendarItems = classes.length
    ? classes.map((cls) => `${cls.topic} — ${cls.year}/${cls.semester} • Capacidade ${cls.capacity}`)
    : ["Sem eventos de turma para exibir."];
  const filteredStudents = useMemo(() => {
    const term = studentsFilterTerm.trim().toLowerCase();
    if (!term) return students;
    return students.filter(
      (student) =>
        student.name.toLowerCase().includes(term) ||
        student.email.toLowerCase().includes(term) ||
        student.cpf.includes(term.replace(/\D/g, ""))
    );
  }, [students, studentsFilterTerm]);

  function exportStudentsCsv() {
    const rows = [
      ["nome", "cpf", "email"],
      ...filteredStudents.map((student) => [student.name, student.cpf, student.email])
    ];
    const content = rows.map((row) => row.map((cell) => `"${cell.replaceAll("\"", "\"\"")}"`).join(",")).join("\n");
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "alunos.csv");
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

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
        </nav>
        <div className="mt-auto px-6">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="mb-2 text-[10px] font-label-caps uppercase tracking-widest text-secondary">Status do sistema</p>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-body-sm text-[#2D3282]">Todos os sistemas operacionais</span>
            </div>
          </div>
        </div>
      </aside>

      <div className="ml-64 min-h-screen">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-8 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => navigateTo({ type: "dashboard" })} className="rounded-full p-2 text-[#2D3282] hover:bg-slate-100">
              <span className="material-symbols-outlined">menu</span>
            </button>
            <h2 className="font-h3 text-lg text-[#2D3282]">
              Visão institucional
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-body-sm text-secondary md:flex">
              <span className="material-symbols-outlined text-sm">search</span>
              <input
                className="w-44 bg-transparent"
                placeholder="Buscar registros..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  const nextOpen = !notificationsOpen;
                  setNotificationsOpen(nextOpen);
                  if (nextOpen) void fetchNotifications();
                }}
                className="rounded-full p-2 hover:bg-slate-100"
              >
                <span className="material-symbols-outlined text-slate-500">notifications</span>
                <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-error" />
              </button>
              {notificationsOpen && (
                <div className="absolute right-0 top-12 z-50 w-96 rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
                  <p className="mb-2 text-sm font-bold text-primary">Notificações</p>
                  {notifications.length === 0 ? (
                    <p className="text-sm text-secondary">Nenhuma notificação disponível.</p>
                  ) : (
                    <ul className="space-y-2">
                      {notifications.map((notification) => (
                        <li key={notification.id} className="rounded border border-slate-100 p-2 text-sm">
                          <p className="font-medium text-on-surface">{notification.studentName}</p>
                          <p className="text-secondary">
                            {notification.totalChanges} alterações • {notification.status} • {notification.date}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
            <div className="hidden items-center gap-3 border-l border-slate-200 pl-4 md:flex">
              <div className="text-right">
                <p className="text-body-sm font-bold text-[#2D3282]">Usuário administrador</p>
                <p className="text-[10px] uppercase text-slate-500">Coordenação acadêmica</p>
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
            <DashboardRoute
              stats={stats}
              students={students}
              classes={classes}
              panelClass={panelClass}
              tableHeaderClass={tableHeaderClass}
              tableCellClass={tableCellClass}
              calendarItems={dashboardCalendarItems}
              onNewEnrollment={() => navigateTo({ type: "classes" })}
            />
          )}

          {view.type === "students" && (
            <StudentsRoute
              panelClass={panelClass}
              tableHeaderClass={tableHeaderClass}
              tableCellClass={tableCellClass}
              students={filteredStudents}
              studentForm={studentForm}
              loading={loading}
              editingStudentId={editingStudentId}
              pendingDeleteStudentId={pendingDeleteStudentId}
              onSubmit={handleStudentSubmit}
              onStudentFormChange={(field, value) => setStudentForm((c) => ({ ...c, [field]: value }))}
              onCancelEdit={cancelEditStudent}
              onStartEdit={startEditStudent}
              onRequestDelete={requestDeleteStudent}
              onConfirmDelete={(student) => {
                void confirmDeleteStudent(student);
              }}
              onCancelDelete={cancelDeleteStudent}
              filterTerm={studentsFilterTerm}
              onFilterTermChange={setStudentsFilterTerm}
              onExportCsv={exportStudentsCsv}
            />
          )}

          {view.type === "classes" && (
            <ClassesRoute
              classesWithMeta={classesWithMeta}
              classes={classes}
              classForm={classForm}
              editingClassId={editingClassId}
              pendingDeleteClassId={pendingDeleteClassId}
              loading={loading}
              onSubmit={handleClassSubmit}
              onClassFormChange={(field, value) => setClassForm((c) => ({ ...c, [field]: value }))}
              onCancelEdit={cancelEditClass}
              onNavigateToDetail={(classId) => navigateTo({ type: "classDetail", classId })}
              onStartEdit={startEditClass}
              onRequestDelete={requestDeleteClass}
              onConfirmDelete={(cls) => {
                void confirmDeleteClass(cls);
              }}
              onCancelDelete={cancelDeleteClass}
              calendarItems={classesCalendarItems}
              calendarView={calendarView}
              onToggleCalendarView={setCalendarView}
            />
          )}

          {view.type === "classDetail" && classDetail && (
            <ClassDetailRoute
              panelClass={panelClass}
              tableHeaderClass={tableHeaderClass}
              tableCellClass={tableCellClass}
              classDetail={classDetail}
              students={students}
              loading={loading}
              metas={METAS}
              gradeConcepts={GRADE_CONCEPTS}
              getGradeValue={getGradeValue}
              onBackToClasses={() => navigateTo({ type: "classes" })}
              onEnroll={(studentId) => {
                void handleEnroll(studentId);
              }}
              onUnenroll={(studentId) => {
                void handleUnenroll(studentId);
              }}
              onGradeEdit={handleGradeEdit}
              onSaveStudentGrades={(studentId) => {
                void handleSaveStudentGrades(studentId);
              }}
            />
          )}
        </main>
      </div>
    </div>
  );
}
