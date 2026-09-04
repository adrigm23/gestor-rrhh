import type { SolicitudManagerDto, UpdateSolicitudEstadoResponse } from '@gestor-rrhh/shared';
import { Redirect, router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, SoraFonts, Spacing, glowShadow, type ThemeColor } from '@/constants/theme';
import { useSolicitudesHistorialGestion, useSolicitudesPendientes, useUpdateSolicitudEstado } from '@/hooks/use-solicitudes-gestion';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/store/auth-store';

type Feedback = { type: 'success' | 'error'; message: string };

const estadoLabel: Record<SolicitudManagerDto['estado'], string> = {
  PENDIENTE: 'Pendiente',
  APROBADA: 'Aprobada',
  RECHAZADA: 'Rechazada',
  ANULADA: 'Anulada',
};

const estadoColors: Record<SolicitudManagerDto['estado'], { bg: ThemeColor; border: ThemeColor; text: ThemeColor }> = {
  PENDIENTE: { bg: 'warningBg', border: 'warningBorder', text: 'warningBadgeText' },
  APROBADA: { bg: 'successBg', border: 'successBorder', text: 'successText' },
  RECHAZADA: { bg: 'errorBg', border: 'errorBorder', text: 'errorText' },
  ANULADA: { bg: 'neutralIconBg', border: 'cardBorder', text: 'textMuted' },
};

const errorMessages: Record<string, string> = {
  'not-found': 'Solicitud no encontrada.',
  unauthorized: 'No autorizado.',
  'cannot-cancel-pending': 'No se puede anular una solicitud pendiente.',
  'invalid-transition': 'Transición de estado no permitida.',
  overlap: 'Ya existe una solicitud aprobada que se solapa con esas fechas.',
};

function formatRange(inicio: string, fin: string | null): string {
  const formatter = new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short' });
  const start = formatter.format(new Date(inicio));
  const end = fin ? formatter.format(new Date(fin)) : start;
  return start === end ? start : `${start} - ${end}`;
}

function tipoLabel(item: SolicitudManagerDto): string {
  if (item.tipo === 'VACACIONES') return 'Vacaciones';
  return item.ausenciaTipo === 'FALTA' ? 'Falta' : 'Aviso';
}

