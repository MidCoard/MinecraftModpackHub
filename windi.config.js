import { defineConfig } from "windicss/helpers";

export default defineConfig({
  theme: {
    extend: {
      colors: {
        primary: {
          extralight: "var(--panel)",
          light: "var(--line)",
          DEFAULT: "var(--ink)",
        },
      },
    },
  },
});
