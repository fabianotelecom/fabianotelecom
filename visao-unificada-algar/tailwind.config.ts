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
        // Cores de status de Agentes (tons fortes, alinhados à identidade Algar)
        status: {
          atendimento: "#F59E0B", // Âmbar — Em Atendimento
          disponivel: "#10B981", // Esmeralda — Disponível
          pausa: "#F43F5E", // Rosa/vermelho — Em Pausa
          offline: "#64748B", // Cinza — Deslogado/Offline
        },
        // Identidade visual Algar (tema escuro: navy + teal)
        brand: {
          bg: "#002B3D", // navy Algar
          surface: "#05384A", // navy mais claro (cards)
          border: "#0F4A5C",
          accent: "#28BEA5", // teal Algar
          accentDark: "#239687", // teal (hover/pressed)
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
