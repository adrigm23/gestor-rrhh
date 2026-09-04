import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type DateTimeFieldProps = {
  label: string;
  value: Date | null;
  onChange: (value: Date | null) => void;
};

// Selector de fecha+hora nativo (iOS/Android). Ver date-time-field.web.tsx
// para la variante web (<input type="datetime-local">).
export function DateTimeField({ label, value, onChange }: DateTimeFieldProps) {
  const theme = useTheme();
  const [showPicker, setShowPicker] = useState(false);

  const handleChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowPicker(false);
    if (event.type === 'set' && selectedDate) {
      onChange(selectedDate);
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
          {value
            ? new Intl.DateTimeFormat('es-ES', { dateStyle: 'short', timeStyle: 'short' }).format(value)
            : 'Sin cambio'}
        </ThemedText>
      </Pressable>
      {value && (
        <Pressable onPress={() => onChange(null)}>
          <ThemedText type="small" style={{ color: theme.errorText }}>
            Quitar
          </ThemedText>
        </Pressable>
      )}
      {showPicker && (
        <DateTimePicker value={value ?? new Date()} mode="datetime" display="default" onChange={handleChange} />
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
