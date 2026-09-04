import type { CreateSolicitudRequest, SolicitudDto } from '@gestor-rrhh/shared';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DateField } from '@/components/date-field';
import { Card } from '@/components/ui/card';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { StatusBadge } from '@/components/ui/status-badge';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, SoraFonts, Spacing, glowShadow, type ThemeColor } from '@/constants/theme';
import { useCreateSolicitud } from '@/hooks/use-create-solicitud';
import { useSolicitudes } from '@/hooks/use-solicitudes';
import { useTheme } from '@/hooks/use-theme';

type Tab = 'VACACIONES' | 'AUSENCIA';
type Feedback = { type: 'success' | 'error'; message: string };

const estadoLabel: Record<SolicitudDto['estado'], string> = {
  PENDIENTE: 'Pendiente',
  APROBADA: 'Aprobada',
  RECHAZADA: 'Rechazada',
  ANULADA: 'Anulada',
};

const estadoColors: Record<SolicitudDto['estado'], { bg: ThemeColor; border: ThemeColor; text: ThemeColor }> = {
  PENDIENTE: { bg: 'warningBg', border: 'warningBorder', text: 'warningBadgeText' },
  APROBADA: { bg: 'successBg', border: 'successBorder', text: 'successText' },
  RECHAZADA: { bg: 'errorBg', border: 'errorBorder', text: 'errorText' },
  ANULADA: { bg: 'neutralIconBg', border: 'cardBorder', text: 'textMuted' },
};

function formatRange(inicio: string, fin: string | null): string {
  const formatter = new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short' });
  const start = formatter.format(new Date(inicio));
  const end = fin ? formatter.format(new Date(fin)) : start;
  return start === end ? start : `${start} - ${end}`;
}

function tipoLabel(item: SolicitudDto): string {
  if (item.tipo === 'VACACIONES') return 'Vacaciones';
  return item.ausenciaTipo === 'FALTA' ? 'Falta' : 'Aviso';
}

