import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ["var(--font-playfair)", "serif"],
        sans: ["var(--font-dm-sans)", "sans-serif"],
      },
      colors: {
        espresso: "#3B1F0E",
        mocha: "#6B3A2A",
        caramel: "#C07D4A",
        latte: "#E8D5B7",
        cream: "#F5EFE6",
        parchment: "#FBF8F4",
        leaf: "#2D6A4F",
        sage: "#52B788",
        mint: "#D8F3DC",
      },
    },
  },
  plugins: [],
};
export default config;
