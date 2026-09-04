import { AlertTriangle, Coffee, LogOut, Play } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/card';
import { IconTile } from '@/components/ui/icon-tile';
import { StatusBadge } from '@/components/ui/status-badge';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, SoraFonts, Spacing, glowShadow } from '@/constants/theme';
import { formatElapsed, useElapsedMs } from '@/hooks/use-elapsed-time';
import { useFichajeStatus } from '@/hooks/use-fichaje-status';
import { useModificacionesFichaje } from '@/hooks/use-modificaciones-fichaje';
import { useRespondModificacion } from '@/hooks/use-respond-modificacion';
import { useToggleFichaje } from '@/hooks/use-toggle-fichaje';
import { useTogglePausa } from '@/hooks/use-toggle-pausa';
import { useTheme } from '@/hooks/use-theme';
import { useOfflineQueueStore } from '@/store/offline-queue-store';

const respondErrorMessages: Record<string, string> = {
  'not-found': 'No autorizado.',
  'already-responded': 'Solicitud ya respondida.',
  'no-hours-proposed': 'No hay horas propuestas.',
  'entrada-required-for-update': 'Entrada requerida para actualizar fichaje.',
  'entrada-required-for-create': 'Entrada requerida para crear fichaje.',
  'invalid-range': 'La salida debe ser posterior a la entrada.',
  overlap: 'El rango se solapa con otro fichaje.',
};

function formatDateTime(iso: string | null): string {
  if (!iso) return 'Sin dato';
  return new Intl.DateTimeFormat('es-ES', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));
}

