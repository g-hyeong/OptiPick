/**
 * OptiPick 디자인 시스템 테마
 * 미드센추리 모던 스타일의 차분하고 따뜻한 컬러 팔레트
 */

export const colors = {
  // Primary - 따뜻한 베이지/탠
  primary: {
    50: "#f5f3f0",
    100: "#ebe6df",
    200: "#d6cdbd",
    300: "#c2b49c",
    400: "#ad9b7a",
    500: "#998259",
    600: "#7a6847",
    700: "#5c4e35",
    800: "#3d3424",
    900: "#1f1a12",
  },
  // Accent - 차분한 올리브 그린
  accent: {
    50: "#f0f4f3",
    100: "#e0e9e7",
    200: "#c1d3cf",
    300: "#a2bdb7",
    400: "#83a79f",
    500: "#649187",
    600: "#50746c",
    700: "#3c5751",
    800: "#283a36",
    900: "#141d1b",
  },
  // Warm - 따뜻한 크림
  warm: {
    50: "#faf8f5",
    100: "#f5f1eb",
    200: "#ebe3d7",
    300: "#e0d5c3",
    400: "#d6c7af",
    500: "#ccb99b",
    600: "#a3947c",
    700: "#7a6f5d",
    800: "#524a3e",
    900: "#29251f",
  },
  // System colors
  success: "#7cb342",
  warning: "#ffa726",
  error: "#e53935",
  info: "#42a5f5",
} as const;

export const spacing = {
  xs: "0.25rem", // 4px
  sm: "0.5rem", // 8px
  md: "0.75rem", // 12px
  lg: "1rem", // 16px
  xl: "1.5rem", // 24px
  "2xl": "2rem", // 32px
  "3xl": "3rem", // 48px
  "4xl": "4rem", // 64px
} as const;

export const borderRadius = {
  sm: "0.25rem", // 4px
  base: "0.375rem", // 6px
  md: "0.5rem", // 8px
  lg: "0.75rem", // 12px
  xl: "1rem", // 16px
  "2xl": "1.5rem", // 24px
  full: "9999px",
} as const;

export const typography = {
  fontFamily: {
    sans: [
      "-apple-system",
      "BlinkMacSystemFont",
      '"SF Pro Display"',
      '"Segoe UI"',
      "Roboto",
      "sans-serif",
    ].join(", "),
  },
  fontSize: {
    xs: { size: "0.75rem", lineHeight: "1rem" }, // 12px
    sm: { size: "0.875rem", lineHeight: "1.25rem" }, // 14px
    base: { size: "1rem", lineHeight: "1.5rem" }, // 16px
    lg: { size: "1.125rem", lineHeight: "1.75rem" }, // 18px
    xl: { size: "1.25rem", lineHeight: "1.75rem" }, // 20px
    "2xl": { size: "1.5rem", lineHeight: "2rem" }, // 24px
    "3xl": { size: "1.875rem", lineHeight: "2.25rem" }, // 30px
    "4xl": { size: "2.25rem", lineHeight: "2.5rem" }, // 36px
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
} as const;

export const shadows = {
  sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
  base: "0 2px 4px 0 rgba(0, 0, 0, 0.08)",
  md: "0 4px 8px 0 rgba(0, 0, 0, 0.1)",
  lg: "0 8px 16px 0 rgba(0, 0, 0, 0.12)",
  xl: "0 12px 24px 0 rgba(0, 0, 0, 0.15)",
  inner: "inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)",
} as const;

export const transitions = {
  fast: "150ms",
  base: "200ms",
  slow: "300ms",
  slower: "500ms",
} as const;

export const zIndex = {
  base: 0,
  dropdown: 10,
  sticky: 20,
  fixed: 30,
  modalBackdrop: 40,
  modal: 50,
  popover: 60,
  tooltip: 70,
} as const;

/**
 * 테마 타입 정의
 */
export type Theme = {
  colors: typeof colors;
  spacing: typeof spacing;
  borderRadius: typeof borderRadius;
  typography: typeof typography;
  shadows: typeof shadows;
  transitions: typeof transitions;
  zIndex: typeof zIndex;
};

/**
 * 전체 테마 객체
 */
export const theme: Theme = {
  colors,
  spacing,
  borderRadius,
  typography,
  shadows,
  transitions,
  zIndex,
};

export default theme;
