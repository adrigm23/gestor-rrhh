import { StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type DateTimeFieldProps = {
  label: string;
  value: Date | null;
  onChange: (value: Date | null) => void;
};

function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// Variante web: @react-native-community/datetimepicker no tiene soporte de
// plataforma web, así que aquí se usa el <input type="datetime-local">
// nativo del navegador.
export function DateTimeField({ label, value, onChange }: DateTimeFieldProps) {
  const theme = useTheme();

  return (
    <View style={styles.field}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <input
        type="datetime-local"
        value={value ? toLocalInputValue(value) : ''}
        onChange={(event) => onChange(event.target.value ? new Date(event.target.value) : null)}
        style={{
          // Mismo fix que date-field.web.tsx: sin border-box, el padding se
          // suma por encima del 100% y el campo se sale de su contenedor.
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
