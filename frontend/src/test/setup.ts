import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// O jsdom não implementa rolagem; o roteador chama window.scrollTo ao navegar.
window.scrollTo = vi.fn();

afterEach(() => {
  cleanup();
});
