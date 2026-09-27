import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Padrão de cores de status de Agentes (paleta pastel)
        status: {
          atendimento: "#E5E0C5", // Amarelo pastel — Em Atendimento
          disponivel: "#C6E5C5", // Verde pastel — Disponível
          pausa: "#E5C5C6", // Rosa pastel — Em Pausa
          offline: "#6B7280", // Cinza — Deslogado/Offline
        },
        // Identidade visual do app (tema escuro operacional)
        brand: {
          bg: "#0B1220",
          surface: "#131C2E",
          border: "#22304A",
          accent: "#3B82F6",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
