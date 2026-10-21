import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: true },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    // Os testes E2E (Playwright) ficam em e2e/ e rodam por outro comando.
    include: ["src/**/*.test.{ts,tsx}"],
    css: false,
  },
});
