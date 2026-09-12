import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, SoraFonts, Spacing, glowShadow } from '@/constants/theme';
import { useChangePassword } from '@/hooks/use-change-password';
import { useActualizarConfigEmpresa, useMiEmpresaConfig } from '@/hooks/use-empresas-admin';
import { useProfile } from '@/hooks/use-profile';
import { useRevokeAllSessions, useRevokeSession, useSessions } from '@/hooks/use-sessions';
import { useTheme } from '@/hooks/use-theme';
import { useUpdateProfile } from '@/hooks/use-update-profile';
import { useAuthStore } from '@/store/auth-store';

type Feedback = { type: 'success' | 'error'; message: string };

const rolLabel: Record<string, string> = {
  EMPLEADO: 'Empleado',
  GERENTE: 'Gerente',
  ADMIN_SISTEMA: 'Administrador del sistema',
};

export default function PerfilScreen() {
  const theme = useTheme();
  const { data: profile, isLoading, isError } = useProfile();
  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();
  const logout = useAuthStore((state) => state.logout);

  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [profileFeedback, setProfileFeedback] = useState<Feedback | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordFeedback, setPasswordFeedback] = useState<Feedback | null>(null);

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Auditoría de seguridad (Fase 2.19, hallazgo #3): el access token es un
  // JWT sin sessionId, así que no hay forma de saber cuál de estas filas es
  // "este mismo dispositivo" — se muestran todas igual. Si el usuario revoca
  // por error la que está usando ahora, el siguiente refresh fallará y la
  // propia app ya lo trata como sesión expirada (ver client.ts).
  const sessions = useSessions();
  const revokeSessionMutation = useRevokeSession();
  const revokeAllSessionsMutation = useRevokeAllSessions();
  const [sessionsFeedback, setSessionsFeedback] = useState<Feedback | null>(null);

  const handleRevokeSession = (sessionId: string) => {
    setSessionsFeedback(null);
    revokeSessionMutation.mutate(sessionId, {
      onError: () => setSessionsFeedback({ type: 'error', message: 'No se pudo cerrar esa sesión.' }),
    });
  };

  const handleRevokeAllSessions = () => {
    setSessionsFeedback(null);
    revokeAllSessionsMutation.mutate(undefined, {
      onSuccess: () => {
        // Revoca también la sesión de este dispositivo — cerrar localmente
        // ahora evita esperar a que el próximo refresh falle solo.
        void logout();
      },
      onError: () => setSessionsFeedback({ type: 'error', message: 'No se pudieron cerrar las sesiones.' }),
    });
  };

  // Solo GERENTE ve esto — igual que dashboard/ajustes en la web, que
  // renderiza EmpresaConfigForm únicamente para ese rol (ADMIN_SISTEMA
  // tiene su propia pantalla completa en "Empresas").
  const isGerente = profile?.rol === 'GERENTE';
  const miEmpresa = useMiEmpresaConfig(isGerente);
  const actualizarConfig = useActualizarConfigEmpresa();
  const [empresaConfigFeedback, setEmpresaConfigFeedback] = useState<Feedback | null>(null);

  // Sincroniza los campos editables con el perfil cargado — solo la
  // primera vez que llega (no pisa lo que el usuario está escribiendo si
  // la query se revalida en segundo plano).
  useEffect(() => {
    if (profile) {
      setNombre((current) => current || profile.nombre);
      setEmail((current) => current || profile.email);
    }
  }, [profile]);

  const handleSaveProfile = () => {
    setProfileFeedback(null);
    updateProfile.mutate(
      { nombre, email },
      {
        onSuccess: (result) => {
          if (result.outcome === 'ok') {
            setProfileFeedback({ type: 'success', message: 'Perfil actualizado.' });
          } else {
            setProfileFeedback({ type: 'error', message: 'Ese email ya está en uso.' });
          }
        },
        onError: () => {
          setProfileFeedback({ type: 'error', message: 'No se pudo actualizar el perfil.' });
        },
      },
    );
  };

  const canChangePassword =
    currentPassword.length > 0 &&
    newPassword.length >= 10 &&
    newPassword === confirmPassword &&
    !changePassword.isPending;

  const handleChangePassword = () => {
    if (!canChangePassword) return;
    setPasswordFeedback(null);
    changePassword.mutate(
      { currentPassword, newPassword, confirmPassword },
      {
        onSuccess: (result) => {
          if (result.outcome === 'ok') {
            setPasswordFeedback({ type: 'success', message: 'Contraseña actualizada.' });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
          } else {
            setPasswordFeedback({ type: 'error', message: 'Contraseña actual incorrecta.' });
          }
        },
        onError: () => {
          setPasswordFeedback({ type: 'error', message: 'No se pudo actualizar la contraseña.' });
        },
      },
    );
  };

  const handleToggleEmpresaConfig = (field: 'pausaCuentaComoTrabajo' | 'geolocalizacionFichaje') => {
    const empresa = miEmpresa.data?.empresa;
    if (!empresa) return;
    setEmpresaConfigFeedback(null);
    actualizarConfig.mutate(
      {
        id: empresa.id,
        input: {
          pausaCuentaComoTrabajo:
            field === 'pausaCuentaComoTrabajo' ? !empresa.pausaCuentaComoTrabajo : empresa.pausaCuentaComoTrabajo,
          geolocalizacionFichaje:
            field === 'geolocalizacionFichaje' ? !empresa.geolocalizacionFichaje : empresa.geolocalizacionFichaje,
        },
      },
      {
        onSuccess: (result) => {
          if (result.outcome !== 'ok') {
            const messages: Record<string, string> = {
              'not-found': 'Empresa no encontrada.',
              forbidden: 'No autorizado.',
            };
            setEmpresaConfigFeedback({ type: 'error', message: messages[result.outcome] ?? 'No se pudo actualizar.' });
          }
        },
        onError: () => setEmpresaConfigFeedback({ type: 'error', message: 'No se pudo actualizar la configuración.' }),
      },
    );
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout();
    // No hace falta navegar a mano: authenticated pasa a false y
    // (auth)/_layout.tsx redirige solo a login, igual que en el resto de
    // fallos de sesión de la app.
  };

  if (isLoading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator color={theme.primary} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Card style={styles.card}>
            <ThemedText type="heading">Mi perfil</ThemedText>

            {isError && (
              <ThemedText type="small" themeColor="textMuted" style={styles.errorText}>
                No se pudo cargar tu perfil.
              </ThemedText>
            )}

            {profile && (
              <StatusBadge
                label={rolLabel[profile.rol] ?? profile.rol}
                bg={theme.neutralIconBg}
                text={theme.textSecondary}
              />
            )}

            <View style={styles.field}>
              <ThemedText type="small" themeColor="textSecondary">
                Nombre
              </ThemedText>
              <TextInput
                value={nombre}
                onChangeText={setNombre}
                placeholderTextColor={theme.textMuted}
                style={[
                  styles.input,
                  { color: theme.text, borderColor: theme.cardBorder, backgroundColor: theme.backgroundElement },
                ]}
              />
            </View>

            <View style={styles.field}>
              <ThemedText type="small" themeColor="textSecondary">
                Email
              </ThemedText>
              <TextInput
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                placeholderTextColor={theme.textMuted}
                style={[
                  styles.input,
                  { color: theme.text, borderColor: theme.cardBorder, backgroundColor: theme.backgroundElement },
                ]}
              />
            </View>

            {profileFeedback && (
              <View
                style={[
                  styles.feedbackBanner,
                  {
                    backgroundColor: profileFeedback.type === 'success' ? theme.successBg : theme.errorBg,
                    borderColor: profileFeedback.type === 'success' ? theme.successBorder : theme.errorBorder,
                  },
                ]}>
                <ThemedText
                  type="small"
                  style={{ color: profileFeedback.type === 'success' ? theme.successText : theme.errorText }}>
                  {profileFeedback.message}
                </ThemedText>
              </View>
            )}

            <Pressable
              onPress={handleSaveProfile}
              disabled={updateProfile.isPending}
              style={({ pressed }) => [
                styles.primaryButton,
                glowShadow(theme.primary),
                {
                  backgroundColor: pressed || updateProfile.isPending ? theme.primaryPressed : theme.primary,
                  opacity: updateProfile.isPending ? 0.6 : 1,
                },
              ]}>
              <ThemedText style={styles.primaryButtonText}>
                {updateProfile.isPending ? 'Guardando...' : 'Guardar cambios'}
              </ThemedText>
            </Pressable>
          </Card>

          <Card style={styles.card}>
            <ThemedText type="default" style={styles.cardTitle}>
              Cambiar contraseña
            </ThemedText>

            <View style={styles.field}>
              <ThemedText type="small" themeColor="textSecondary">
                Contraseña actual
              </ThemedText>
              <TextInput
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry
                autoCapitalize="none"
                placeholderTextColor={theme.textMuted}
                style={[
                  styles.input,
                  { color: theme.text, borderColor: theme.cardBorder, backgroundColor: theme.backgroundElement },
                ]}
              />
            </View>

            <View style={styles.field}>
              <ThemedText type="small" themeColor="textSecondary">
                Nueva contraseña
              </ThemedText>
              <TextInput
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                autoCapitalize="none"
                placeholderTextColor={theme.textMuted}
                style={[
                  styles.input,
                  { color: theme.text, borderColor: theme.cardBorder, backgroundColor: theme.backgroundElement },
                ]}
              />
            </View>

            <View style={styles.field}>
              <ThemedText type="small" themeColor="textSecondary">
                Confirmar nueva contraseña
              </ThemedText>
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoCapitalize="none"
                placeholderTextColor={theme.textMuted}
                style={[
                  styles.input,
                  { color: theme.text, borderColor: theme.cardBorder, backgroundColor: theme.backgroundElement },
                ]}
              />
            </View>

            {passwordFeedback && (
              <View
                style={[
                  styles.feedbackBanner,
                  {
                    backgroundColor: passwordFeedback.type === 'success' ? theme.successBg : theme.errorBg,
                    borderColor: passwordFeedback.type === 'success' ? theme.successBorder : theme.errorBorder,
                  },
                ]}>
                <ThemedText
                  type="small"
                  style={{ color: passwordFeedback.type === 'success' ? theme.successText : theme.errorText }}>
                  {passwordFeedback.message}
                </ThemedText>
              </View>
            )}

            <Pressable
              onPress={handleChangePassword}
              disabled={!canChangePassword}
              style={({ pressed }) => [
                styles.primaryButton,
                glowShadow(theme.primary),
                {
                  backgroundColor: pressed || changePassword.isPending ? theme.primaryPressed : theme.primary,
                  opacity: canChangePassword ? 1 : 0.5,
                },
              ]}>
              <ThemedText style={styles.primaryButtonText}>
                {changePassword.isPending ? 'Actualizando...' : 'Actualizar contraseña'}
              </ThemedText>
            </Pressable>
          </Card>

          <Card style={styles.card}>
            <ThemedText type="default" style={styles.cardTitle}>
              Sesiones activas
            </ThemedText>
            <ThemedText type="small" themeColor="textMuted">
              Dispositivos con sesión iniciada en tu cuenta. Si no reconoces alguno, ciérralo.
            </ThemedText>

            {sessions.isLoading && <ActivityIndicator color={theme.primary} />}

            {sessions.isError && (
              <ThemedText type="small" themeColor="textMuted">
                No se pudieron cargar las sesiones.
              </ThemedText>
            )}

            {sessions.data?.sessions.length === 0 && (
              <ThemedText type="small" themeColor="textMuted">
                No hay otras sesiones activas.
              </ThemedText>
            )}

            {sessions.data?.sessions.map((s) => (
              <View key={s.id} style={[styles.sessionRow, { borderColor: theme.cardBorder }]}>
                <View style={styles.sessionInfo}>
                  <ThemedText type="smallBold" numberOfLines={1}>
                    {s.deviceName || s.platform || 'Dispositivo desconocido'}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textMuted">
                    {s.lastUsedAt
                      ? `Último uso: ${new Date(s.lastUsedAt).toLocaleDateString('es-ES')}`
                      : `Iniciada: ${new Date(s.createdAt).toLocaleDateString('es-ES')}`}
                  </ThemedText>
                </View>
                <Pressable
                  onPress={() => handleRevokeSession(s.id)}
                  disabled={revokeSessionMutation.isPending}
                  style={({ pressed }) => [styles.revokeButton, { opacity: pressed ? 0.6 : 1 }]}>
                  <ThemedText type="small" style={{ color: theme.errorText }}>
                    Cerrar
                  </ThemedText>
                </Pressable>
              </View>
            ))}

            {sessionsFeedback && (
              <View
                style={[
                  styles.feedbackBanner,
                  {
                    backgroundColor: sessionsFeedback.type === 'success' ? theme.successBg : theme.errorBg,
                    borderColor: sessionsFeedback.type === 'success' ? theme.successBorder : theme.errorBorder,
                  },
                ]}>
                <ThemedText
                  type="small"
                  style={{ color: sessionsFeedback.type === 'success' ? theme.successText : theme.errorText }}>
                  {sessionsFeedback.message}
                </ThemedText>
              </View>
            )}

            {sessions.data && sessions.data.sessions.length > 0 && (
              <Pressable
                onPress={handleRevokeAllSessions}
                disabled={revokeAllSessionsMutation.isPending}
                style={({ pressed }) => [
                  styles.logoutButton,
                  { borderColor: theme.errorBorder, opacity: pressed || revokeAllSessionsMutation.isPending ? 0.7 : 1 },
                ]}>
                <ThemedText type="smallBold" style={{ color: theme.errorText }}>
                  {revokeAllSessionsMutation.isPending
                    ? 'Cerrando sesiones...'
                    : 'Cerrar todas las sesiones (incluida esta)'}
                </ThemedText>
              </Pressable>
            )}
          </Card>

          {isGerente && miEmpresa.data?.empresa && (
            <Card style={styles.card}>
              <ThemedText type="default" style={styles.cardTitle}>
                Configuración de empresa
              </ThemedText>
              <ThemedText type="small" themeColor="textMuted">
                {miEmpresa.data.empresa.nombre}
              </ThemedText>

              <Pressable
                onPress={() => handleToggleEmpresaConfig('pausaCuentaComoTrabajo')}
                disabled={actualizarConfig.isPending}
                style={[styles.toggleRow, { opacity: actualizarConfig.isPending ? 0.6 : 1 }]}>
                <ThemedText type="small" themeColor="textSecondary" style={styles.toggleLabel}>
                  Pausa cuenta como trabajo
                </ThemedText>
                <StatusBadge
                  label={miEmpresa.data.empresa.pausaCuentaComoTrabajo ? 'Sí' : 'No'}
                  bg={miEmpresa.data.empresa.pausaCuentaComoTrabajo ? theme.primary : theme.neutralIconBg}
                  text={miEmpresa.data.empresa.pausaCuentaComoTrabajo ? '#ffffff' : theme.textMuted}
                />
              </Pressable>

              <Pressable
                onPress={() => handleToggleEmpresaConfig('geolocalizacionFichaje')}
                disabled={actualizarConfig.isPending}
                style={[styles.toggleRow, { opacity: actualizarConfig.isPending ? 0.6 : 1 }]}>
                <ThemedText type="small" themeColor="textSecondary" style={styles.toggleLabel}>
                  Guardar ubicación al fichar
                </ThemedText>
                <StatusBadge
                  label={miEmpresa.data.empresa.geolocalizacionFichaje ? 'Sí' : 'No'}
                  bg={miEmpresa.data.empresa.geolocalizacionFichaje ? theme.primary : theme.neutralIconBg}
                  text={miEmpresa.data.empresa.geolocalizacionFichaje ? '#ffffff' : theme.textMuted}
                />
              </Pressable>

              {empresaConfigFeedback && (
                <View
                  style={[
                    styles.feedbackBanner,
                    {
                      backgroundColor: empresaConfigFeedback.type === 'success' ? theme.successBg : theme.errorBg,
                      borderColor: empresaConfigFeedback.type === 'success' ? theme.successBorder : theme.errorBorder,
                    },
                  ]}>
                  <ThemedText
                    type="small"
                    style={{ color: empresaConfigFeedback.type === 'success' ? theme.successText : theme.errorText }}>
                    {empresaConfigFeedback.message}
                  </ThemedText>
                </View>
              )}
            </Card>
          )}

          <Pressable
            onPress={handleLogout}
            disabled={isLoggingOut}
            style={({ pressed }) => [
              styles.logoutButton,
              {
                borderColor: theme.errorBorder,
                opacity: pressed || isLoggingOut ? 0.7 : 1,
              },
            ]}>
            <ThemedText type="smallBold" style={{ color: theme.errorText }}>
              {isLoggingOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
            </ThemedText>
          </Pressable>
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
  errorText: {
    textAlign: 'center',
  },
  field: {
    gap: Spacing.half,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderRadius: Radius.input,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: SoraFonts.regular,
  },
  feedbackBanner: {
    borderWidth: 1,
    borderRadius: Radius.input,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.input,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  sessionInfo: {
    flex: 1,
    gap: 2,
  },
  revokeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  toggleLabel: {
    flex: 1,
  },
  primaryButton: {
    borderRadius: Radius.input,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: SoraFonts.semiBold,
  },
  logoutButton: {
    borderWidth: 1,
    borderRadius: Radius.input,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
