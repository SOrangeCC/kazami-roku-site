import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: ["selector", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        paper: "var(--bg-paper)",
        surface: "var(--bg-surface)",
        ice: "var(--bg-ice)",
        ribbon: "var(--bg-ribbon)",
        hair: "var(--bg-hair)",
        frost: "var(--border-frost)",
        ink: "var(--text-ink)",
        secondary: "var(--text-secondary)",
        primary: "var(--accent-primary)",
        highlight: "var(--accent-highlight)",
      },
    },
  },
  plugins: [],
};

export default config;
