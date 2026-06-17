import { defineConfig } from "vite";

export default defineConfig({
  base: "/birthdaytest1/",
  build: {
    minify: "terser",
  },
});