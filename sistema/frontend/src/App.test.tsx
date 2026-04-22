import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { App } from "./App";
import { vi } from "vitest";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

describe("App", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ students: [] })
    });
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
      json: async () => ({
        id: "1",
        name: "Ana",
        cpf: "12345678901",
        email: "ana@example.com"
      })
    });

    render(<App />);

    fireEvent.change(screen.getByLabelText(/nome/i), {
      target: { value: "Ana" }
    });
    fireEvent.change(screen.getByLabelText(/cpf/i), {
      target: { value: "12345678901" }
    });
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "ana@example.com" }
    });

    fireEvent.click(screen.getByRole("button", { name: /cadastrar aluno/i }));

    await waitFor(() => {
      expect(screen.getByText(/aluno cadastrado com sucesso/i)).toBeInTheDocument();
      expect(screen.getByText("Ana")).toBeInTheDocument();
    });
  });

  it("mostra erro para email inválido", async () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText(/nome/i), {
      target: { value: "Ana" }
    });
    fireEvent.change(screen.getByLabelText(/cpf/i), {
      target: { value: "12345678901" }
    });
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "email-invalido" }
    });

    fireEvent.click(screen.getByRole("button", { name: /cadastrar aluno/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/email inválido/i);
  });

  it("edita aluno existente com sucesso", async () => {
    fetchMock.mockReset();
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          students: [
            { id: "1", name: "Ana", cpf: "12345678901", email: "ana@example.com" }
          ]
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "1",
          name: "Ana Souza",
          cpf: "12345678901",
          email: "ana.souza@example.com"
        })
      });

    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: /editar/i }));
    fireEvent.change(screen.getByLabelText(/nome/i), {
      target: { value: "Ana Souza" }
    });
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "ana.souza@example.com" }
    });
    fireEvent.click(screen.getByRole("button", { name: /salvar edição/i }));

    await waitFor(() => {
      expect(screen.getByText(/aluno atualizado com sucesso/i)).toBeInTheDocument();
      expect(screen.getByText("Ana Souza")).toBeInTheDocument();
    });
  });

  it("remove aluno com confirmação e chama endpoint correto", async () => {
    fetchMock.mockReset();
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          students: [
            { id: "1", name: "Ana", cpf: "12345678901", email: "ana@example.com" }
          ]
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      });

    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: /remover/i }));
    fireEvent.click(screen.getByRole("button", { name: /confirmar remoção/i }));

    await waitFor(() => {
      expect(screen.getByText(/aluno removido com sucesso/i)).toBeInTheDocument();
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
    fireEvent.click(screen.getByRole("button", { name: /cancelar remoção/i }));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Ana")).toBeInTheDocument();
  });
});
