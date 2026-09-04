import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Radius } from '@/constants/theme';
import { withOpacity } from '@/utils/color';

type IconTileProps = {
  icon: ReactNode;
  // Color base (hex) del icono — el fondo se deriva tintándolo al 14%,
  // igual que el patrón "icono en cuadrado con tinte" del diseño de
  // referencia (Fase 2.18).
  tint: string;
  size?: number;
};

export function IconTile({ icon, tint, size = 44 }: IconTileProps) {
  return (
    <View
      style={[
        styles.tile,
        { width: size, height: size, borderRadius: Radius.tile, backgroundColor: withOpacity(tint, 0.14) },
      ]}>
      {icon}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
