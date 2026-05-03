import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#00346f',
                    50: '#f0f4ff',
                    100: '#e0e9ff',
                    200: '#c2d4ff',
                    300: '#94b4ff',
                    400: '#5c8aff',
                    500: '#00346f', // Updated Brand Blue
                    600: '#002e61',
                    700: '#002145',
                    800: '#001429',
                    900: '#000a14',
                },
                accent: {
                    DEFAULT: '#ff7a00',
                    50: '#fff4e6',
                    100: '#ffe9cc',
                    500: '#ff7a00', // Accent Orange
                    600: '#e66e00',
                },
                surface: {
                    DEFAULT: '#faf8ff',
                    bright: '#ffffff',
                },
                "on-surface": '#1a1c1e',
                "primary-container": "#d7e2ff",
                "on-primary-container": "#001a3f",
                "secondary-container": "#ffdbca",
                "on-secondary-container": "#311300",
                "tertiary-container": "#e0e2e4",
                "on-tertiary-container": "#babcbe",
                "surface-container": "#f3f3f7",
                "surface-container-low": "#f3f3f7",
                "surface-container-high": "#e2e2e6",
                "surface-container-highest": "#e2e2e6",
                "on-surface-variant": "#44474e",
                "outline": "#74777f",
                "outline-variant": "#c4c6d0",
            },
            fontFamily: {
                sans: ["var(--font-inter)", "Inter", "system-ui", "-apple-system", "BlinkMacSystemFont", '"Segoe UI"', "Helvetica", "Arial", "sans-serif"],
            },
            backgroundImage: {
                "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
                "gradient-conic":
                    "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
            },
            backdropBlur: {
                xs: '2px',
            },
            keyframes: {
                scroll: {
                    '0%': { transform: 'translateX(0)' },
                    '100%': { transform: 'translateX(-50%)' },
                },
                'scroll-reverse': {
                    '0%': { transform: 'translateX(-50%)' },
                    '100%': { transform: 'translateX(0)' },
                },
            },
            animation: {
                scroll: 'scroll 40s linear infinite',
                'scroll-reverse': 'scroll-reverse 40s linear infinite',
            },
        },
    },
    plugins: [],
};
export default config;
