import { StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type DateFieldProps = {
  label: string;
  value: string; // "AAAA-MM-DD", o "" si no hay selección todavía.
  onChange: (value: string) => void;
};

// Variante web: @react-native-community/datetimepicker no tiene soporte de
// plataforma web, así que aquí se usa el <input type="date"> nativo del
// navegador — mismo patrón de fecha "AAAA-MM-DD" que espera el formulario.
export function DateField({ label, value, onChange }: DateFieldProps) {
  const theme = useTheme();

  return (
    <View style={styles.field}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        style={{
          // Es un <input> HTML normal (no una View de RN), así que el
          // box model del navegador aplica de verdad: sin border-box,
          // width:100% + el padding horizontal se SUMAN por encima del
          // 100%, y el campo se sale de su columna — justo lo que se veía
          // como una "píldora" flotante solapando el campo de al lado en
          // el layout a dos columnas de Desde/Hasta en un iPhone real.
          boxSizing: 'border-box',
          width: '100%',
          borderRadius: 16,
          borderWidth: 1,
          borderStyle: 'solid',
          borderColor: theme.cardBorder,
          paddingLeft: 16,
          paddingRight: 16,
          paddingTop: 12,
          paddingBottom: 12,
          fontSize: 16,
          color: theme.text,
          backgroundColor: theme.backgroundElement,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.half,
  },
});
