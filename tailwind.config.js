module.exports = {
  content: ["./pages/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class", // Enable class-based dark mode
  theme: {
    extend: {
      colors: {
        // Colorblind-safe palette
        cb: {
          light: {
            primary: "#0072B2",
            secondary: "#009E73",
            accent: "#D55E00",
            background: "#f7f7f7",
            text: "#222"
          },
          dark: {
            primary: "#56B4E9",
            secondary: "#F0E442",
            accent: "#E69F00",
            background: "#222426",
            text: "#f7f7f7"
          }
        }
      }
    }
  },
  plugins: []
}
