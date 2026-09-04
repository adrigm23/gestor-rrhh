import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius } from '@/constants/theme';

type StatusBadgeProps = {
  label: string;
  // Colores ya resueltos (theme.successBg, etc.), no claves — así el
  // llamador puede seguir usando sus propios mapas estado→color sin que
  // este componente conozca los estados de cada dominio.
  bg: string;
  text: string;
  dot?: string;
};

/**
 * Badge de estado con punto de color + texto, reemplaza el patrón
 * `[styles.badge, {backgroundColor: theme[colors.bg]}]` repetido en cada
 * pantalla que lista solicitudes/fichajes/empleados (Fase 2.18).
 */
export function StatusBadge({ label, bg, text, dot }: StatusBadgeProps) {
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      {dot && <View style={[styles.dot, { backgroundColor: dot }]} />}
      <ThemedText type="small" style={{ color: text }}>
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
