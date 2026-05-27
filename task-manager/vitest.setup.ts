import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Garante que o DOM seja resetado entre testes para evitar leaks entre suites
// de componente (Testing Library nao limpa sozinha quando `globals: true`).
afterEach(() => {
  cleanup();
});
