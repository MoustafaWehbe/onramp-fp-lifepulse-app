/** @type {import('tailwindcss').Config} */

/**
 * Tailwind v3 cannot split oklch() values into channels for opacity modifiers.
 * This helper generates color-mix() so that classes like bg-background/80 or
 * bg-area-health/10 produce valid CSS.
 *
 * We use "in oklch" because all CSS custom properties store oklch() values —
 * mixing in the same color space preserves perceptual color quality.
 */
const withOpacity = (varName) => ({ opacityValue }) => {
  if (opacityValue === undefined) return `var(${varName})`;
  // Tailwind v3 passes the CSS variable name string (e.g. "var(--tw-bg-opacity)") when
  // generating the opacity-aware base utility. parseFloat of a CSS var string is NaN,
  // which would produce "NaN%" in color-mix — invalid CSS that the browser ignores.
  // Guard: if it isn't a plain number, fall back to the solid CSS variable.
  const pct = parseFloat(opacityValue) * 100;
  if (Number.isNaN(pct)) return `var(${varName})`;
  return `color-mix(in oklch, var(${varName}) ${pct}%, transparent)`;
};

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  safelist: [
    /**
     * Area color classes are built with template literals at runtime, e.g.
     *   bg-area-${area.color}/10
     *   ring-area-${area.color}/30
     *   hover:ring-area-${area.color}/40
     *   group-hover:ring-area-${area.color}/40   ← used in Today.tsx checkbox
     * Tailwind's scanner can't detect these, so we force-generate them here.
     */
    {
      pattern:
        /(bg|text|ring|border)-area-(health|career|spirit|social|learning|creative)(\/\d+)?/,
      variants: ["hover", "group-hover"],
    },
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter"', "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      // Tailwind v3 only ships grid-cols-1..12 by default.
      // Progress.tsx uses md:grid-cols-14 for the 14-day heatmap.
      gridTemplateColumns: {
        14: "repeat(14, minmax(0, 1fr))",
      },
      colors: {
        border: withOpacity("--border"),
        input: withOpacity("--input"),
        ring: withOpacity("--ring"),
        background: withOpacity("--background"),
        foreground: withOpacity("--foreground"),
        surface: withOpacity("--surface"),
        "surface-elevated": withOpacity("--surface-elevated"),
        primary: {
          DEFAULT: withOpacity("--primary"),
          foreground: withOpacity("--primary-foreground"),
        },
        secondary: {
          DEFAULT: withOpacity("--secondary"),
          foreground: withOpacity("--secondary-foreground"),
        },
        destructive: {
          DEFAULT: withOpacity("--destructive"),
          foreground: withOpacity("--destructive-foreground"),
        },
        muted: {
          DEFAULT: withOpacity("--muted"),
          foreground: withOpacity("--muted-foreground"),
        },
        accent: {
          DEFAULT: withOpacity("--accent"),
          foreground: withOpacity("--accent-foreground"),
        },
        card: {
          DEFAULT: withOpacity("--card"),
          foreground: withOpacity("--card-foreground"),
        },
        popover: {
          DEFAULT: withOpacity("--popover"),
          foreground: withOpacity("--popover-foreground"),
        },
        "area-health": withOpacity("--area-health"),
        "area-career": withOpacity("--area-career"),
        "area-spirit": withOpacity("--area-spirit"),
        "area-social": withOpacity("--area-social"),
        "area-learning": withOpacity("--area-learning"),
        "area-creative": withOpacity("--area-creative"),
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
};
