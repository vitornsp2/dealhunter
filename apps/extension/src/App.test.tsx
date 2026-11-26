// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import App from "./App";

describe("dashboard UI", () => {
  beforeEach(() => localStorage.clear());

  it("renders Brazilian metrics and explicit simulated mode", async () => {
    render(<App />);
    expect(await screen.findByRole("heading", { name: "Visão geral" })).toBeInTheDocument();
    expect(screen.getByText(/Simulado/)).toBeInTheDocument();
    expect(screen.getByText("Produtos acompanhados")).toBeInTheDocument();
    expect(screen.getByText("Última consulta")).toBeInTheDocument();
  });
});
