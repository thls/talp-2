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
  | { type: "students" }
  | { type: "classes" }
  | { type: "classDetail"; classId: string };

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

  return (
    <main>
      <nav>
        <button
          type="button"
          onClick={() => navigateTo({ type: "students" })}
          aria-current={view.type === "students" ? "page" : undefined}
        >
          Alunos
        </button>
        <button
          type="button"
          onClick={() => navigateTo({ type: "classes" })}
          aria-current={view.type === "classes" || view.type === "classDetail" ? "page" : undefined}
        >
          Turmas
        </button>
      </nav>

      {error && <p role="alert">{error}</p>}
      {success && <p role="status">{success}</p>}

      {view.type === "students" && (
        <section>
          <h1>Gerenciamento de alunos</h1>
          <form onSubmit={handleStudentSubmit}>
            <div>
              <label htmlFor="name">Nome</label>
              <input
                id="name"
                name="name"
                value={studentForm.name}
                onChange={(e) => setStudentForm((c) => ({ ...c, name: e.target.value }))}
              />
            </div>
            <div>
              <label htmlFor="cpf">CPF</label>
              <input
                id="cpf"
                name="cpf"
                value={studentForm.cpf}
                onChange={(e) => setStudentForm((c) => ({ ...c, cpf: e.target.value }))}
              />
            </div>
            <div>
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                value={studentForm.email}
                onChange={(e) => setStudentForm((c) => ({ ...c, email: e.target.value }))}
              />
            </div>
            <button type="submit" disabled={loading}>
              {loading ? "Salvando..." : editingStudentId ? "Salvar edição" : "Cadastrar aluno"}
            </button>
            {editingStudentId && (
              <button type="button" onClick={cancelEditStudent}>
                Cancelar edição
              </button>
            )}
          </form>

          <h2>Alunos cadastrados</h2>
          {students.length === 0 ? (
            <p>Nenhum aluno cadastrado.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>CPF</th>
                  <th>Email</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id}>
                    <td>{student.name}</td>
                    <td>{student.cpf}</td>
                    <td>{student.email}</td>
                    <td>
                      <button type="button" onClick={() => startEditStudent(student)}>
                        Editar
                      </button>
                      <button type="button" onClick={() => requestDeleteStudent(student)}>
                        Remover
                      </button>
                      {pendingDeleteStudentId === student.id && (
                        <>
                          <button type="button" onClick={() => confirmDeleteStudent(student)}>
                            Confirmar remoção
                          </button>
                          <button type="button" onClick={cancelDeleteStudent}>
                            Cancelar remoção
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      {view.type === "classes" && (
        <section>
          <h1>Gerenciamento de turmas</h1>
          <form onSubmit={handleClassSubmit}>
            <div>
              <label htmlFor="topic">Tópico</label>
              <input
                id="topic"
                name="topic"
                value={classForm.topic}
                onChange={(e) => setClassForm((c) => ({ ...c, topic: e.target.value }))}
              />
            </div>
            <div>
              <label htmlFor="year">Ano</label>
              <input
                id="year"
                name="year"
                type="number"
                value={classForm.year}
                onChange={(e) => setClassForm((c) => ({ ...c, year: e.target.value }))}
              />
            </div>
            <div>
              <label htmlFor="semester">Semestre</label>
              <select
                id="semester"
                name="semester"
                value={classForm.semester}
                onChange={(e) => setClassForm((c) => ({ ...c, semester: e.target.value }))}
              >
                <option value="">Selecione</option>
                <option value="1">1</option>
                <option value="2">2</option>
              </select>
            </div>
            <button type="submit" disabled={loading}>
              {loading ? "Salvando..." : editingClassId ? "Salvar edição" : "Cadastrar turma"}
            </button>
            {editingClassId && (
              <button type="button" onClick={cancelEditClass}>
                Cancelar edição
              </button>
            )}
          </form>

          <h2>Turmas cadastradas</h2>
          {classes.length === 0 ? (
            <p>Nenhuma turma cadastrada.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Tópico</th>
                  <th>Ano</th>
                  <th>Semestre</th>
                  <th>Alunos</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {classes.map((cls) => (
                  <tr key={cls.id}>
                    <td>{cls.topic}</td>
                    <td>{cls.year}</td>
                    <td>{cls.semester}</td>
                    <td>{cls.studentIds.length}</td>
                    <td>
                      <button
                        type="button"
                        onClick={() => navigateTo({ type: "classDetail", classId: cls.id })}
                      >
                        Ver turma
                      </button>
                      <button type="button" onClick={() => startEditClass(cls)}>
                        Editar
                      </button>
                      <button type="button" onClick={() => requestDeleteClass(cls)}>
                        Remover
                      </button>
                      {pendingDeleteClassId === cls.id && (
                        <>
                          <button type="button" onClick={() => confirmDeleteClass(cls)}>
                            Confirmar remoção
                          </button>
                          <button type="button" onClick={cancelDeleteClass}>
                            Cancelar remoção
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      {view.type === "classDetail" && classDetail && (
        <section>
          <button type="button" onClick={() => navigateTo({ type: "classes" })}>
            Voltar para turmas
          </button>
          <h1>
            {classDetail.topic} — {classDetail.year}/{classDetail.semester}
          </h1>

          <h2>Alunos matriculados</h2>
          {classDetail.students.length === 0 ? (
            <p>Nenhum aluno matriculado.</p>
          ) : (
            <ul>
              {classDetail.students.map((s) => (
                <li key={s.id}>
                  {s.name}
                  <button type="button" onClick={() => handleUnenroll(s.id)}>
                    Desmatricular
                  </button>
                </li>
              ))}
            </ul>
          )}

          {students.filter((s) => !classDetail.studentIds.includes(s.id)).length > 0 && (
            <div>
              <label htmlFor="enroll-select">Matricular aluno</label>
              <select
                id="enroll-select"
                defaultValue=""
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

          <h2>Avaliações</h2>
          {classDetail.students.length === 0 ? (
            <p>Matricule alunos para registrar avaliações.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Aluno</th>
                  {METAS.map((meta) => (
                    <th key={meta}>{meta}</th>
                  ))}
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {classDetail.students.map((student) => (
                  <tr key={student.id}>
                    <td>{student.name}</td>
                    {METAS.map((meta) => (
                      <td key={meta}>
                        <select
                          aria-label={`${meta} de ${student.name}`}
                          value={getGradeValue(student.id, meta)}
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
                    <td>
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => handleSaveStudentGrades(student.id)}
                      >
                        Salvar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}
    </main>
  );
}
