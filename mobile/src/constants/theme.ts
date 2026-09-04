/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

// Tokens replicados literalmente de src/app/globals.css (web) — misma marca,
// mismos valores exactos, no una reinterpretación. El teal del CTA usa
// #14b8a6 (Tailwind `teal-500`, el color que el usuario ve hoy en /login),
// no `--brand-500` (#0f8f8f) — decisión explícita: replicar la experiencia
// visual real de la web, no la escala de marca declarada pero no usada.
export const Colors = {
  light: {
    text: '#0f172a',
    textSecondary: '#475569',
    textMuted: '#94a3b8',
    background: '#f4f6fb',
    backgroundElement: '#f8fafc',
    backgroundSelected: '#eef2f7',
    card: '#ffffff',
    cardBorder: '#e2e8f0',
    primary: '#14b8a6',
    primaryPressed: '#0d9488',
    focusBorder: '#bae6fd',
    errorBg: '#fff1f2',
    errorBorder: '#fecdd3',
    errorText: '#e11d48',
    // Estados del widget "Control de Tiempo" (dashboard/page.tsx en web) —
    // mismos valores Tailwind (amber/orange/emerald/sky), no sobrescritos
    // para modo oscuro en globals.css tampoco, así que se replican iguales
    // en ambos temas aquí.
    accentSky: '#0ea5e9',
    // Morado/violeta (Fase 2.18b): no existe en la web (globals.css no lo
    // declara), lo introducimos solo en mobile para distinguir categorías
    // que hoy comparten el teal sin necesidad (p.ej. "Vacaciones" en el
    // calendario, o un módulo más de Gestión) — mismo valor en ambos temas,
    // igual que accentSky.
    accentViolet: '#8b5cf6',
    warningBg: '#fffbeb',
    warningBorder: '#fde68a',
    warningIconBg: '#fef3c7',
    warningIconText: '#d97706',
    warningBadgeBg: '#fef3c7',
    warningBadgeText: '#b45309',
    warningDot: '#f59e0b',
    successBg: '#ecfdf5',
    successBorder: '#a7f3d0',
    successText: '#047857',
    successDot: '#10b981',
    pauseBg: '#fff7ed',
    pauseBorder: '#fed7aa',
    pauseText: '#ea580c',
    neutralIconBg: '#f1f5f9',
    neutralDot: '#cbd5e1',
  },
  dark: {
    text: '#f8fafc',
    textSecondary: '#cbd5f5',
    textMuted: '#94a3b8',
    background: '#0b1220',
    backgroundElement: '#111827',
    backgroundSelected: '#0b1220',
    card: '#0f172a',
    cardBorder: 'rgba(148, 163, 184, 0.18)',
    primary: '#14b8a6',
    primaryPressed: '#0d9488',
    focusBorder: '#bae6fd',
    // El banner de error web no está sobrescrito para modo oscuro en
    // globals.css (solo .bg-white/.bg-slate-*/.text-slate-* lo están) —
    // se replica ese mismo comportamiento tal cual, sin "corregirlo".
    errorBg: '#fff1f2',
    errorBorder: '#fecdd3',
    errorText: '#e11d48',
    accentSky: '#0ea5e9',
    accentViolet: '#8b5cf6',
    warningBg: '#fffbeb',
    warningBorder: '#fde68a',
    warningIconBg: '#fef3c7',
    warningIconText: '#d97706',
    warningBadgeBg: '#fef3c7',
    warningBadgeText: '#b45309',
    warningDot: '#f59e0b',
    successBg: '#ecfdf5',
    successBorder: '#a7f3d0',
    successText: '#047857',
    successDot: '#10b981',
    pauseBg: '#fff7ed',
    pauseBorder: '#fed7aa',
    pauseText: '#ea580c',
    neutralIconBg: '#f1f5f9',
    neutralDot: '#cbd5e1',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

// Nombres de familia tal como los exporta @expo-google-fonts/sora — cada
// peso es una familia de fuente registrada por separado (no un único "Sora"
// con fontWeight variable), así que el mapeo peso→familia vive aquí.
export const SoraFonts = {
  light: 'Sora_300Light',
  regular: 'Sora_400Regular',
  medium: 'Sora_500Medium',
  semiBold: 'Sora_600SemiBold',
  bold: 'Sora_700Bold',
} as const;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

// Escala de radios del rediseño "soft UI" (Fase 2.18): tarjeta principal
// muy redondeada (40px, como el login ya tenía), tarjeta anidada 24px,
// input/botón 16px, píldora completa para badges/tabs/chips.
export const Radius = {
  card: 32,
  cardLarge: 40,
  input: 16,
  pill: 999,
  tile: 14,
} as const;

// Sombra suave reutilizable, aproximación RN de --shadow-card de la web
// (0 24px 80px rgba(15,23,42,.12)) — antes cada pantalla la copiaba a
// mano; ahora vive en un solo sitio. `glow` es la variante para CTAs
// (sombra teñida del color de marca, como shadow-teal-200/60 en la web).
export function cardShadow(colorHex = '#0f172a') {
  return {
    shadowColor: colorHex,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 6,
  } as const;
}

export function glowShadow(colorHex: string) {
  return {
    shadowColor: colorHex,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  } as const;
}

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