export default function AprobarSolicitudesScreen() {
  const theme = useTheme();
  const role = useAuthStore((state) => state.user?.role);
  const pendientes = useSolicitudesPendientes();
  const historico = useSolicitudesHistorialGestion();
  const updateEstado = useUpdateSolicitudEstado();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  // Igual que gestion.tsx: los endpoints ya rechazan a EMPLEADO (401), pero
  // esta guarda evita que la pantalla intente renderizarse igualmente si se
  // llega por URL directa (web).
  if (role !== 'GERENTE' && role !== 'ADMIN_SISTEMA') {
    return <Redirect href="/" />;
  }

  const handleUpdate = (id: string, estado: 'APROBADA' | 'RECHAZADA' | 'ANULADA') => {
    setPendingId(id);
    setFeedback(null);
    updateEstado.mutate(
      { id, estado },
      {
        onSuccess: (result: UpdateSolicitudEstadoResponse) => {
          setPendingId(null);
          if (result.outcome === 'ok') {
            const messages = { APROBADA: 'Solicitud aprobada.', RECHAZADA: 'Solicitud rechazada.', ANULADA: 'Solicitud anulada.' };
            setFeedback({ type: 'success', message: messages[estado] });
          } else {
            setFeedback({ type: 'error', message: errorMessages[result.outcome] ?? 'No se pudo actualizar la solicitud.' });
          }
        },
        onError: () => {
          setPendingId(null);
          setFeedback({ type: 'error', message: 'No se pudo actualizar la solicitud.' });
        },
      },
    );
  };

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={[styles.backButton, { borderColor: theme.cardBorder }]}>
            <ChevronLeft size={18} color={theme.text} />
          </Pressable>
          <ThemedText type="heading">Aprobar solicitudes</ThemedText>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {feedback && (
            <View
              style={[
                styles.feedbackBanner,
                {
                  backgroundColor: feedback.type === 'success' ? theme.successBg : theme.errorBg,
                  borderColor: feedback.type === 'success' ? theme.successBorder : theme.errorBorder,
                },
              ]}>
              <ThemedText type="small" style={{ color: feedback.type === 'success' ? theme.successText : theme.errorText }}>
                {feedback.message}
              </ThemedText>
            </View>
          )}

          <Card>
            <View style={styles.sectionHeader}>
              <ThemedText type="default" style={styles.sectionTitle}>
                Pendientes
              </ThemedText>
              {pendientes.isLoading ? (
                <ActivityIndicator color={theme.primary} />
              ) : (
                <StatusBadge
                  label={String(pendientes.data?.solicitudes.length ?? 0)}
                  bg={theme.warningBadgeBg}
                  text={theme.warningBadgeText}
                />
              )}
            </View>

            {!pendientes.isLoading && (pendientes.data?.solicitudes.length ?? 0) === 0 && (
              <ThemedText type="small" themeColor="textMuted" style={styles.emptyText}>
                No hay solicitudes pendientes.
              </ThemedText>
            )}

            {pendientes.data?.solicitudes.map((item) => (
              <View key={item.id} style={[styles.item, { borderColor: theme.cardBorder }]}>
                <View style={styles.itemHeader}>
                  <Avatar name={item.usuarioNombre} size={36} />
                  <View style={styles.itemHeaderText}>
                    <ThemedText type="smallBold" numberOfLines={1}>
                      {item.usuarioNombre}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textMuted" numberOfLines={1}>
                      {item.usuarioEmail}
                    </ThemedText>
                  </View>
                </View>
                <ThemedText type="small" style={styles.itemDetail}>
                  {tipoLabel(item)} · {formatRange(item.inicio, item.fin)}
                </ThemedText>
                {item.motivo && (
                  <ThemedText type="small" themeColor="textMuted">
                    {item.motivo}
                  </ThemedText>
                )}
                <View style={styles.actions}>
                  <Pressable
                    onPress={() => handleUpdate(item.id, 'RECHAZADA')}
                    disabled={updateEstado.isPending}
                    style={({ pressed }) => [
                      styles.rejectButton,
                      { borderColor: theme.errorBorder, opacity: updateEstado.isPending ? 0.6 : pressed ? 0.8 : 1 },
                    ]}>
                    <ThemedText type="smallBold" style={{ color: theme.errorText }}>
                      Rechazar
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    onPress={() => handleUpdate(item.id, 'APROBADA')}
                    disabled={updateEstado.isPending}
                    style={({ pressed }) => [
                      styles.acceptButton,
                      glowShadow(theme.primary),
                      { backgroundColor: pressed ? theme.primaryPressed : theme.primary, opacity: updateEstado.isPending ? 0.6 : 1 },
                    ]}>
                    <ThemedText style={styles.acceptButtonText}>
                      {pendingId === item.id && updateEstado.isPending ? 'Enviando...' : 'Aprobar'}
                    </ThemedText>
                  </Pressable>
                </View>
              </View>
            ))}
          </Card>

          <Card>
            <ThemedText type="default" style={styles.sectionTitle}>
              Histórico reciente
            </ThemedText>

            {!historico.isLoading && (historico.data?.solicitudes.length ?? 0) === 0 && (
              <ThemedText type="small" themeColor="textMuted" style={styles.emptyText}>
                No hay solicitudes recientes.
              </ThemedText>
            )}

            {historico.data?.solicitudes.map((item) => {
              const colors = estadoColors[item.estado];
              return (
                <View key={item.id} style={[styles.item, { borderColor: theme.cardBorder }]}>
                  <View style={styles.historyRow}>
                    <Avatar name={item.usuarioNombre} size={36} />
                    <View style={styles.historyInfo}>
                      <ThemedText type="smallBold">{item.usuarioNombre}</ThemedText>
                      <ThemedText type="small" themeColor="textMuted">
                        {tipoLabel(item)} · {formatRange(item.inicio, item.fin)}
                      </ThemedText>
                    </View>
                    <StatusBadge label={estadoLabel[item.estado]} bg={theme[colors.bg]} text={theme[colors.text]} />
                  </View>
                  {item.estado === 'APROBADA' && (
                    <Pressable
                      onPress={() => handleUpdate(item.id, 'ANULADA')}
                      disabled={updateEstado.isPending}
                      style={({ pressed }) => [
                        styles.cancelButton,
                        { borderColor: theme.cardBorder, opacity: updateEstado.isPending ? 0.6 : pressed ? 0.8 : 1 },
                      ]}>
                      <ThemedText type="small" themeColor="textSecondary">
                        Anular
                      </ThemedText>
                    </Pressable>
                  )}
                </View>
              );
            })}
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
  feedbackBanner: {
    borderWidth: 1,
    borderRadius: Radius.input,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontFamily: SoraFonts.semiBold,
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: Spacing.three,
  },
  item: {
    marginTop: Spacing.three,
    paddingTop: Spacing.three,
    borderTopWidth: 1,
    gap: Spacing.half,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  itemHeaderText: {
    flex: 1,
  },
  itemDetail: {
    marginTop: Spacing.half,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  rejectButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: Radius.input,
    paddingVertical: Spacing.two,
  },
  acceptButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.input,
    paddingVertical: Spacing.two,
  },
  acceptButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: SoraFonts.semiBold,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  historyInfo: {
    flex: 1,
    gap: Spacing.half,
  },
  cancelButton: {
    alignSelf: 'flex-start',
    marginTop: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
});