export default function HomeScreen() {
  const theme = useTheme();
  const { data: status, isLoading, isError, refetch, isRefetching } = useFichajeStatus();
  const toggleFichajeMutation = useToggleFichaje();
  const togglePausaMutation = useTogglePausa();
  const pendingCount = useOfflineQueueStore((state) => state.pendingCount);
  const { data: modificaciones } = useModificacionesFichaje();
  const respondModificacion = useRespondModificacion();
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [modFeedback, setModFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleRespond = (id: string, accion: 'ACEPTADA' | 'RECHAZADA') => {
    setRespondingId(id);
    setModFeedback(null);
    respondModificacion.mutate(
      { id, accion },
      {
        onSuccess: (result) => {
          setRespondingId(null);
          if (result.outcome === 'ok') {
            setModFeedback({
              type: 'success',
              message: accion === 'RECHAZADA' ? 'Solicitud rechazada.' : 'Solicitud aplicada.',
            });
          } else {
            setModFeedback({
              type: 'error',
              message: respondErrorMessages[result.outcome] ?? 'No se pudo procesar la solicitud.',
            });
          }
        },
        onError: () => {
          setRespondingId(null);
          setModFeedback({ type: 'error', message: 'No se pudo procesar la solicitud.' });
        },
      },
    );
  };

  const jornadaActiva = !!status?.shift;
  const pausaActiva = !!status?.pause;
  const isOnLeave = !!status?.blockedByLeave;

  const elapsedMs = useElapsedMs(
    status?.shift?.entrada ?? null,
    status?.pause?.entrada ?? null,
    status?.pauseAccumulatedMs ?? 0,
  );

  if (isLoading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator color={theme.primary} />
      </ThemedView>
    );
  }

  if (isError || !status) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText type="small" themeColor="textMuted" style={styles.centeredText}>
          No se pudo cargar el estado del fichaje.
        </ThemedText>
        <Pressable onPress={() => refetch()} style={styles.retryButton}>
          <ThemedText type="small" style={{ color: theme.primary }}>
            {isRefetching ? 'Reintentando...' : 'Reintentar'}
          </ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  const accionLabel = jornadaActiva ? 'Finalizar Jornada' : 'Registrar Entrada';
  const accionHelper = jornadaActiva ? 'Registrar Salida' : 'Iniciar Jornada';
  const pausaLabel = pausaActiva ? 'Reanudar pausa' : 'Pausa Comida';

  const bannerTitle = jornadaActiva ? 'Jornada abierta' : 'Jornada cerrada';
  const bannerDescription = jornadaActiva
    ? 'Actualmente estas registrado como "Trabajando". No olvides registrar tu salida al finalizar el dia.'
    : 'No tienes una jornada activa. Registra tu entrada para comenzar.';
  const bannerBadge = jornadaActiva ? 'En curso' : 'Sin jornada';

  const leaveMessage =
    status.blockedByLeave === 'VACACIONES'
      ? 'Hoy tienes vacaciones aprobadas. No puedes registrar entradas ni salidas.'
      : 'Hoy tienes una ausencia aprobada. No puedes registrar entradas ni salidas.';

  const disabledActions = isOnLeave || toggleFichajeMutation.isPending || togglePausaMutation.isPending;

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View
            style={[
              styles.banner,
              {
                borderColor: jornadaActiva ? theme.warningBorder : theme.cardBorder,
                backgroundColor: jornadaActiva ? theme.warningBg : theme.backgroundElement,
              },
            ]}>
            <View style={styles.bannerLeft}>
              <IconTile
                tint={jornadaActiva ? theme.warningIconText : theme.textMuted}
                icon={<AlertTriangle size={20} color={jornadaActiva ? theme.warningIconText : theme.textMuted} />}
              />
              <View style={styles.bannerTextBlock}>
                <ThemedText type="smallBold">{bannerTitle}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {bannerDescription}
                </ThemedText>
              </View>
            </View>
            <StatusBadge
              label={bannerBadge}
              bg={jornadaActiva ? theme.warningBadgeBg : theme.neutralIconBg}
              text={jornadaActiva ? theme.warningBadgeText : theme.textSecondary}
              dot={jornadaActiva ? theme.warningDot : theme.neutralDot}
            />
          </View>

          {pendingCount > 0 && (
            <View style={[styles.leaveBanner, { backgroundColor: theme.warningBg, borderColor: theme.warningBorder }]}>
              <ThemedText type="small" style={{ color: theme.warningBadgeText }}>
                {pendingCount === 1
                  ? '1 acción pendiente de sincronizar'
                  : `${pendingCount} acciones pendientes de sincronizar`}
              </ThemedText>
            </View>
          )}

          {isOnLeave && (
            <View style={[styles.leaveBanner, { backgroundColor: theme.warningBg, borderColor: theme.warningBorder }]}>
              <ThemedText type="small" style={{ color: theme.warningBadgeText }}>
                {leaveMessage}
              </ThemedText>
            </View>
          )}

          <Card>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderText}>
                <ThemedText type="default" style={styles.cardTitle}>
                  Control de Tiempo
                </ThemedText>
                <ThemedText type="small" themeColor="textMuted">
                  Registro de actividad diaria
                </ThemedText>
              </View>
              <StatusBadge
                label={jornadaActiva ? 'Conectado' : 'Sin jornada activa'}
                bg={jornadaActiva ? theme.successBg : theme.backgroundElement}
                text={jornadaActiva ? theme.successText : theme.textMuted}
                dot={jornadaActiva ? theme.successDot : theme.neutralDot}
              />
            </View>

            <ThemedText type="small" themeColor="textMuted" style={styles.timerLabel}>
              Tiempo trabajado
            </ThemedText>
            <View style={styles.timerRow}>
              <ThemedText style={styles.timerText}>
                {formatElapsed(elapsedMs).slice(0, -3)}
              </ThemedText>
              <ThemedText style={[styles.timerText, { color: theme.accentSky }]}>
                {formatElapsed(elapsedMs).slice(-2)}
              </ThemedText>
            </View>

            <View style={styles.actions}>
              <Pressable
                onPress={() => toggleFichajeMutation.mutate(undefined)}
                disabled={disabledActions}
                style={({ pressed }) => [
                  styles.actionButton,
                  !jornadaActiva && glowShadow(theme.primary),
                  {
                    borderColor: jornadaActiva ? theme.cardBorder : 'transparent',
                    backgroundColor: jornadaActiva ? theme.backgroundElement : theme.primary,
                    opacity: disabledActions ? 0.6 : pressed ? 0.85 : 1,
                  },
                ]}>
                <IconTile
                  tint={jornadaActiva ? theme.textMuted : '#ffffff'}
                  icon={<LogOut size={20} color={jornadaActiva ? theme.textMuted : '#ffffff'} />}
                />
                <ThemedText
                  type="smallBold"
                  style={[styles.actionLabel, !jornadaActiva && { color: '#ffffff' }]}>
                  {accionLabel}
                </ThemedText>
                <ThemedText
                  type="small"
                  themeColor={jornadaActiva ? 'textMuted' : undefined}
                  style={!jornadaActiva ? styles.actionHelperLight : undefined}>
                  {accionHelper}
                </ThemedText>
              </Pressable>

              {jornadaActiva && (
                <Pressable
                  onPress={() => togglePausaMutation.mutate()}
                  disabled={disabledActions}
                  style={({ pressed }) => [
                    styles.pauseButton,
                    {
                      borderColor: theme.pauseBorder,
                      backgroundColor: theme.pauseBg,
                      opacity: disabledActions ? 0.6 : pressed ? 0.8 : 1,
                    },
                  ]}>
                  {pausaActiva ? (
                    <Play size={16} color={theme.pauseText} />
                  ) : (
                    <Coffee size={16} color={theme.pauseText} />
                  )}
                  <ThemedText type="smallBold" style={{ color: theme.pauseText }}>
                    {pausaLabel}
                  </ThemedText>
                </Pressable>
              )}
            </View>
          </Card>

          {modificaciones && modificaciones.solicitudes.length > 0 && (
            <Card>
              <View style={styles.modHeader}>
                <ThemedText type="default" style={[styles.cardTitle, styles.cardHeaderText]}>
                  Modificación de fichajes
                </ThemedText>
                <StatusBadge
                  label={`${modificaciones.solicitudes.length} pendientes`}
                  bg={theme.warningBadgeBg}
                  text={theme.warningBadgeText}
                />
              </View>

              {modFeedback && (
                <View
                  style={[
                    styles.feedbackBanner,
                    {
                      backgroundColor: modFeedback.type === 'success' ? theme.successBg : theme.errorBg,
                      borderColor: modFeedback.type === 'success' ? theme.successBorder : theme.errorBorder,
                    },
                  ]}>
                  <ThemedText
                    type="small"
                    style={{ color: modFeedback.type === 'success' ? theme.successText : theme.errorText }}>
                    {modFeedback.message}
                  </ThemedText>
                </View>
              )}

              {modificaciones.solicitudes.map((solicitud) => {
                const isRespondingThis = respondingId === solicitud.id && respondModificacion.isPending;
                return (
                  <View key={solicitud.id} style={[styles.modItem, { borderColor: theme.cardBorder }]}>
                    <ThemedText type="smallBold">{solicitud.solicitanteNombre}</ThemedText>
                    <ThemedText type="small" themeColor="textMuted">
                      {solicitud.solicitanteEmail}
                    </ThemedText>

                    <View style={styles.modProposalRow}>
                      <View style={styles.modProposalCol}>
                        <ThemedText type="small" themeColor="textMuted">
                          Fichaje actual
                        </ThemedText>
                        <ThemedText type="small">Entrada: {formatDateTime(solicitud.fichajeEntrada)}</ThemedText>
                        <ThemedText type="small">Salida: {formatDateTime(solicitud.fichajeSalida)}</ThemedText>
                      </View>
                      <View style={styles.modProposalCol}>
                        <ThemedText type="small" themeColor="textMuted">
                          Propuesta
                        </ThemedText>
                        <ThemedText type="small" style={{ color: theme.accentSky }}>
                          Entrada: {formatDateTime(solicitud.entradaPropuesta)}
                        </ThemedText>
                        <ThemedText type="small" style={{ color: theme.accentSky }}>
                          Salida: {formatDateTime(solicitud.salidaPropuesta)}
                        </ThemedText>
                      </View>
                    </View>

                    <ThemedText type="small" themeColor="textMuted" style={styles.modMotivo}>
                      {solicitud.motivo || 'Sin motivo'}
                    </ThemedText>

                    <View style={styles.modActions}>
                      <Pressable
                        onPress={() => handleRespond(solicitud.id, 'RECHAZADA')}
                        disabled={respondModificacion.isPending}
                        style={({ pressed }) => [
                          styles.modRejectButton,
                          {
                            borderColor: theme.errorBorder,
                            opacity: respondModificacion.isPending ? 0.6 : pressed ? 0.8 : 1,
                          },
                        ]}>
                        <ThemedText type="smallBold" style={{ color: theme.errorText }}>
                          Rechazar
                        </ThemedText>
                      </Pressable>
                      <Pressable
                        onPress={() => handleRespond(solicitud.id, 'ACEPTADA')}
                        disabled={respondModificacion.isPending}
                        style={({ pressed }) => [
                          styles.modAcceptButton,
                          glowShadow(theme.primary),
                          {
                            backgroundColor: pressed ? theme.primaryPressed : theme.primary,
                            opacity: respondModificacion.isPending ? 0.6 : 1,
                          },
                        ]}>
                        <ThemedText style={styles.modAcceptButtonText}>
                          {isRespondingThis ? 'Enviando...' : 'Aceptar'}
                        </ThemedText>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </Card>
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
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
  },
  centeredText: {
    textAlign: 'center',
  },
  retryButton: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  scrollContent: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: Radius.card,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    gap: Spacing.three,
  },
  bannerLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
    flex: 1,
  },
  bannerTextBlock: {
    flex: 1,
    gap: Spacing.half,
  },
  leaveBanner: {
    borderWidth: 1,
    borderRadius: Radius.card,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  // Sin flex:1 aquí, un StatusBadge con una etiqueta larga ("Sin jornada
  // activa") se sale de la tarjeta en vez de dejar que el bloque de texto
  // se encoja/envuelva — bug real visto en un dispositivo Android real
  // (Fase 2.18b).
  cardHeaderText: {
    flex: 1,
  },
  cardTitle: {
    fontFamily: SoraFonts.semiBold,
  },
  timerLabel: {
    marginTop: Spacing.four,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: Spacing.one,
  },
  timerText: {
    fontSize: 40,
    lineHeight: 46,
    fontFamily: SoraFonts.semiBold,
  },
  actions: {
    marginTop: Spacing.four,
    gap: Spacing.three,
  },
  actionButton: {
    borderWidth: 1,
    borderRadius: Radius.input,
    padding: Spacing.four,
    alignItems: 'center',
  },
  actionLabel: {
    marginTop: Spacing.two,
  },
  actionHelperLight: {
    color: 'rgba(255,255,255,0.8)',
  },
  pauseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.input,
    paddingVertical: Spacing.three,
  },
  modHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  feedbackBanner: {
    marginTop: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.input,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  modItem: {
    marginTop: Spacing.four,
    paddingTop: Spacing.four,
    borderTopWidth: 1,
    gap: Spacing.half,
  },
  modProposalRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
  modProposalCol: {
    flex: 1,
    gap: Spacing.half,
  },
  modMotivo: {
    marginTop: Spacing.two,
  },
  modActions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
  modRejectButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: Radius.input,
    paddingVertical: Spacing.two,
  },
  modAcceptButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.input,
    paddingVertical: Spacing.two,
  },
  modAcceptButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: SoraFonts.semiBold,
  },
});
