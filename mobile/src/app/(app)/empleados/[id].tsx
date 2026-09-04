import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, SoraFonts, Spacing, glowShadow } from '@/constants/theme';
import {
  useCambiarEmpresaUsuario,
  useCrearContrato,
  useEliminarUsuario,
  useEmpleadoDetail,
  useEmpresasOptions,
  useResetPassword,
  useUpdateDniAdmin,
  useUpdateEmailAdmin,
  useUpdateEstado,
} from '@/hooks/use-empleados-directorio';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/store/auth-store';

type Feedback = { type: 'success' | 'error'; message: string };

const adminErrorMessages: Record<string, string> = {
  'not-found': 'Usuario no encontrado.',
  'forbidden-target': 'No se permite en este usuario.',
  self: 'No puedes realizar esta acción sobre tu propia cuenta.',
  'email-taken': 'Ese email ya está en uso.',
  'invalid-dni': 'DNI/NIE inválido.',
  'dni-taken': 'Ese DNI/NIE ya está en uso.',
  'already-in-state': 'El usuario ya está en ese estado.',
  'invalid-empresa': 'Empresa inválida.',
};

function formatDate(iso: string | null): string {
  if (!iso) return 'Sin dato';
  return new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium' }).format(new Date(iso));
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card style={styles.card}>
      <ThemedText type="default" style={styles.sectionTitle}>
        {title}
      </ThemedText>
      {children}
    </Card>
  );
}

function FeedbackBanner({ feedback }: { feedback: Feedback | null }) {
  const theme = useTheme();
  if (!feedback) return null;
  return (
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
  );
}

