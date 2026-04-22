import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { App } from "./App";
import { vi } from "vitest";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

function mockStudentList(students = []) {
  fetchMock.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ students })
  });
}

function mockClassList(classes = []) {
  fetchMock.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ classes })
  });
}

// ─── Students ─────────────────────────────────────────────────────────────────

describe("Tela de alunos", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    mockStudentList();
  });

  it("renderiza tela de cadastro", async () => {
    render(<App />);
    expect(
      await screen.findByRole("heading", { name: /gerenciamento de alunos/i })
    ).toBeInTheDocument();
  });

  it("cadastra aluno com sucesso e atualiza lista", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "1", name: "Ana", cpf: "12345678901", email: "ana@example.com" })
    });

    render(<App />);

    fireEvent.change(screen.getByLabelText(/nome/i), { target: { value: "Ana" } });
    fireEvent.change(screen.getByLabelText(/cpf/i), { target: { value: "12345678901" } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "ana@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /cadastrar aluno/i }));

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(/aluno cadastrado com sucesso/i);
      expect(screen.getByText("Ana")).toBeInTheDocument();
    });
  });

  it("mostra erro para email inválido", async () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText(/nome/i), { target: { value: "Ana" } });
    fireEvent.change(screen.getByLabelText(/cpf/i), { target: { value: "12345678901" } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "email-invalido" } });
    fireEvent.click(screen.getByRole("button", { name: /cadastrar aluno/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/email inválido/i);
  });

  it("edita aluno existente com sucesso", async () => {
    fetchMock.mockReset();
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          students: [{ id: "1", name: "Ana", cpf: "12345678901", email: "ana@example.com" }]
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "1", name: "Ana Souza", cpf: "12345678901", email: "ana.souza@example.com" })
      });

    render(<App />);
    fireEvent.click(await screen.findByRole("button", { name: /editar/i }));
    fireEvent.change(screen.getByLabelText(/nome/i), { target: { value: "Ana Souza" } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "ana.souza@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /salvar edição/i }));

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(/aluno atualizado com sucesso/i);
      expect(screen.getByText("Ana Souza")).toBeInTheDocument();
    });
  });

  it("remove aluno com confirmação e chama endpoint correto", async () => {
    fetchMock.mockReset();
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          students: [{ id: "1", name: "Ana", cpf: "12345678901", email: "ana@example.com" }]
        })
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    render(<App />);
    fireEvent.click(await screen.findByRole("button", { name: /remover/i }));
    expect(screen.getByText(/deseja remover o aluno ana/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /confirmar remoção/i }));

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(/aluno removido com sucesso/i);
      expect(screen.getByText(/nenhum aluno cadastrado/i)).toBeInTheDocument();
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://localhost:3000/students/1",
      expect.objectContaining({ method: "DELETE" })
    );
  });

  it("não remove aluno quando confirmação é cancelada", async () => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        students: [{ id: "1", name: "Ana", cpf: "12345678901", email: "ana@example.com" }]
      })
    });

    render(<App />);
    fireEvent.click(await screen.findByRole("button", { name: /remover/i }));
    expect(screen.getByRole("heading", { name: /confirmar remoção/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /cancelar remoção/i }));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Ana")).toBeInTheDocument();
  });

  it("filtra alunos por termo digitado", async () => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        students: [
          { id: "1", name: "Ana", cpf: "12345678901", email: "ana@example.com" },
          { id: "2", name: "Bruno", cpf: "98765432100", email: "bruno@example.com" }
        ]
      })
    });

    render(<App />);
    await screen.findByRole("heading", { name: /gerenciamento de alunos/i });
    fireEvent.change(screen.getByPlaceholderText(/filtrar por nome/i), {
      target: { value: "ana" }
    });

    await waitFor(() => {
      expect(screen.getByRole("cell", { name: "Ana" })).toBeInTheDocument();
      expect(screen.queryByRole("cell", { name: "Bruno" })).not.toBeInTheDocument();
    });
  });
});

