import type { EmpleadoOptionDto, SolicitudModificacionManagerDto } from '@gestor-rrhh/shared';
import { Redirect, router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DateTimeField } from '@/components/date-time-field';
import { Avatar } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, SoraFonts, Spacing, glowShadow, type ThemeColor } from '@/constants/theme';
import {
  useCreateModificacionFichaje,
  useEmpleados,
  useFichajesEmpleado,
  useModificacionesGestion,
} from '@/hooks/use-modificacion-gestion';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/store/auth-store';

type Feedback = { type: 'success' | 'error'; message: string };

const estadoLabel: Record<SolicitudModificacionManagerDto['estado'], string> = {
  PENDIENTE: 'Pendiente',
  ACEPTADA: 'Aceptada',
  RECHAZADA: 'Rechazada',
};

const estadoColors: Record<SolicitudModificacionManagerDto['estado'], { bg: ThemeColor; text: ThemeColor }> = {
  PENDIENTE: { bg: 'warningBadgeBg', text: 'warningBadgeText' },
  ACEPTADA: { bg: 'successBg', text: 'successText' },
  RECHAZADA: { bg: 'errorBg', text: 'errorText' },
};

const createErrorMessages: Record<string, string> = {
  'invalid-employee': 'Empleado inválido.',
  'employee-out-of-scope': 'Empleado fuera de tu empresa.',
  'invalid-fichaje': 'Fichaje inválido.',
};

function formatDateTime(iso: string | null): string {
  if (!iso) return 'Sin dato';
  return new Intl.DateTimeFormat('es-ES', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));
}

