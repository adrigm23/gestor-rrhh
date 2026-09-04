import { Redirect, router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/card';
import { ProgressRing } from '@/components/ui/progress-ring';
import { StatusBadge } from '@/components/ui/status-badge';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, SoraFonts, Spacing } from '@/constants/theme';
import { useEmpleados } from '@/hooks/use-modificacion-gestion';
import { useResumenHoras } from '@/hooks/use-resumen-horas';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/store/auth-store';

const tipoLabel: Record<string, string> = {
  JORNADA: 'Jornada',
  PAUSA_COMIDA: 'Pausa comida',
  DESCANSO: 'Descanso',
  MEDICO: 'Médico',
};

function formatHours(ms: number): string {
  return `${(ms / 3_600_000).toFixed(2)} h`;
}

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short' }).format(new Date(iso));
}

export default function PanelHorasScreen() {
  const theme = useTheme();
  const role = useAuthStore((state) => state.user?.role);
  const isGerente = role === 'GERENTE';

  const empleados = useEmpleados();
  const [selectedEmpleadoId, setSelectedEmpleadoId] = useState<string | null>(null);

  // Igual que la web: el gestor ve por defecto el primer empleado
  // (alfabético), no necesariamente a sí mismo.
  useEffect(() => {
    if (isGerente && !selectedEmpleadoId && empleados.data?.empleados.length) {
      setSelectedEmpleadoId(empleados.data.empleados[0].id);
    }
  }, [isGerente, selectedEmpleadoId, empleados.data]);

  const resumen = useResumenHoras(isGerente ? selectedEmpleadoId : null);

  if (role !== 'EMPLEADO' && role !== 'GERENTE') {
    return <Redirect href="/" />;
  }

  const data = resumen.data?.outcome === 'ok' ? resumen.data.data : null;

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={[styles.backButton, { borderColor: theme.cardBorder }]}>
            <ChevronLeft size={18} color={theme.text} />
          </Pressable>
          <ThemedText type="heading">Panel de horas</ThemedText>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {isGerente && (
            <Card style={styles.card}>
              <ThemedText type="default" style={styles.sectionTitle}>
                Empleado
              </ThemedText>
              {empleados.isLoading ? (
                <ActivityIndicator color={theme.primary} />
              ) : (
                <View style={styles.pickerRow}>
                  {empleados.data?.empleados.map((item) => {
                    const selected = item.id === selectedEmpleadoId;
                    return (
                      <Pressable
                        key={item.id}
                        onPress={() => setSelectedEmpleadoId(item.id)}
                        style={[
                          styles.pickerChip,
                          {
                            borderColor: selected ? theme.primary : theme.cardBorder,
                            backgroundColor: selected ? theme.primary : 'transparent',
                          },
                        ]}>
                        <ThemedText type="small" style={{ color: selected ? '#ffffff' : theme.text }}>
                          {item.nombre}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </Card>
          )}

          {resumen.isLoading && (
            <Card style={styles.card}>
              <ActivityIndicator color={theme.primary} />
            </Card>
          )}

          {resumen.data?.outcome === 'no-empresa' && (
            <Card style={styles.card}>
              <ThemedText type="small" themeColor="textMuted">
                No tienes empresa asociada.
              </ThemedText>
            </Card>
          )}

          {resumen.data?.outcome === 'empleado-not-found' && (
            <Card style={styles.card}>
              <ThemedText type="small" themeColor="textMuted">
                Empleado no encontrado.
              </ThemedText>
            </Card>
          )}

          {data && (
            <>
              <Card style={styles.card}>
                <ThemedText type="small" themeColor="textMuted">
                  {data.empresaNombre ?? 'Empresa'}
                </ThemedText>
                <ThemedText type="default" style={styles.sectionTitle}>
                  {data.empleadoNombre}
                </ThemedText>
                <ThemedText type="small" themeColor="textMuted">
                  {data.empleadoEmail}
                </ThemedText>
                <ThemedText type="small" themeColor="textMuted" style={styles.rangeLabel}>
                  {formatDate(data.rangeStart)} - {formatDate(data.rangeEnd)}
                </ThemedText>
                <View style={[styles.pausaBanner, { backgroundColor: theme.background }]}>
                  <ThemedText type="small" themeColor="textMuted">
                    {data.pausaCuentaComoTrabajo
                      ? 'La pausa cuenta como tiempo trabajado'
                      : 'La pausa NO cuenta como tiempo trabajado'}
                  </ThemedText>
                </View>
              </Card>

              {data.progresoPercent !== null ? (
                <Card style={styles.progressCard}>
                  <ProgressRing progress={data.progresoPercent} color={theme.primary} size={104} strokeWidth={10}>
                    <ThemedText type="heading" style={styles.ringValue}>
                      {data.progresoPercent.toFixed(0)}%
                    </ThemedText>
                  </ProgressRing>
                  <View style={styles.progressMetrics}>
                    <ThemedText type="small" themeColor="textMuted">
                      Progreso de la semana
                    </ThemedText>
                    <ThemedText type="heading" style={styles.metricValue}>
                      {formatHours(data.totalMs)}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textMuted">
                      de{' '}
                      {data.contratoHorasSemanales ? `${data.contratoHorasSemanales.toFixed(2)} h` : 'contrato sin definir'}
                      {' '}semanales
                    </ThemedText>
                  </View>
                </Card>
              ) : (
                <View style={styles.metricsRow}>
                  <Card style={[styles.card, styles.metricCard]}>
                    <ThemedText type="small" themeColor="textMuted">
                      Horas trabajadas
                    </ThemedText>
                    <ThemedText type="heading" style={styles.metricValue}>
                      {formatHours(data.totalMs)}
                    </ThemedText>
                  </Card>
                  <Card style={[styles.card, styles.metricCard]}>
                    <ThemedText type="small" themeColor="textMuted">
                      Contrato semanal
                    </ThemedText>
                    <ThemedText type="heading" style={styles.metricValue}>
                      Sin contrato
                    </ThemedText>
                  </Card>
                </View>
              )}

              <Card style={styles.card}>
                <View style={styles.sectionHeader}>
                  <ThemedText type="default" style={[styles.sectionTitle, styles.sectionTitleFlex]}>
                    Fichajes del tramo
                  </ThemedText>
                  <ThemedText type="small" themeColor="textMuted">
                    {data.fichajes.length} registros
                  </ThemedText>
                </View>

                {data.fichajes.length === 0 && (
                  <ThemedText type="small" themeColor="textMuted" style={styles.emptyText}>
                    No hay fichajes en el periodo seleccionado.
                  </ThemedText>
                )}

                {data.fichajes.map((item) => (
                  <View key={item.id} style={[styles.fichajeRow, { borderColor: theme.cardBorder }]}>
                    <View style={styles.fichajeInfo}>
                      <ThemedText type="smallBold">{tipoLabel[item.tipo] ?? item.tipo}</ThemedText>
                      <ThemedText type="small" themeColor="textMuted">
                        {formatTime(item.entrada)}
                        {item.salida ? ` – ${formatTime(item.salida)}` : ' – en curso'}
                      </ThemedText>
                    </View>
                    <StatusBadge
                      label={item.salida ? 'Cerrado' : 'Abierto'}
                      bg={item.salida ? theme.successBg : theme.warningBg}
                      text={item.salida ? theme.successText : theme.warningBadgeText}
                    />
                  </View>
                ))}
              </Card>
            </>
          )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  card: {
    gap: Spacing.half,
  },
  sectionTitle: {
    fontFamily: SoraFonts.semiBold,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  sectionTitleFlex: {
    flexShrink: 1,
  },
  pickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  pickerChip: {
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  rangeLabel: {
    marginTop: Spacing.half,
  },
  pausaBanner: {
    marginTop: Spacing.two,
    borderRadius: Radius.input,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  metricCard: {
    flex: 1,
  },
  metricValue: {
    fontSize: 28,
    lineHeight: 32,
  },
  progressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
  },
  progressMetrics: {
    flex: 1,
    gap: 2,
  },
  ringValue: {
    fontSize: 22,
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: Spacing.three,
  },
  fichajeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    marginTop: Spacing.three,
    paddingTop: Spacing.three,
    gap: Spacing.two,
  },
  fichajeInfo: {
    flex: 1,
    gap: Spacing.half,
  },
});
