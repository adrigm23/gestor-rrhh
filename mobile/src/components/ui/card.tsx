import { View, type ViewProps } from 'react-native';

import { Radius, Spacing, cardShadow } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type CardProps = ViewProps & {
  // "large" es la tarjeta hero (login, cabecera de Home) — 40px de radio,
  // igual que --shadow-card/rounded-[2.5rem] en la web. "default" es la
  // tarjeta de contenido normal, 32px.
  size?: 'default' | 'large';
  padded?: boolean;
};

/**
 * Tarjeta base del rediseño soft-UI (Fase 2.18): fondo de superficie,
 * borde sutil, esquinas muy redondeadas y sombra suave — sustituye el
 * `[styles.card, {backgroundColor: theme.card, borderColor: theme.cardBorder}]`
 * que cada pantalla repetía a mano.
 */
export function Card({ style, size = 'default', padded = true, ...rest }: CardProps) {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: theme.card,
          borderColor: theme.cardBorder,
          borderWidth: 1,
          borderRadius: size === 'large' ? Radius.cardLarge : Radius.card,
        },
        padded && { padding: Spacing.four, gap: Spacing.two },
        cardShadow(),
        style,
      ]}
      {...rest}
    />
  );
}
