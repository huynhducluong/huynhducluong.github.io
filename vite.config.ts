import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  base: "/",
  build: {
    rollupOptions: {
      input: {
        home: fileURLToPath(new URL("./index.html", import.meta.url)),
        cv: fileURLToPath(new URL("./cv/index.html", import.meta.url)),
        projects: fileURLToPath(new URL("./projects/index.html", import.meta.url)),
        project: fileURLToPath(new URL("./project/index.html", import.meta.url)),
        tools: fileURLToPath(new URL("./tools/index.html", import.meta.url)),
        tool: fileURLToPath(new URL("./tool/index.html", import.meta.url)),
      },
    },
  },
});
