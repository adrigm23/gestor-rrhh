import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

type ProgressBarProps = {
  // 0-100. Valores fuera de rango se recortan (una jornada por encima del
  // 100% de progreso, por ejemplo, no debe desbordar la barra).
  progress: number;
  color: string;
  trackColor?: string;
  height?: number;
};

export function ProgressBar({ progress, color, trackColor, height = 8 }: ProgressBarProps) {
  const theme = useTheme();
  const pct = Math.max(0, Math.min(100, progress));

  return (
    <View
      style={[
        styles.track,
        { height, borderRadius: height / 2, backgroundColor: trackColor ?? theme.neutralIconBg },
      ]}>
      <View
        style={[
          styles.fill,
          { width: `${pct}%`, height, borderRadius: height / 2, backgroundColor: color },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {},
});
