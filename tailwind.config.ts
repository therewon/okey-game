import type { Config } from "tailwindcss";
import forms from "@tailwindcss/forms";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#071411",
        felt: "#0d5a3d",
        gold: "#e7b85c",
        cream: "#fff9e9",
      },
      boxShadow: {
        tile: "0 8px 18px rgba(0,0,0,.24), inset 0 -3px 0 rgba(151,117,61,.2)",
      },
    },
  },
  plugins: [forms],
} satisfies Config;
