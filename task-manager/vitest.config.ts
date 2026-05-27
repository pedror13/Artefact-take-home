import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    // happy-dom e mais leve que jsdom e suficiente para testes de componente
    // baseados em Testing Library. Arquivos *.test.ts (sem JSX/DOM) ainda
    // recebem o ambiente, mas o custo e baixo.
    environment: "happy-dom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    css: false,
    // Cada arquivo de teste roda num worker isolado, evitando que o
    // `globalThis.__taskStore` vaze entre arquivos do server.
    isolate: true,
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
});
