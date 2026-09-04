import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, cardShadow } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type SegmentedControlProps<T extends string> = {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
};

/**
 * Selector de pestañas tipo píldora (fondo neutro, pestaña activa en
 * blanco/superficie con sombra) — reemplaza el patrón `tabSwitch`/
 * `tabButton` que Solicitudes, Calendario y Organización repetían cada
 * uno a su manera (Fase 2.18).
 */
export function SegmentedControl<T extends string>({ options, value, onChange }: SegmentedControlProps<T>) {
  const theme = useTheme();

  return (
    // `neutralIconBg`/`warningBg`/etc. se dejan deliberadamente sin variante
    // oscura (replican el mismo comportamiento de la web, ver theme.ts) —
    // correcto para chips pequeños como StatusBadge, pero aquí el track
    // ocupa todo el ancho: con neutralIconBg se veía como un bloque casi
    // blanco enorme en dark mode. `background` sí tiene variante oscura y
    // es un pelín más oscuro que `card`, así que el segmento activo (card +
    // sombra) queda "elevado" sobre un surco recesado, en ambos temas.
    <View style={[styles.track, { backgroundColor: theme.background }]}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[
              styles.segment,
              active && [{ backgroundColor: theme.card, borderRadius: Radius.pill }, cardShadow()],
            ]}>
            <ThemedText type="smallBold" style={{ color: active ? theme.text : theme.textMuted }}>
              {option.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    borderRadius: Radius.pill,
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
  },
});
