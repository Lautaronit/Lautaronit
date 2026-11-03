import { defineConfig } from "vitest/config";

/**
 * Configuración de Vitest para todo el monorepo.
 * Busca archivos *.test.ts en apps/ y packages/ y los corre en entorno Node.
 * (Extensión .mts para que se cargue como ESM sin warnings.)
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["apps/**/*.test.ts", "packages/**/*.test.ts"],
  },
});