export default function SolicitudesScreen() {
  const theme = useTheme();
  const { data, isLoading, isError, refetch, isRefetching } = useSolicitudes();
  const createSolicitud = useCreateSolicitud();

  const [tab, setTab] = useState<Tab>('VACACIONES');
  const [inicio, setInicio] = useState('');
  const [fin, setFin] = useState('');
  const [motivo, setMotivo] = useState('');
  const [ausenciaTipo, setAusenciaTipo] = useState<'FALTA' | 'AVISO'>('FALTA');
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const canSubmit = inicio.length > 0 && !createSolicitud.isPending;

  const handleSubmit = () => {
    if (!canSubmit) return;
    setFeedback(null);

    const payload: CreateSolicitudRequest =
      tab === 'VACACIONES'
        ? { tipo: 'VACACIONES', inicio, fin: fin || undefined, motivo: motivo || undefined }
        : {
            tipo: 'AUSENCIA',
            inicio,
            fin: fin || undefined,
            motivo: motivo || undefined,
            ausenciaTipo,
          };

    createSolicitud.mutate(payload, {
      onSuccess: (result) => {
        if (result.outcome === 'ok') {
          setFeedback({ type: 'success', message: 'Solicitud enviada.' });
          setInicio('');
          setFin('');
          setMotivo('');
        } else if (result.outcome === 'overlap') {
          setFeedback({
            type: 'error',
            message: 'Ya tienes una solicitud pendiente o aprobada que se solapa con esas fechas.',
          });
        } else {
          setFeedback({ type: 'error', message: result.message });
        }
      },
      onError: () => {
        setFeedback({ type: 'error', message: 'No se pudo enviar la solicitud. Inténtalo de nuevo.' });
      },
    });
  };

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Card style={styles.card}>
            <ThemedText type="heading">Nueva solicitud</ThemedText>
            <ThemedText type="small" themeColor="textMuted" style={styles.cardSubtitle}>
              Vacaciones y ausencias en un mismo formulario.
            </ThemedText>

            <SegmentedControl
              options={[
                { value: 'VACACIONES', label: 'Vacaciones' },
                { value: 'AUSENCIA', label: 'Ausencia' },
              ]}
              value={tab}
              onChange={setTab}
            />

            {tab === 'AUSENCIA' && (
              <View style={styles.field}>
                <ThemedText type="small" themeColor="textSecondary">
                  Tipo de ausencia
                </ThemedText>
                <SegmentedControl
                  options={[
                    { value: 'FALTA', label: 'He faltado' },
                    { value: 'AVISO', label: 'Voy a faltar' },
                  ]}
                  value={ausenciaTipo}
                  onChange={setAusenciaTipo}
                />
              </View>
            )}

            <View style={styles.dateRow}>
              <View style={styles.dateField}>
                <DateField label="Desde" value={inicio} onChange={setInicio} />
              </View>
              <View style={styles.dateField}>
                <DateField label="Hasta (opcional)" value={fin} onChange={setFin} />
              </View>
            </View>

            <View style={styles.field}>
              <ThemedText type="small" themeColor="textSecondary">
                Motivo (opcional)
              </ThemedText>
              <TextInput
                value={motivo}
                onChangeText={setMotivo}
                placeholder="Comentario opcional"
                placeholderTextColor={theme.textMuted}
                multiline
                numberOfLines={3}
                style={[
                  styles.textArea,
                  { color: theme.text, borderColor: theme.cardBorder, backgroundColor: theme.backgroundElement },
                ]}
              />
            </View>

            {feedback && (
              <View
                style={[
                  styles.feedbackBanner,
                  {
                    backgroundColor: feedback.type === 'success' ? theme.successBg : theme.errorBg,
                    borderColor: feedback.type === 'success' ? theme.successBorder : theme.errorBorder,
                  },
                ]}>
                <ThemedText
                  type="small"
                  style={{ color: feedback.type === 'success' ? theme.successText : theme.errorText }}>
                  {feedback.message}
                </ThemedText>
              </View>
            )}

            <Pressable
              onPress={handleSubmit}
              disabled={!canSubmit}
              style={({ pressed }) => [
                styles.submitButton,
                glowShadow(theme.primary),
                {
                  backgroundColor: pressed || createSolicitud.isPending ? theme.primaryPressed : theme.primary,
                  opacity: canSubmit ? 1 : 0.5,
                },
              ]}>
              <ThemedText style={styles.submitButtonText}>
                {createSolicitud.isPending ? 'Enviando...' : 'Enviar solicitud'}
              </ThemedText>
            </Pressable>
          </Card>

          <Card style={styles.card}>
            <View style={styles.listHeader}>
              <ThemedText type="default" style={[styles.cardTitle, styles.listHeaderTitle]}>
                Mis solicitudes
              </ThemedText>
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
                No se pudieron cargar tus solicitudes.
              </ThemedText>
            )}

            {!isLoading && !isError && (data?.solicitudes.length ?? 0) === 0 && (
              <ThemedText type="small" themeColor="textMuted" style={styles.emptyText}>
                No has enviado ninguna solicitud todavía.
              </ThemedText>
            )}

            {data?.solicitudes.map((item) => {
              const colors = estadoColors[item.estado];
              return (
                <View
                  key={item.id}
                  style={[styles.solicitudRow, { borderColor: theme.cardBorder }]}>
                  <View style={styles.solicitudInfo}>
                    <ThemedText type="smallBold">{tipoLabel(item)}</ThemedText>
                    <ThemedText type="small" themeColor="textMuted">
                      {formatRange(item.inicio, item.fin)}
                    </ThemedText>
                    {item.motivo && (
                      <ThemedText type="small" themeColor="textMuted">
                        {item.motivo}
                      </ThemedText>
                    )}
                  </View>
                  <StatusBadge
                    label={estadoLabel[item.estado]}
                    bg={theme[colors.bg]}
                    text={theme[colors.text]}
                  />
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
  scrollContent: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  card: {
    gap: Spacing.three,
  },
  cardTitle: {
    fontFamily: SoraFonts.semiBold,
  },
  cardSubtitle: {
    marginTop: -Spacing.two,
  },
  field: {
    gap: Spacing.half,
  },
  dateRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  dateField: {
    flex: 1,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: Radius.input,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: SoraFonts.regular,
    textAlignVertical: 'top',
    minHeight: 80,
  },
  feedbackBanner: {
    borderWidth: 1,
    borderRadius: Radius.input,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  submitButton: {
    borderRadius: Radius.input,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: SoraFonts.semiBold,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  listHeaderTitle: {
    flexShrink: 1,
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: Spacing.three,
  },
  solicitudRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    borderTopWidth: 1,
    paddingTop: Spacing.three,
  },
  solicitudInfo: {
    flex: 1,
    gap: Spacing.half,
  },
});
