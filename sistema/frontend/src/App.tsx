import { FormEvent, useEffect, useMemo, useState } from "react";

type Student = {
  id: string;
  name: string;
  cpf: string;
  email: string;
};

type FormValues = {
  name: string;
  cpf: string;
  email: string;
};

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

const initialFormValues: FormValues = {
  name: "",
  cpf: "",
  email: ""
};

function isValidCpf(cpf: string): boolean {
  return /^\d{11}$/.test(cpf.replace(/\D/g, ""));
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function toApiCpf(cpf: string): string {
  return cpf.replace(/\D/g, "");
}

export function App() {
  const [students, setStudents] = useState<Student[]>([]);
  const [form, setForm] = useState<FormValues>(initialFormValues);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [pendingDeleteStudentId, setPendingDeleteStudentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const hasMissingFields = useMemo(
    () => !form.name.trim() || !form.cpf.trim() || !form.email.trim(),
    [form]
  );

  useEffect(() => {
    void fetchStudents();
  }, []);

  async function fetchStudents() {
    const response = await fetch(`${API_URL}/students`);
    if (!response.ok) {
      throw new Error("Falha ao carregar alunos.");
    }
    const data = (await response.json()) as { students: Student[] };
    setStudents(data.students);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (hasMissingFields) {
      setError("Preencha nome, CPF e email.");
      return;
    }

    if (!isValidCpf(form.cpf)) {
      setError("CPF inválido. Informe 11 dígitos.");
      return;
    }

    if (!isValidEmail(form.email)) {
      setError("Email inválido.");
      return;
    }

    try {
      setLoading(true);
      const isEditing = Boolean(editingStudentId);
      const targetUrl = isEditing
        ? `${API_URL}/students/${editingStudentId}`
        : `${API_URL}/students`;
      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(targetUrl, {
        method,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: form.name.trim(),
          cpf: toApiCpf(form.cpf),
          email: form.email.trim().toLowerCase()
        })
      });

      if (!response.ok) {
        const data = (await response.json()) as { message?: string };
        setError(
          data.message ??
            (isEditing
              ? "Não foi possível atualizar o aluno."
              : "Não foi possível cadastrar o aluno.")
        );
        return;
      }

      const savedStudent = (await response.json()) as Student;
      if (isEditing) {
        setStudents((current) =>
          current.map((student) =>
            student.id === savedStudent.id ? savedStudent : student
          )
        );
      } else {
        setStudents((current) => [...current, savedStudent]);
      }

      setForm(initialFormValues);
      setEditingStudentId(null);
      setSuccess(isEditing ? "Aluno atualizado com sucesso." : "Aluno cadastrado com sucesso.");
    } catch {
      setError("Erro de comunicação com o servidor.");
    } finally {
      setLoading(false);
    }
  }

  function startEdit(student: Student) {
    setError(null);
    setSuccess(null);
    setEditingStudentId(student.id);
    setForm({
      name: student.name,
      cpf: student.cpf,
      email: student.email
    });
  }

  function cancelEdit() {
    setEditingStudentId(null);
    setForm(initialFormValues);
    setError(null);
    setSuccess(null);
  }

  function requestDelete(student: Student) {
    setError(null);
    setSuccess(null);
    setPendingDeleteStudentId(student.id);
  }

  function cancelDelete() {
    setPendingDeleteStudentId(null);
  }

  async function confirmDelete(student: Student) {
    try {
      const response = await fetch(`${API_URL}/students/${student.id}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        const data = (await response.json()) as { message?: string };
        setError(data.message ?? "Não foi possível remover o aluno.");
        return;
      }

      setStudents((current) => current.filter((currentStudent) => currentStudent.id !== student.id));
      if (editingStudentId === student.id) {
        cancelEdit();
      }
      setPendingDeleteStudentId(null);
      setSuccess("Aluno removido com sucesso.");
    } catch {
      setError("Erro de comunicação com o servidor.");
    }
  }

  return (
    <main>
      <h1>Gerenciamento de alunos</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="name">Nome</label>
          <input
            id="name"
            name="name"
            value={form.name}
            onChange={(event) =>
              setForm((current) => ({ ...current, name: event.target.value }))
            }
          />
        </div>

        <div>
          <label htmlFor="cpf">CPF</label>
          <input
            id="cpf"
            name="cpf"
            value={form.cpf}
            onChange={(event) =>
              setForm((current) => ({ ...current, cpf: event.target.value }))
            }
          />
        </div>

        <div>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            value={form.email}
            onChange={(event) =>
              setForm((current) => ({ ...current, email: event.target.value }))
            }
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading
            ? "Salvando..."
            : editingStudentId
              ? "Salvar edição"
              : "Cadastrar aluno"}
        </button>
        {editingStudentId && (
          <button type="button" onClick={cancelEdit}>
            Cancelar edição
          </button>
        )}
      </form>

      {error && <p role="alert">{error}</p>}
      {success && <p>{success}</p>}

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
                  <button type="button" onClick={() => startEdit(student)}>
                    Editar
                  </button>
                  <button type="button" onClick={() => requestDelete(student)}>
                    Remover
                  </button>
                  {pendingDeleteStudentId === student.id && (
                    <>
                      <button type="button" onClick={() => confirmDelete(student)}>
                        Confirmar remoção
                      </button>
                      <button type="button" onClick={cancelDelete}>
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
    </main>
  );
}
