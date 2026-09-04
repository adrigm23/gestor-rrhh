import type { FichajeHistoryEntryDto } from '@gestor-rrhh/shared';
import { router } from 'expo-router';
import { ChevronRight, Clock3 } from 'lucide-react-native';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/card';
import { IconTile } from '@/components/ui/icon-tile';
import { StatusBadge } from '@/components/ui/status-badge';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useFichajeHistorial } from '@/hooks/use-fichaje-historial';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/store/auth-store';

const tipoLabel: Record<FichajeHistoryEntryDto['tipo'], string> = {
  JORNADA: 'Jornada',
  PAUSA_COMIDA: 'Pausa comida',
  DESCANSO: 'Descanso',
  MEDICO: 'Médico',
};

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }).format(
    new Date(iso),
  );
}

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}

function formatDuration(entradaIso: string, salidaIso: string | null): string {
  if (!salidaIso) return 'En curso';
  const diffMs = Math.max(0, new Date(salidaIso).getTime() - new Date(entradaIso).getTime());
  const totalMinutes = Math.floor(diffMs / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const padded = (value: number) => value.toString().padStart(2, '0');
  return `${padded(hours)}:${padded(minutes)} h`;
}

export default function HistorialScreen() {
  const theme = useTheme();
  const role = useAuthStore((state) => state.user?.role);
  const { data, isLoading, isError, refetch, isRefetching } = useFichajeHistorial();

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {(role === 'EMPLEADO' || role === 'GERENTE') && (
            <Pressable onPress={() => router.push('/panel-horas')}>
              <Card style={styles.panelLink}>
                <IconTile tint={theme.primary} icon={<Clock3 size={20} color={theme.primary} />} />
                <View style={styles.panelLinkText}>
                  <ThemedText type="smallBold">Panel de horas</ThemedText>
                  <ThemedText type="small" themeColor="textMuted">
                    Horas trabajadas frente al contrato esta semana.
                  </ThemedText>
                </View>
                <ChevronRight size={18} color={theme.textMuted} />
              </Card>
            </Pressable>
          )}

          <Card>
            <View style={styles.header}>
              <View style={styles.headerText}>
                <ThemedText type="heading">Historial de fichajes</ThemedText>
                <ThemedText type="small" themeColor="textMuted">
                  Tus últimos {data?.historial.length ?? 30} movimientos registrados.
                </ThemedText>
              </View>
              {isLoading ? (
                <ActivityIndicator color={theme.primary} />
              ) : (
                <Pressable onPress={() => refetch()}>
                  <ThemedText type="small" style={{ color: theme.primary }}>
                    {isRefetching ? 'Actualizando...' : 'Actualizar'}
                  </ThemedText>
                </Pressable>
              )}
            </View>

            {isError && (
              <ThemedText type="small" themeColor="textMuted" style={styles.emptyText}>
                No se pudo cargar el historial.
              </ThemedText>
            )}

            {!isLoading && !isError && (data?.historial.length ?? 0) === 0 && (
              <ThemedText type="small" themeColor="textMuted" style={styles.emptyText}>
                No hay fichajes registrados todavía.
              </ThemedText>
            )}

            {data?.historial.map((item) => (
              <View key={item.id} style={[styles.row, { borderColor: theme.cardBorder }]}>
                <View style={styles.rowInfo}>
                  <View style={styles.rowTitleLine}>
                    <ThemedText type="smallBold">{tipoLabel[item.tipo]}</ThemedText>
                    {item.editado && (
                      <StatusBadge label="Editado" bg={theme.neutralIconBg} text={theme.textMuted} />
                    )}
                  </View>
                  <ThemedText type="small" themeColor="textMuted">
                    {formatDate(item.entrada)} · {formatTime(item.entrada)}
                    {item.salida ? ` – ${formatTime(item.salida)}` : ''}
                  </ThemedText>
                </View>
                <StatusBadge
                  label={formatDuration(item.entrada, item.salida)}
                  bg={item.salida ? theme.successBg : theme.warningBg}
                  text={item.salida ? theme.successText : theme.warningBadgeText}
                />
              </View>
            ))}
          </Card>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  panelLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  panelLinkText: {
    flex: 1,
    gap: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  headerText: {
    flex: 1,
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: Spacing.four,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    borderTopWidth: 1,
    marginTop: Spacing.three,
    paddingTop: Spacing.three,
  },
  rowInfo: {
    flex: 1,
    gap: Spacing.half,
  },
  rowTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
});