// ─── Classes ──────────────────────────────────────────────────────────────────

describe("Tela de turmas", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    mockStudentList();
  });

  async function navigateToClasses() {
    render(<App />);
    await screen.findByRole("heading", { name: /gerenciamento de alunos/i });
    mockClassList();
    fireEvent.click(screen.getByRole("button", { name: /turmas/i }));
    await screen.findByRole("heading", { name: /gerenciamento de turmas/i });
  }

  it("navega para tela de turmas", async () => {
    await navigateToClasses();
    expect(screen.getByRole("heading", { name: /gerenciamento de turmas/i })).toBeInTheDocument();
  });

  it("exibe estado vazio de turmas", async () => {
    await navigateToClasses();
    expect(screen.getByText(/nenhuma turma cadastrada/i)).toBeInTheDocument();
  });

  it("cadastra turma com sucesso", async () => {
    await navigateToClasses();

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: "c1",
        topic: "Engenharia de Software",
        year: 2026,
        semester: 1,
        capacity: 40,
        studentIds: []
      })
    });

    fireEvent.change(screen.getByLabelText(/tópico/i), {
      target: { value: "Engenharia de Software" }
    });
    fireEvent.change(screen.getByLabelText(/ano/i), { target: { value: "2026" } });
    fireEvent.change(screen.getByLabelText(/semestre/i), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText(/capacidade/i), { target: { value: "40" } });
    fireEvent.click(screen.getByRole("button", { name: /cadastrar turma/i }));

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(/turma cadastrada com sucesso/i);
      expect(screen.getByText("Engenharia de Software")).toBeInTheDocument();
    });
  });

  it("mostra erro quando tópico está vazio", async () => {
    await navigateToClasses();

    fireEvent.change(screen.getByLabelText(/ano/i), { target: { value: "2026" } });
    fireEvent.change(screen.getByLabelText(/semestre/i), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText(/capacidade/i), { target: { value: "40" } });
    fireEvent.click(screen.getByRole("button", { name: /cadastrar turma/i }));

    expect(screen.getByRole("alert")).toHaveTextContent(/tópico/i);
  });

  it("exibe erro de duplicidade retornado pelo servidor", async () => {
    await navigateToClasses();

    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: "Já existe uma turma com esse tópico, ano e semestre." })
    });

    fireEvent.change(screen.getByLabelText(/tópico/i), { target: { value: "ES" } });
    fireEvent.change(screen.getByLabelText(/ano/i), { target: { value: "2026" } });
    fireEvent.change(screen.getByLabelText(/semestre/i), { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", { name: /cadastrar turma/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/já existe uma turma/i);
    });
  });

  it("edita turma com sucesso", async () => {
    fetchMock.mockReset();
    mockStudentList();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        classes: [{ id: "c1", topic: "ES", year: 2026, semester: 1, capacity: 40, studentIds: [] }]
      })
    });

    render(<App />);
    await screen.findByRole("heading", { name: /gerenciamento de alunos/i });
    fireEvent.click(screen.getByRole("button", { name: /turmas/i }));

    fireEvent.click(await screen.findByRole("button", { name: /editar/i }));
    fireEvent.change(screen.getByLabelText(/tópico/i), { target: { value: "Testes" } });

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "c1", topic: "Testes", year: 2026, semester: 1, capacity: 40, studentIds: [] })
    });
    fireEvent.click(screen.getByRole("button", { name: /salvar edição/i }));

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(/turma atualizada com sucesso/i);
      expect(screen.getByText("Testes")).toBeInTheDocument();
    });
  });

  it("remove turma com confirmação", async () => {
    fetchMock.mockReset();
    mockStudentList();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        classes: [{ id: "c1", topic: "ES", year: 2026, semester: 1, capacity: 40, studentIds: [] }]
      })
    });

    render(<App />);
    await screen.findByRole("heading", { name: /gerenciamento de alunos/i });
    fireEvent.click(screen.getByRole("button", { name: /turmas/i }));

    fireEvent.click(await screen.findByRole("button", { name: /^remover$/i }));
    expect(screen.getByText(/deseja remover a turma es/i)).toBeInTheDocument();
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    fireEvent.click(screen.getByRole("button", { name: /confirmar remoção/i }));

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(/turma removida com sucesso/i);
      expect(screen.getByText(/nenhuma turma cadastrada/i)).toBeInTheDocument();
    });
  });

  it("não remove turma quando confirmação é cancelada", async () => {
    fetchMock.mockReset();
    mockStudentList();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        classes: [{ id: "c1", topic: "ES", year: 2026, semester: 1, capacity: 40, studentIds: [] }]
      })
    });

    render(<App />);
    await screen.findByRole("heading", { name: /gerenciamento de alunos/i });
    fireEvent.click(screen.getByRole("button", { name: /turmas/i }));

    fireEvent.click(await screen.findByRole("button", { name: /^remover$/i }));
    expect(screen.getByRole("heading", { name: /confirmar remoção/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /cancelar remoção/i }));

    expect(screen.getByText("ES")).toBeInTheDocument();
  });
});