export default function EmpleadoDetalleScreen() {
  const theme = useTheme();
  const role = useAuthStore((state) => state.user?.role);
  const isAdmin = role === 'ADMIN_SISTEMA';
  const { id } = useLocalSearchParams<{ id: string }>();

  const detail = useEmpleadoDetail(id ?? null);

  const [horasSemanales, setHorasSemanales] = useState('');
  const [fechaInicio, setFechaInicio] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [contratoFeedback, setContratoFeedback] = useState<Feedback | null>(null);
  const crearContrato = useCrearContrato();

  const [newPassword, setNewPassword] = useState('');
  const [passwordFeedback, setPasswordFeedback] = useState<Feedback | null>(null);
  const resetPassword = useResetPassword();

  const [newEmail, setNewEmail] = useState('');
  const [emailFeedback, setEmailFeedback] = useState<Feedback | null>(null);
  const updateEmail = useUpdateEmailAdmin();

  const [newDni, setNewDni] = useState('');
  const [dniFeedback, setDniFeedback] = useState<Feedback | null>(null);
  const updateDni = useUpdateDniAdmin();

  const [estadoFeedback, setEstadoFeedback] = useState<Feedback | null>(null);
  const updateEstado = useUpdateEstado();

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteFeedback, setDeleteFeedback] = useState<Feedback | null>(null);
  const eliminarUsuario = useEliminarUsuario();

  const [nuevaEmpresaId, setNuevaEmpresaId] = useState<string | null>(null);
  const [empresaFeedback, setEmpresaFeedback] = useState<Feedback | null>(null);
  const empresas = useEmpresasOptions();
  const cambiarEmpresa = useCambiarEmpresaUsuario();

  if (role !== 'GERENTE' && role !== 'ADMIN_SISTEMA') {
    return <Redirect href="/" />;
  }

  if (!id) {
    return <Redirect href="/empleados" />;
  }

  const empleado = detail.data?.outcome === 'ok' ? detail.data.data : null;

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (event.type === 'set' && selectedDate) {
      setFechaInicio(selectedDate);
    }
  };

  const handleCrearContrato = () => {
    if (!id) return;
    const horas = Number.parseFloat(horasSemanales.replace(',', '.'));
    if (!Number.isFinite(horas) || horas <= 0 || horas > 60) {
      setContratoFeedback({ type: 'error', message: 'Horas semanales inválidas.' });
      return;
    }
    setContratoFeedback(null);
    crearContrato.mutate(
      {
        empleadoId: id,
        horasSemanales: horas,
        fechaInicio: fechaInicio.toISOString().slice(0, 10),
      },
      {
        onSuccess: (result) => {
          if (result.outcome === 'ok') {
            setContratoFeedback({ type: 'success', message: 'Contrato actualizado.' });
            setHorasSemanales('');
          } else if (result.outcome === 'invalid-start-date') {
            setContratoFeedback({ type: 'error', message: result.message });
          } else {
            const messages: Record<string, string> = {
              'invalid-employee': 'Empleado inválido.',
              'employee-out-of-scope': 'Empleado fuera de tu empresa.',
            };
            setContratoFeedback({ type: 'error', message: messages[result.outcome] ?? 'No se pudo crear el contrato.' });
          }
        },
        onError: () => setContratoFeedback({ type: 'error', message: 'No se pudo crear el contrato.' }),
      },
    );
  };

  const handleResetPassword = () => {
    if (!id) return;
    if (newPassword.length < 8) {
      setPasswordFeedback({ type: 'error', message: 'La contraseña debe tener 8 caracteres.' });
      return;
    }
    setPasswordFeedback(null);
    resetPassword.mutate(
      { id, password: newPassword },
      {
        onSuccess: (result) => {
          if (result.outcome === 'ok') {
            setPasswordFeedback({ type: 'success', message: 'Contraseña actualizada.' });
            setNewPassword('');
          } else {
            setPasswordFeedback({ type: 'error', message: adminErrorMessages[result.outcome] ?? 'No se pudo actualizar.' });
          }
        },
        onError: () => setPasswordFeedback({ type: 'error', message: 'No se pudo actualizar la contraseña.' }),
      },
    );
  };

  const handleUpdateEmail = () => {
    if (!id) return;
    setEmailFeedback(null);
    updateEmail.mutate(
      { id, email: newEmail },
      {
        onSuccess: (result) => {
          if (result.outcome === 'ok') {
            setEmailFeedback({ type: 'success', message: 'Email actualizado.' });
            setNewEmail('');
          } else {
            setEmailFeedback({ type: 'error', message: adminErrorMessages[result.outcome] ?? 'No se pudo actualizar.' });
          }
        },
        onError: () => setEmailFeedback({ type: 'error', message: 'No se pudo actualizar el email.' }),
      },
    );
  };

  const handleUpdateDni = () => {
    if (!id) return;
    setDniFeedback(null);
    updateDni.mutate(
      { id, dni: newDni },
      {
        onSuccess: (result) => {
          if (result.outcome === 'ok') {
            setDniFeedback({ type: 'success', message: 'DNI/NIE actualizado.' });
            setNewDni('');
          } else {
            setDniFeedback({ type: 'error', message: adminErrorMessages[result.outcome] ?? 'No se pudo actualizar.' });
          }
        },
        onError: () => setDniFeedback({ type: 'error', message: 'No se pudo actualizar el DNI/NIE.' }),
      },
    );
  };

  const handleToggleEstado = () => {
    if (!id || !empleado) return;
    setEstadoFeedback(null);
    updateEstado.mutate(
      { id, accion: empleado.activo ? 'baja' : 'reactivar' },
      {
        onSuccess: (result) => {
          if (result.outcome === 'ok') {
            setEstadoFeedback({
              type: 'success',
              message: empleado.activo ? 'Usuario dado de baja.' : 'Usuario reactivado.',
            });
          } else {
            setEstadoFeedback({ type: 'error', message: adminErrorMessages[result.outcome] ?? 'No se pudo actualizar.' });
          }
        },
        onError: () => setEstadoFeedback({ type: 'error', message: 'No se pudo actualizar el estado.' }),
      },
    );
  };

  const handleCambiarEmpresa = () => {
    if (!id || !nuevaEmpresaId) return;
    setEmpresaFeedback(null);
    cambiarEmpresa.mutate(
      { id, empresaId: nuevaEmpresaId },
      {
        onSuccess: (result) => {
          if (result.outcome === 'ok') {
            setEmpresaFeedback({ type: 'success', message: 'Empresa actualizada.' });
            setNuevaEmpresaId(null);
          } else {
            setEmpresaFeedback({ type: 'error', message: adminErrorMessages[result.outcome] ?? 'No se pudo actualizar.' });
          }
        },
        onError: () => setEmpresaFeedback({ type: 'error', message: 'No se pudo actualizar la empresa.' }),
      },
    );
  };

  const handleDelete = () => {
    if (!id) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleteFeedback(null);
    eliminarUsuario.mutate(id, {
      onSuccess: (result) => {
        setConfirmDelete(false);
        if (result.outcome === 'ok') {
          router.replace('/empleados');
        } else if (result.outcome === 'has-blockers') {
          setDeleteFeedback({
            type: 'error',
            message: `No se puede eliminar: tiene ${result.blockers.join(', ')} asociados.`,
          });
        } else {
          setDeleteFeedback({ type: 'error', message: adminErrorMessages[result.outcome] ?? 'No se pudo eliminar.' });
        }
      },
      onError: () => {
        setConfirmDelete(false);
        setDeleteFeedback({ type: 'error', message: 'No se pudo eliminar el usuario.' });
      },
    });
  };

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={[styles.backButton, { borderColor: theme.cardBorder }]}>
            <ChevronLeft size={18} color={theme.text} />
          </Pressable>
          <ThemedText type="heading">{empleado?.nombre ?? 'Empleado'}</ThemedText>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {detail.isLoading && (
            <Card style={styles.card}>
              <ActivityIndicator color={theme.primary} />
            </Card>
          )}

          {detail.data?.outcome === 'not-found' && (
            <Card style={styles.card}>
              <ThemedText type="small" themeColor="textMuted">
                Empleado no encontrado.
              </ThemedText>
            </Card>
          )}

          {empleado && (
            <>
              <Card style={styles.hero}>
                <Avatar name={empleado.nombre} size={56} />
                <View style={styles.heroBody}>
                  <ThemedText type="default" style={styles.sectionTitle}>
                    {empleado.nombre}
                  </ThemedText>
                  <StatusBadge
                    label={empleado.rol === 'GERENTE' ? 'Gerente' : 'Empleado'}
                    bg={theme.neutralIconBg}
                    text={theme.textSecondary}
                  />
                </View>
              </Card>

              <Section title="Datos">
                <View style={styles.infoRow}>
                  <ThemedText type="small" themeColor="textMuted">
                    DNI/NIE
                  </ThemedText>
                  <ThemedText type="small">{empleado.dni ?? 'Sin dato'}</ThemedText>
                </View>
                <View style={styles.infoRow}>
                  <ThemedText type="small" themeColor="textMuted">
                    Email
                  </ThemedText>
                  <ThemedText type="small">{empleado.email}</ThemedText>
                </View>
                <View style={styles.infoRow}>
                  <ThemedText type="small" themeColor="textMuted">
                    Rol
                  </ThemedText>
                  <ThemedText type="small">{empleado.rol === 'GERENTE' ? 'Gerente' : 'Empleado'}</ThemedText>
                </View>
                <View style={styles.infoRow}>
                  <ThemedText type="small" themeColor="textMuted">
                    Empresa
                  </ThemedText>
                  <ThemedText type="small">{empleado.empresaNombre ?? 'Sin dato'}</ThemedText>
                </View>
                <View style={styles.infoRow}>
                  <ThemedText type="small" themeColor="textMuted">
                    Departamento
                  </ThemedText>
                  <ThemedText type="small">{empleado.departamentoNombre ?? 'Sin asignar'}</ThemedText>
                </View>
                <View style={styles.infoRow}>
                  <ThemedText type="small" themeColor="textMuted">
                    Estado
                  </ThemedText>
                  <StatusBadge
                    label={empleado.activo ? 'Activo' : 'Baja'}
                    bg={empleado.activo ? theme.successBg : theme.errorBg}
                    text={empleado.activo ? theme.successText : theme.errorText}
                  />
                </View>
                <View style={styles.infoRow}>
                  <ThemedText type="small" themeColor="textMuted">
                    Contrato
                  </ThemedText>
                  <ThemedText type="small">
                    {empleado.contratoHorasSemanales
                      ? `${empleado.contratoHorasSemanales.toFixed(2)} h/semana desde ${formatDate(empleado.contratoFechaInicio)}`
                      : 'Sin contrato'}
                  </ThemedText>
                </View>
                <View style={styles.infoRow}>
                  <ThemedText type="small" themeColor="textMuted">
                    Alta
                  </ThemedText>
                  <ThemedText type="small">{formatDate(empleado.createdAt)}</ThemedText>
                </View>
              </Section>

              <Section title="Crear / renovar contrato">
                <View style={styles.field}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Horas semanales
                  </ThemedText>
                  <TextInput
                    value={horasSemanales}
                    onChangeText={setHorasSemanales}
                    placeholder="Ej. 40"
                    placeholderTextColor={theme.textMuted}
                    keyboardType="decimal-pad"
                    style={[
                      styles.input,
                      { color: theme.text, borderColor: theme.cardBorder, backgroundColor: theme.backgroundElement },
                    ]}
                  />
                </View>
                <View style={styles.field}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Fecha de inicio
                  </ThemedText>
                  <Pressable
                    onPress={() => setShowDatePicker(true)}
                    style={[styles.input, { borderColor: theme.cardBorder, backgroundColor: theme.backgroundElement }]}>
                    <ThemedText style={{ color: theme.text }}>{formatDate(fechaInicio.toISOString())}</ThemedText>
                  </Pressable>
                  {showDatePicker && (
                    <DateTimePicker value={fechaInicio} mode="date" display="default" onChange={handleDateChange} />
                  )}
                </View>
                <FeedbackBanner feedback={contratoFeedback} />
                <Pressable
                  onPress={handleCrearContrato}
                  disabled={crearContrato.isPending}
                  style={({ pressed }) => [
                    styles.submitButton,
                    glowShadow(theme.primary),
                    { backgroundColor: pressed || crearContrato.isPending ? theme.primaryPressed : theme.primary },
                  ]}>
                  <ThemedText style={styles.submitButtonText}>
                    {crearContrato.isPending ? 'Enviando...' : 'Guardar contrato'}
                  </ThemedText>
                </Pressable>
              </Section>

              {isAdmin && (
                <>
                  <Section title="Restablecer contraseña">
                    <TextInput
                      value={newPassword}
                      onChangeText={setNewPassword}
                      placeholder="Nueva contraseña (mín. 8 caracteres)"
                      placeholderTextColor={theme.textMuted}
                      secureTextEntry
                      style={[
                      styles.input,
                      { color: theme.text, borderColor: theme.cardBorder, backgroundColor: theme.backgroundElement },
                    ]}
                    />
                    <FeedbackBanner feedback={passwordFeedback} />
                    <Pressable
                      onPress={handleResetPassword}
                      disabled={resetPassword.isPending}
                      style={({ pressed }) => [
                        styles.submitButton,
                        glowShadow(theme.primary),
                        { backgroundColor: pressed || resetPassword.isPending ? theme.primaryPressed : theme.primary },
                      ]}>
                      <ThemedText style={styles.submitButtonText}>
                        {resetPassword.isPending ? 'Enviando...' : 'Restablecer'}
                      </ThemedText>
                    </Pressable>
                  </Section>

                  <Section title="Cambiar email">
                    <TextInput
                      value={newEmail}
                      onChangeText={setNewEmail}
                      placeholder={empleado.email}
                      placeholderTextColor={theme.textMuted}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      style={[
                      styles.input,
                      { color: theme.text, borderColor: theme.cardBorder, backgroundColor: theme.backgroundElement },
                    ]}
                    />
                    <FeedbackBanner feedback={emailFeedback} />
                    <Pressable
                      onPress={handleUpdateEmail}
                      disabled={updateEmail.isPending}
                      style={({ pressed }) => [
                        styles.submitButton,
                        glowShadow(theme.primary),
                        { backgroundColor: pressed || updateEmail.isPending ? theme.primaryPressed : theme.primary },
                      ]}>
                      <ThemedText style={styles.submitButtonText}>
                        {updateEmail.isPending ? 'Enviando...' : 'Guardar email'}
                      </ThemedText>
                    </Pressable>
                  </Section>

                  <Section title="Cambiar DNI/NIE">
                    <TextInput
                      value={newDni}
                      onChangeText={setNewDni}
                      placeholder={empleado.dni ?? 'DNI/NIE'}
                      placeholderTextColor={theme.textMuted}
                      autoCapitalize="characters"
                      style={[
                      styles.input,
                      { color: theme.text, borderColor: theme.cardBorder, backgroundColor: theme.backgroundElement },
                    ]}
                    />
                    <FeedbackBanner feedback={dniFeedback} />
                    <Pressable
                      onPress={handleUpdateDni}
                      disabled={updateDni.isPending}
                      style={({ pressed }) => [
                        styles.submitButton,
                        glowShadow(theme.primary),
                        { backgroundColor: pressed || updateDni.isPending ? theme.primaryPressed : theme.primary },
                      ]}>
                      <ThemedText style={styles.submitButtonText}>
                        {updateDni.isPending ? 'Enviando...' : 'Guardar DNI/NIE'}
                      </ThemedText>
                    </Pressable>
                  </Section>

                  <Section title="Cambiar empresa">
                    {empresas.isLoading ? (
                      <ActivityIndicator color={theme.primary} />
                    ) : (
                      <View style={styles.pickerRow}>
                        {empresas.data?.empresas.map((item) => (
                          <Pressable
                            key={item.id}
                            onPress={() => setNuevaEmpresaId(item.id)}
                            style={[
                              styles.pickerChip,
                              {
                                borderColor: nuevaEmpresaId === item.id ? theme.primary : theme.cardBorder,
                                backgroundColor: nuevaEmpresaId === item.id ? theme.primary : 'transparent',
                              },
                            ]}>
                            <ThemedText type="small" style={{ color: nuevaEmpresaId === item.id ? '#ffffff' : theme.text }}>
                              {item.nombre}
                            </ThemedText>
                          </Pressable>
                        ))}
                      </View>
                    )}
                    <FeedbackBanner feedback={empresaFeedback} />
                    <Pressable
                      onPress={handleCambiarEmpresa}
                      disabled={!nuevaEmpresaId || cambiarEmpresa.isPending}
                      style={({ pressed }) => [
                        styles.submitButton,
                        glowShadow(theme.primary),
                        {
                          backgroundColor: pressed || cambiarEmpresa.isPending ? theme.primaryPressed : theme.primary,
                          opacity: nuevaEmpresaId ? 1 : 0.5,
                        },
                      ]}>
                      <ThemedText style={styles.submitButtonText}>
                        {cambiarEmpresa.isPending ? 'Guardando...' : 'Cambiar empresa'}
                      </ThemedText>
                    </Pressable>
                  </Section>

                  <Section title="Estado de la cuenta">
                    <FeedbackBanner feedback={estadoFeedback} />
                    <Pressable
                      onPress={handleToggleEstado}
                      disabled={updateEstado.isPending}
                      style={({ pressed }) => [
                        styles.outlineButton,
                        { borderColor: theme.cardBorder, opacity: updateEstado.isPending ? 0.6 : pressed ? 0.8 : 1 },
                      ]}>
                      <ThemedText type="smallBold">
                        {updateEstado.isPending ? 'Enviando...' : empleado.activo ? 'Dar de baja' : 'Reactivar'}
                      </ThemedText>
                    </Pressable>
                  </Section>

                  <Section title="Eliminar cuenta">
                    <ThemedText type="small" themeColor="textMuted">
                      Solo es posible si el usuario no tiene fichajes, solicitudes ni otros datos asociados.
                    </ThemedText>
                    <FeedbackBanner feedback={deleteFeedback} />
                    <Pressable
                      onPress={handleDelete}
                      disabled={eliminarUsuario.isPending}
                      style={({ pressed }) => [
                        styles.dangerButton,
                        {
                          backgroundColor: confirmDelete ? theme.errorText : 'transparent',
                          borderColor: theme.errorBorder,
                          opacity: eliminarUsuario.isPending ? 0.6 : pressed ? 0.8 : 1,
                        },
                      ]}>
                      <ThemedText type="smallBold" style={{ color: confirmDelete ? '#ffffff' : theme.errorText }}>
                        {eliminarUsuario.isPending
                          ? 'Eliminando...'
                          : confirmDelete
                            ? '¿Seguro? Toca para confirmar'
                            : 'Eliminar usuario'}
                      </ThemedText>
                    </Pressable>
                    {confirmDelete && (
                      <Pressable onPress={() => setConfirmDelete(false)}>
                        <ThemedText type="small" themeColor="textMuted" style={styles.cancelDelete}>
                          Cancelar
                        </ThemedText>
                      </Pressable>
                    )}
                  </Section>
                </>
              )}
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
    gap: Spacing.two,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  heroBody: {
    flex: 1,
    gap: Spacing.two,
  },
  sectionTitle: {
    fontFamily: SoraFonts.semiBold,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  field: {
    gap: Spacing.half,
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
  input: {
    borderWidth: 1,
    borderRadius: Radius.input,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: SoraFonts.regular,
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
  outlineButton: {
    borderWidth: 1,
    borderRadius: Radius.input,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerButton: {
    borderWidth: 1,
    borderRadius: Radius.input,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelDelete: {
    textAlign: 'center',
    marginTop: Spacing.half,
  },
});
