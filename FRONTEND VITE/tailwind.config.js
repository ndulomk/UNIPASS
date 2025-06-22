/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      keyframes:{
        "spinn":{
          "0%":{transform: "rotate(0)"},
          "100%":{transform: "rotate(360deg)"}
        },
        "brand":{
          "0%":{scale: "0"},
          "50%":{scale: "2"},
          "100%":{scale:"0.5"}
        }
      },
      animation:{
        'spinn': 'spinn 3s linear infinite',
        "brand": "brand 1s linear infinite pause"
      },
      backgroundImage:{
        "gradi": "radial-gradient(#2f3d30, #292f26, #222d2a)",
        "food": "linear-gradient(rgba(0, 0, 0, 0.445),rgba(0, 0, 0, 0.43)), url('/public/food (12).jpg')"
      },
      colors:{
        grape: 'rgba(var(--grape))',
        border: 'rgba(var(--border))',
        myColor: 'rgba(var(--mycolor))',
        p: 'rgba(var(--p))',
        text:'rgba(var(--text))',
        bgcard: 'rgba(var(--bgcard))',
        bordercard: 'rgba(var(--bordercard))',
        background: 'rgba(var(--background))',
        black: 'rgba(var(--black))',
        bordersearch: 'rgba(var(--bordersearch))',
        bgSearch: 'rgba(var(--bgSearch))',
        bgWhite: 'rgba(var(--bgWhite))',
        search: 'rgba(var(--search))',
        btn:  'rgba(var(--btn))',
        sidebar:  'rgba(var(--sidebar))',
        textbtn:  'rgba(var(--textbtn))'
      },
    },
  },
  plugins: [],
}