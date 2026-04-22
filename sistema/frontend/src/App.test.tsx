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
      await screen.findByRole("heading", { name: /cadastro de alunos/i })
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
});
