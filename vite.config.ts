import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [tailwindcss()],
  define: {
    global: "globalThis",
  },
  optimizeDeps: {
    exclude: ["@demox-labs/miden-sdk"],
    include: ["buffer"],
  },
  assetsInclude: ["**/*.masm"], // Include .masm files as assets
});