export default function ProponerModificacionScreen() {
  const theme = useTheme();
  const role = useAuthStore((state) => state.user?.role);

  const empleados = useEmpleados();
  const historico = useModificacionesGestion();
  const createModificacion = useCreateModificacionFichaje();

  const [empleado, setEmpleado] = useState<EmpleadoOptionDto | null>(null);
  const [fichajeId, setFichajeId] = useState<string | null>(null);
  const [entrada, setEntrada] = useState<Date | null>(null);
  const [salida, setSalida] = useState<Date | null>(null);
  const [motivo, setMotivo] = useState('');
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const fichajes = useFichajesEmpleado(empleado?.id ?? null);

  if (role !== 'GERENTE' && role !== 'ADMIN_SISTEMA') {
    return <Redirect href="/" />;
  }

  const resetForm = () => {
    setEmpleado(null);
    setFichajeId(null);
    setEntrada(null);
    setSalida(null);
    setMotivo('');
  };

  const canSubmit = Boolean(empleado) && (entrada !== null || salida !== null) && !createModificacion.isPending;

  const handleSubmit = () => {
    if (!empleado || !canSubmit) return;
    setFeedback(null);
    createModificacion.mutate(
      {
        empleadoId: empleado.id,
        fichajeId: fichajeId ?? undefined,
        entrada: entrada ? entrada.toISOString() : undefined,
        salida: salida ? salida.toISOString() : undefined,
        motivo: motivo || undefined,
      },
      {
        onSuccess: (result) => {
          if (result.outcome === 'ok') {
            setFeedback({ type: 'success', message: 'Solicitud enviada.' });
            resetForm();
          } else {
            setFeedback({
              type: 'error',
              message: createErrorMessages[result.outcome] ?? 'No se pudo enviar la solicitud.',
            });
          }
        },
        onError: () => {
          setFeedback({ type: 'error', message: 'No se pudo enviar la solicitud.' });
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
          <ThemedText type="heading">Proponer corrección</ThemedText>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Card>
            <ThemedText type="default" style={styles.sectionTitle}>
              1. Empleado
            </ThemedText>

            {empleado ? (
              <View style={[styles.selectedRow, { borderColor: theme.cardBorder }]}>
                <Avatar name={empleado.nombre} size={36} />
                <View style={styles.selectedRowText}>
                  <ThemedText type="smallBold" numberOfLines={1}>
                    {empleado.nombre}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textMuted" numberOfLines={1}>
                    {empleado.email}
                  </ThemedText>
                </View>
                <Pressable onPress={() => { setEmpleado(null); setFichajeId(null); }}>
                  <ThemedText type="small" style={{ color: theme.primary }}>
                    Cambiar
                  </ThemedText>
                </Pressable>
              </View>
            ) : empleados.isLoading ? (
              <ActivityIndicator color={theme.primary} />
            ) : (empleados.data?.empleados.length ?? 0) === 0 ? (
              <ThemedText type="small" themeColor="textMuted" style={styles.emptyText}>
                No hay empleados en tu empresa.
              </ThemedText>
            ) : (
              <View style={styles.pickerList}>
                {empleados.data?.empleados.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => setEmpleado(item)}
                    style={[styles.pickerItem, styles.pickerItemRow, { borderColor: theme.cardBorder }]}>
                    <Avatar name={item.nombre} size={32} />
                    <View style={styles.pickerItemText}>
                      <ThemedText type="smallBold" numberOfLines={1}>
                        {item.nombre}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textMuted" numberOfLines={1}>
                        {item.email}
                      </ThemedText>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </Card>

          {empleado && (
            <Card>
              <ThemedText type="default" style={styles.sectionTitle}>
                2. Fichaje a corregir (opcional)
              </ThemedText>
              <ThemedText type="small" themeColor="textMuted" style={styles.helperText}>
                Elige uno para corregirlo, o déjalo sin elegir para crear un fichaje nuevo.
              </ThemedText>

              {fichajes.isLoading ? (
                <ActivityIndicator color={theme.primary} />
              ) : (
                <View style={styles.pickerList}>
                  <Pressable
                    onPress={() => setFichajeId(null)}
                    style={[
                      styles.pickerItem,
                      { borderColor: fichajeId === null ? theme.primary : theme.cardBorder },
                    ]}>
                    <ThemedText type="smallBold">Crear fichaje nuevo</ThemedText>
                  </Pressable>
                  {fichajes.data?.fichajes.map((item) => (
                    <Pressable
                      key={item.id}
                      onPress={() => setFichajeId(item.id)}
                      style={[
                        styles.pickerItem,
                        { borderColor: fichajeId === item.id ? theme.primary : theme.cardBorder },
                      ]}>
                      <ThemedText type="small">
                        {formatDateTime(item.entrada)} – {item.salida ? formatDateTime(item.salida) : 'en curso'}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
              )}
            </Card>
          )}

          {empleado && (
            <Card>
              <ThemedText type="default" style={styles.sectionTitle}>
                3. Horas propuestas
              </ThemedText>

              <DateTimeField label="Entrada propuesta" value={entrada} onChange={setEntrada} />
              <DateTimeField label="Salida propuesta" value={salida} onChange={setSalida} />

              <View style={styles.field}>
                <ThemedText type="small" themeColor="textSecondary">
                  Motivo
                </ThemedText>
                <TextInput
                  value={motivo}
                  onChangeText={setMotivo}
                  placeholder="Explica brevemente el motivo"
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
                    backgroundColor: pressed || createModificacion.isPending ? theme.primaryPressed : theme.primary,
                    opacity: canSubmit ? 1 : 0.5,
                  },
                ]}>
                <ThemedText style={styles.submitButtonText}>
                  {createModificacion.isPending ? 'Enviando...' : 'Enviar solicitud'}
                </ThemedText>
              </Pressable>
            </Card>
          )}

          <Card>
            <ThemedText type="default" style={styles.sectionTitle}>
              Solicitudes recientes
            </ThemedText>

            {!historico.isLoading && (historico.data?.solicitudes.length ?? 0) === 0 && (
              <ThemedText type="small" themeColor="textMuted" style={styles.emptyText}>
                No hay solicitudes registradas.
              </ThemedText>
            )}

            {historico.data?.solicitudes.map((item) => {
              const colors = estadoColors[item.estado];
              return (
                <View key={item.id} style={[styles.historyItem, { borderColor: theme.cardBorder }]}>
                  <View style={styles.historyRow}>
                    <Avatar name={item.empleadoNombre} size={36} />
                    <ThemedText type="smallBold" style={styles.historyName}>
                      {item.empleadoNombre}
                    </ThemedText>
                    <StatusBadge label={estadoLabel[item.estado]} bg={theme[colors.bg]} text={theme[colors.text]} />
                  </View>
                  <ThemedText type="small" themeColor="textMuted">
                    Entrada: {formatDateTime(item.entradaPropuesta)} · Salida: {formatDateTime(item.salidaPropuesta)}
                  </ThemedText>
                  {item.motivo && (
                    <ThemedText type="small" themeColor="textMuted">
                      {item.motivo}
                    </ThemedText>
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
  sectionTitle: {
    fontFamily: SoraFonts.semiBold,
  },
  helperText: {
    marginTop: -Spacing.two,
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: Spacing.two,
  },
  selectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.input,
    padding: Spacing.three,
  },
  selectedRowText: {
    flex: 1,
  },
  pickerList: {
    gap: Spacing.two,
    maxHeight: 260,
  },
  pickerItem: {
    borderWidth: 1,
    borderRadius: Radius.input,
    padding: Spacing.three,
  },
  pickerItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  pickerItemText: {
    flex: 1,
  },
  field: {
    gap: Spacing.half,
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
  historyItem: {
    borderTopWidth: 1,
    paddingTop: Spacing.three,
    gap: Spacing.half,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  historyName: {
    flex: 1,
  },
});
