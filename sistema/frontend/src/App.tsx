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
      const response = await fetch(`${API_URL}/students`, {
        method: "POST",
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
        setError(data.message ?? "Não foi possível cadastrar o aluno.");
        return;
      }

      const createdStudent = (await response.json()) as Student;
      setStudents((current) => [...current, createdStudent]);
      setForm(initialFormValues);
      setSuccess("Aluno cadastrado com sucesso.");
    } catch {
      setError("Erro de comunicação com o servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <h1>Cadastro de alunos</h1>
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
          {loading ? "Salvando..." : "Cadastrar aluno"}
        </button>
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
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id}>
                <td>{student.name}</td>
                <td>{student.cpf}</td>
                <td>{student.email}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