// ─── Class detail ─────────────────────────────────────────────────────────────

describe("Detalhe da turma (alunos e avaliações)", () => {
  const classData = {
    id: "c1",
    topic: "Engenharia de Software",
    year: 2026,
    semester: 1,
    capacity: 40,
    studentIds: ["s1"],
    students: [{ id: "s1", name: "Ana", cpf: "12345678901", email: "ana@example.com" }],
    grades: []
  };

  function setupDetailMocks() {
    fetchMock.mockReset();
    mockStudentList([{ id: "s1", name: "Ana", cpf: "12345678901", email: "ana@example.com" }]);
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ classes: [{ id: "c1", topic: "Engenharia de Software", year: 2026, semester: 1, capacity: 40, studentIds: ["s1"] }] })
    });
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => classData });
  }

  async function navigateToDetail() {
    render(<App />);
    await screen.findByRole("heading", { name: /gerenciamento de alunos/i });
    fireEvent.click(screen.getByRole("button", { name: /turmas/i }));
    fireEvent.click(await screen.findByRole("button", { name: /ver turma/i }));
    await screen.findByRole("heading", { name: /engenharia de software/i });
  }

  it("exibe alunos matriculados na turma", async () => {
    setupDetailMocks();
    await navigateToDetail();
    expect(screen.getAllByText("Ana").length).toBeGreaterThan(0);
  });

  it("mostra tabela de avaliações com metas como colunas", async () => {
    setupDetailMocks();
    await navigateToDetail();

    expect(screen.getByText("Requisitos")).toBeInTheDocument();
    expect(screen.getByText("Testes")).toBeInTheDocument();
    expect(screen.getByText("Implementação")).toBeInTheDocument();
    expect(screen.getAllByText("MANA").length).toBeGreaterThan(0);
    expect(screen.getAllByText("MPA").length).toBeGreaterThan(0);
    expect(screen.getAllByText("MA").length).toBeGreaterThan(0);
  });

  it("exibe estado vazio quando não há alunos matriculados", async () => {
    fetchMock.mockReset();
    mockStudentList([]);
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ classes: [{ id: "c1", topic: "ES", year: 2026, semester: 1, capacity: 40, studentIds: [] }] })
    });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "c1", topic: "ES", year: 2026, semester: 1, capacity: 40, studentIds: [], students: [], grades: [] })
    });

    render(<App />);
    await screen.findByRole("heading", { name: /gerenciamento de alunos/i });
    fireEvent.click(screen.getByRole("button", { name: /turmas/i }));
    fireEvent.click(await screen.findByRole("button", { name: /ver turma/i }));

    await screen.findByRole("heading", { level: 1, name: /ES — 2026/i });
    expect(screen.getByText(/nenhum aluno matriculado/i)).toBeInTheDocument();
  });

  it("salva avaliação do aluno chamando endpoint correto", async () => {
    setupDetailMocks();
    await navigateToDetail();

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: "g1", studentId: "s1", classId: "c1", meta: "Requisitos", concept: "MANA"
      })
    });
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ ...classData, grades: [{ studentId: "s1", classId: "c1", meta: "Requisitos", concept: "MANA" }] }) });

    fireEvent.change(screen.getByLabelText(/requisitos de ana/i), {
      target: { value: "MANA" }
    });
    fireEvent.click(screen.getByRole("button", { name: /salvar/i }));

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(/avaliações salvas/i);
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/grades/s1/Requisitos"),
      expect.objectContaining({ method: "PUT" })
    );
  });

  it("remove avaliação quando conceito é limpo", async () => {
    fetchMock.mockReset();
    mockStudentList([{ id: "s1", name: "Ana", cpf: "12345678901", email: "ana@example.com" }]);
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        classes: [{ id: "c1", topic: "ES", year: 2026, semester: 1, capacity: 40, studentIds: ["s1"] }]
      })
    });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ...classData,
        grades: [{ studentId: "s1", classId: "c1", meta: "Requisitos", concept: "MANA" }]
      })
    });

    render(<App />);
    await screen.findByRole("heading", { name: /gerenciamento de alunos/i });
    fireEvent.click(screen.getByRole("button", { name: /turmas/i }));
    fireEvent.click(await screen.findByRole("button", { name: /ver turma/i }));

    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...classData, grades: [] })
    });

    fireEvent.change(await screen.findByLabelText(/requisitos de ana/i), {
      target: { value: "" }
    });
    fireEvent.click(screen.getByRole("button", { name: /salvar/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/grades/s1/Requisitos"),
        expect.objectContaining({ method: "DELETE" })
      );
    });
  });

  it("exibe conceitos já salvos no select da célula", async () => {
    fetchMock.mockReset();
    mockStudentList([{ id: "s1", name: "Ana", cpf: "12345678901", email: "ana@example.com" }]);
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ classes: [{ id: "c1", topic: "ES", year: 2026, semester: 1, capacity: 40, studentIds: ["s1"] }] })
    });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ...classData,
        grades: [{ studentId: "s1", classId: "c1", meta: "Testes", concept: "MPA" }]
      })
    });

    render(<App />);
    await screen.findByRole("heading", { name: /gerenciamento de alunos/i });
    fireEvent.click(screen.getByRole("button", { name: /turmas/i }));
    fireEvent.click(await screen.findByRole("button", { name: /ver turma/i }));

    const select = (await screen.findByLabelText(/testes de ana/i)) as HTMLSelectElement;
    expect(select.value).toBe("MPA");
  });

  it("botão Voltar retorna à lista de turmas", async () => {
    setupDetailMocks();
    await navigateToDetail();

    mockClassList([{ id: "c1", topic: "Engenharia de Software", year: 2026, semester: 1, capacity: 40, studentIds: ["s1"] }]);
    fireEvent.click(screen.getByRole("button", { name: /voltar para turmas/i }));

    await screen.findByRole("heading", { name: /gerenciamento de turmas/i });
  });
});

describe("Dashboard", () => {
  it("renderiza botão de ir para turmas e ícone home no topo", async () => {
    fetchMock.mockReset();
    mockStudentList([]);
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ studentCount: 0, classCount: 0, gradeCount: 0, averageGrade: 0 })
    });

    render(<App />);
    await screen.findByRole("heading", { name: /gerenciamento de alunos/i });
    fireEvent.click(screen.getByRole("button", { name: /dashboard/i }));

    expect(await screen.findByRole("button", { name: /ir para turmas/i })).toBeInTheDocument();
    expect(screen.getAllByText("home").length).toBeGreaterThan(0);
  });
});
