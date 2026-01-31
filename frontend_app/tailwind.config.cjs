/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Primary 1: Burnt Crimson (War, Consequences)
                crimson: {
                    900: '#2A0A0A', // Deepest dried blood (Backgrounds)
                    800: '#450E0E', // Rust red (Panels)
                    700: '#6B1616', // Muted clay red (Borders)
                    600: '#8F1E1E', // Standard war red (Text/Icons)
                    500: '#B02525', // Danger highlights (Use sparingly)
                    glow: '#591111', // Ambient glow
                },
                // Primary 2: Obsidian Sand (Structure, Grounding)
                obsidian: {
                    950: '#0A0A09', // Void (Main BG)
                    900: '#141412', // Dark Charcoal (Card BG)
                    800: '#1F1F1C', // Dark Ash (Secondary Panels)
                    700: '#2E2E2A', // Dusty Sand (Borders)
                    600: '#454540', // Faded Khaki (Muted Text)
                    500: '#75756B', // Sand (Primary Text)
                },
                // Accent: Aged Authority Gold (Judgment, Rank)
                gold: {
                    900: '#3D3108', // Ancient bronze
                    700: '#6E5A17', // Dull gold
                    500: '#9C8226', // Standard authority gold
                    400: '#C4A639', // Highlight (Rare)
                }
            },
            fontFamily: {
                sans: ['"Inter"', 'sans-serif'],
                mono: ['"JetBrains Mono"', 'monospace'], // For terminal aspects
            },
            animation: {
                'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'haze': 'haze 20s linear infinite',
            },
            keyframes: {
                haze: {
                    '0%': { transform: 'translateX(0) translateY(0)' },
                    '100%': { transform: 'translateX(-50%) translateY(-20%)' }
                }
            }
        },
    },
    plugins: [],
}
