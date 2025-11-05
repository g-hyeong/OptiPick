/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,jsx,ts,tsx,html}",
  ],
  theme: {
    extend: {
      colors: {
        // 미드센추리 모던 컬러 팔레트
        primary: {
          50: '#f5f3f0',
          100: '#ebe6df',
          200: '#d6cdbd',
          300: '#c2b49c',
          400: '#ad9b7a',
          500: '#998259', // 메인 컬러 (따뜻한 베이지)
          600: '#7a6847',
          700: '#5c4e35',
          800: '#3d3424',
          900: '#1f1a12',
        },
        accent: {
          50: '#f0f4f3',
          100: '#e0e9e7',
          200: '#c1d3cf',
          300: '#a2bdb7',
          400: '#83a79f',
          500: '#649187', // 차분한 올리브 그린
          600: '#50746c',
          700: '#3c5751',
          800: '#283a36',
          900: '#141d1b',
        },
        warm: {
          50: '#faf8f5',
          100: '#f5f1eb',
          200: '#ebe3d7',
          300: '#e0d5c3',
          400: '#d6c7af',
          500: '#ccb99b', // 따뜻한 크림
          600: '#a3947c',
          700: '#7a6f5d',
          800: '#524a3e',
          900: '#29251f',
        },
        // 시스템 컬러
        success: '#7cb342',
        warning: '#ffa726',
        error: '#e53935',
        info: '#42a5f5',
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      borderRadius: {
        'sm': '0.25rem',
        'DEFAULT': '0.375rem',
        'md': '0.5rem',
        'lg': '0.75rem',
        'xl': '1rem',
        '2xl': '1.5rem',
      },
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'DEFAULT': '0 2px 4px 0 rgba(0, 0, 0, 0.08)',
        'md': '0 4px 8px 0 rgba(0, 0, 0, 0.1)',
        'lg': '0 8px 16px 0 rgba(0, 0, 0, 0.12)',
        'xl': '0 12px 24px 0 rgba(0, 0, 0, 0.15)',
        'inner': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('tailwindcss-animate'),
  ],
}
