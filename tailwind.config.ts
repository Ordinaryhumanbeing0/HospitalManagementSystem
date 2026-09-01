import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#0052ff', // Coinbase Blue
          active: '#003ecc',
          disabled: '#a8b8cc',
        },
        ink: '#0a0b0d',
        body: '#5b616e',
        'body-strong': '#0a0b0d',
        muted: '#7c828a',
        'muted-soft': '#a8acb3',
        hairline: '#dee1e6',
        'hairline-soft': '#eef0f3',
        canvas: '#ffffff',
        'surface-soft': '#f7f7f7',
        'surface-strong': '#eef0f3',
        'surface-dark': '#0a0b0d',
        'surface-dark-elevated': '#16181c',
        'semantic-up': '#05b169',
        'semantic-down': '#cf202f',
        'accent-yellow': '#f4b000',
      },
      borderRadius: {
        xl: '24px',
        pill: '100px',
      },
      fontFamily: {
        sans: ['var(--font-sans)', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'Menlo', 'Monaco', 'monospace'],
      },
      boxShadow: {
        soft: '0 4px 12px rgba(0, 0, 0, 0.04)',
        elevated: '0 12px 32px rgba(0, 0, 0, 0.08)',
      },
    },
  },
  plugins: [],
};

export default config;
