import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { SoraFonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { withOpacity } from '@/utils/color';

type AvatarProps = {
  name: string;
  size?: number;
};

// Paleta cíclica para el color de fondo del avatar — determinista por
// nombre (mismo nombre siempre cae en el mismo color, no aleatorio en cada
// render). Solo tonos ya presentes en el theme, ninguno nuevo salvo el
// morado añadido en esta misma fase.
function pickTone(name: string, tones: string[]): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return tones[hash % tones.length];
}

// Iniciales: primera letra + primera letra de la última palabra (formato
// habitual "Nombre Apellido"/"Nombre Apellido1 Apellido2"). Con una sola
// palabra (o datos de prueba tipo "__TEST_X__"), usa los dos primeros
// caracteres alfabéticos que encuentre.
function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
  }
  const letters = name.replace(/[^\p{L}]/gu, '');
  return (letters.slice(0, 2) || name.slice(0, 2) || '?').toUpperCase();
}

/**
 * Avatar de iniciales — sustituye las filas de solo-texto en las listas de
 * personas (Directorio de empleados, ficha de empleado) por un círculo de
 * color con las iniciales, como en la propuesta de Stitch. No hay foto real
 * en el modelo de datos, así que siempre son iniciales, nunca una imagen.
 */
export function Avatar({ name, size = 40 }: AvatarProps) {
  const theme = useTheme();
  const tone = pickTone(name, [theme.primary, theme.accentSky, theme.accentViolet, theme.warningDot, theme.pauseText]);

  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: withOpacity(tone, 0.16) },
      ]}>
      <ThemedText style={{ color: tone, fontFamily: SoraFonts.semiBold, fontSize: size * 0.38 }}>
        {getInitials(name)}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
