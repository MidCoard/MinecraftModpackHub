import path from "path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import WindiCSS from "vite-plugin-windicss";
import VueI18n from "@intlify/vite-plugin-vue-i18n";

export default defineConfig({
  plugins: [
    vue(),
    WindiCSS(),
    VueI18n({
      include: [path.resolve(__dirname, "./locale/**")],
    }),
  ],
  build: {
    sourcemap: false,
    rollupOptions: {
      input: Object.fromEntries(
        ["index.html", "modpacks/index.html", "factory/index.html"].map(
          (file) => [file, fileURLToPath(new URL(file, import.meta.url))],
        ),
      ),
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
