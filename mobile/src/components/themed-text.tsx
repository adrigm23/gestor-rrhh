import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, SoraFonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?:
    | 'default'
    | 'title'
    | 'heading'
    | 'small'
    | 'smallBold'
    | 'subtitle'
    | 'link'
    | 'linkPrimary'
    | 'code';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      style={[
        { color: theme[themeColor ?? 'text'] },
        type === 'default' && styles.default,
        type === 'title' && styles.title,
        type === 'heading' && styles.heading,
        type === 'small' && styles.small,
        type === 'smallBold' && styles.smallBold,
        type === 'subtitle' && styles.subtitle,
        type === 'link' && styles.link,
        type === 'linkPrimary' && styles.linkPrimary,
        type === 'code' && styles.code,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: SoraFonts.medium,
  },
  smallBold: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: SoraFonts.bold,
  },
  default: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: SoraFonts.medium,
  },
  title: {
    fontSize: 48,
    lineHeight: 52,
    fontFamily: SoraFonts.semiBold,
  },
  // Título de formulario/pantalla (p. ej. "Iniciar sesion") — equivalente a
  // `text-2xl font-semibold` en la web. No existía un tamaño para esto en
  // la escala original, pensada solo para la pantalla demo del scaffold.
  heading: {
    fontSize: 24,
    lineHeight: 30,
    fontFamily: SoraFonts.semiBold,
  },
  subtitle: {
    fontSize: 32,
    lineHeight: 44,
    fontFamily: SoraFonts.semiBold,
  },
  link: {
    lineHeight: 30,
    fontSize: 14,
    fontFamily: SoraFonts.regular,
  },
  linkPrimary: {
    lineHeight: 30,
    fontSize: 14,
    color: '#3c87f7',
    fontFamily: SoraFonts.regular,
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: 700 }) ?? 500,
    fontSize: 12,
  },
});
