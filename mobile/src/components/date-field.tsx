import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type DateFieldProps = {
  label: string;
  value: string; // "AAAA-MM-DD", o "" si no hay selección todavía.
  onChange: (value: string) => void;
};

function toDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Selector de fecha nativo (iOS/Android). Ver date-field.web.tsx para la
// variante web: @react-native-community/datetimepicker no tiene soporte
// nativo de plataforma web, así que ahí se usa un <input type="date"> HTML.
export function DateField({ label, value, onChange }: DateFieldProps) {
  const theme = useTheme();
  const [showPicker, setShowPicker] = useState(false);
  const dateValue = value ? new Date(`${value}T00:00:00`) : new Date();

  const handleChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowPicker(false);
    if (event.type === 'set' && selectedDate) {
      onChange(toDateOnly(selectedDate));
    }
  };

  return (
    <View style={styles.field}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <Pressable
        onPress={() => setShowPicker(true)}
        style={[styles.input, { borderColor: theme.cardBorder }]}>
        <ThemedText style={{ color: value ? theme.text : theme.textMuted }}>
          {value || 'Selecciona una fecha'}
        </ThemedText>
      </Pressable>
      {showPicker && (
        <DateTimePicker value={dateValue} mode="date" display="default" onChange={handleChange} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.half,
  },
  input: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
});
