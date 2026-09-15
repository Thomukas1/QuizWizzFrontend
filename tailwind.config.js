/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Spacing scale matching design system
      spacing: {
        'xs': '4px',
        'sm': '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '20px',
        '2xl': '24px',
        '3xl': '32px',
        '4xl': '48px',
      },

      // Colors — white/black are raw hex so opacity modifiers (bg-black/70, border-white/10) work.
      // All other colors reference CSS vars in theme.css (the single source of truth).
      // To retheme: change the --p-* palette values in theme.css; these names never change.
      colors: {
        'white': '#FFFFFF',
        'black': '#051648',       // Deep Navy — raw hex for opacity modifier support

        // Brand & accent (semantic names, not color names)
        'brand': 'var(--brand)',           // Persian Blue — interactive elements
        'accent': 'var(--accent)',         // Lime Green — primary accent
        'accent-2': 'var(--accent-dim)',   // Yellow Green — secondary accent / hover

        // Text. These are TEXT tokens — `bg-muted` or `bg-primary` would paint a
        // background in a text colour, which is never what you want; backgrounds
        // are `surface`/`surface-2`/`input` below.
        'primary': 'var(--text-primary)',  // Alabaster Grey — body text
        'muted': 'var(--text-muted)',      // Cool Steel — secondary text
        'soft': 'var(--text-soft)',        // Tea Green — decorative text
        'alt': 'var(--text-alt)',          // Deep Navy — text on accent backgrounds

        // Surfaces
        'surface': 'var(--bg-surface)',    // Imperial Blue — cards & panels
        'surface-2': 'var(--bg-secondary)',// Deep Navy — recessed items inside cards
        'input': 'var(--bg-input)',        // Deep Navy — input fields

        // Border — enables `border-border` class
        'border': 'var(--border-color)',
        // Divider — hairline list/section separators (enables `border-divider`)
        'divider': 'var(--divider)',

        // States
        'danger': 'var(--color-error)',    // Coral Red — errors & SLOP
        'success': 'var(--color-success)', // Lime Green — success & BOP
        'warning': 'var(--color-warning)', // Amber — warnings
      },

      // Font families
      fontFamily: {
        'display': ["'Xirod'", 'sans-serif'],
        'body': ["'Masicu'", '-apple-system', 'BlinkMacSystemFont', "'Segoe UI'", "'Roboto'", 'sans-serif'],
      },

      // Font sizes
      fontSize: {
        'xs': '12px',
        'sm': '14px',
        'base': '16px',
        'lg': '20px',
        'xl': '24px',
        '2xl': '28px',
        '3xl': '40px',
      },

      // Font weights
      fontWeight: {
        'normal': '400',
        'medium': '500',
        'semibold': '600',
        'bold': '700',
        'extrabold': '800',
      },

      // Shadows
      boxShadow: {
        'sm': '0 2px 4px rgba(0, 0, 0, 0.2)',
        'md': '0 4px 8px rgba(0, 0, 0, 0.3)',
        'lg': '0 8px 16px rgba(0, 0, 0, 0.4)',
        'xl': '0 12px 24px rgba(0, 0, 0, 0.5)',
      },

      // Border radius
      borderRadius: {
        'sm': '4px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        'full': '50%',
      },

      // Max widths
      maxWidth: {
        'player': '320px',
      },

      // Z-index
      zIndex: {
        'dropdown': '100',
        'sticky': '200',
        'fixed': '300',
        'modal-backdrop': '500',
        'modal': '1000',
        'tooltip': '1100',
        'notification': '1200',
      },

      // Transitions
      transitionDuration: {
        'fast': '150ms',
        'base': '200ms',
        'slow': '300ms',
      },

      // Border widths
      borderWidth: {
        'xs': '1px',
        'sm': '2px',
        'md': '4px',
        'lg': '6px',
      },
    },
  },
  plugins: [],
}
