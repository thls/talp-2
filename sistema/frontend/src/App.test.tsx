import { render, screen } from "@testing-library/react";
import { App } from "./App";

describe("App", () => {
  it("renderiza o titulo inicial", () => {
    render(<App />);
    expect(
      screen.getByRole("heading", { name: /sistema inicial/i })
    ).toBeInTheDocument();
  });
});
