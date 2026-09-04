import { Redirect, router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, SoraFonts, Spacing, glowShadow } from '@/constants/theme';
import { useCrearUsuario, useDepartamentosOptions, useEmpresasOptions } from '@/hooks/use-empleados-directorio';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/store/auth-store';

type Feedback = { type: 'success' | 'error'; message: string };

const createErrorMessages: Record<string, string> = {
  'invalid-dni': 'DNI/NIE inválido.',
  'email-taken': 'Ese email ya está en uso.',
  'dni-taken': 'Ese DNI/NIE ya está en uso.',
  'invalid-departamento': 'Departamento inválido.',
};

export default function NuevoEmpleadoScreen() {
  const theme = useTheme();
  const role = useAuthStore((state) => state.user?.role);

  const [nombre, setNombre] = useState('');
  const [dni, setDni] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rol, setRol] = useState<'EMPLEADO' | 'GERENTE'>('EMPLEADO');
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [departamentoId, setDepartamentoId] = useState<string | null>(null);
  const [horasSemanales, setHorasSemanales] = useState('');
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const empresas = useEmpresasOptions();
  const departamentos = useDepartamentosOptions();
  const crearUsuario = useCrearUsuario();

  if (role !== 'ADMIN_SISTEMA') {
    return <Redirect href="/" />;
  }

  const departamentosEmpresa = (departamentos.data?.departamentos ?? []).filter(
    (d) => !empresaId || d.empresaId === empresaId,
  );

  const canSubmit =
    nombre.trim().length > 0 &&
    dni.trim().length > 0 &&
    email.trim().length > 0 &&
    password.length >= 10 &&
    Boolean(empresaId) &&
    (rol !== 'EMPLEADO' || Number.parseFloat(horasSemanales.replace(',', '.')) > 0) &&
    !crearUsuario.isPending;

  const resetForm = () => {
    setNombre('');
    setDni('');
    setEmail('');
    setPassword('');
    setRol('EMPLEADO');
    setEmpresaId(null);
    setDepartamentoId(null);
    setHorasSemanales('');
  };

  const handleSubmit = () => {
    if (!canSubmit || !empresaId) return;
    setFeedback(null);
    const horas = rol === 'EMPLEADO' ? Number.parseFloat(horasSemanales.replace(',', '.')) : undefined;
    crearUsuario.mutate(
      {
        nombre: nombre.trim(),
        dni: dni.trim(),
        email: email.trim(),
        password,
        rol,
        empresaId,
        departamentoId: rol === 'EMPLEADO' && departamentoId ? departamentoId : undefined,
        horasSemanales: horas,
      },
      {
        onSuccess: (result) => {
          if (result.outcome === 'ok') {
            setFeedback({ type: 'success', message: 'Usuario creado correctamente.' });
            resetForm();
          } else {
            setFeedback({ type: 'error', message: createErrorMessages[result.outcome] ?? 'No se pudo crear el usuario.' });
          }
        },
        onError: () => setFeedback({ type: 'error', message: 'No se pudo crear el usuario.' }),
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
          <ThemedText type="heading">Nuevo empleado</ThemedText>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Card style={styles.card}>
            <View style={styles.field}>
              <ThemedText type="small" themeColor="textSecondary">
                Nombre
              </ThemedText>
              <TextInput
                value={nombre}
                onChangeText={setNombre}
                placeholder="Nombre completo"
                placeholderTextColor={theme.textMuted}
                style={[
                  styles.input,
                  { color: theme.text, borderColor: theme.cardBorder, backgroundColor: theme.backgroundElement },
                ]}
              />
            </View>

            <View style={styles.field}>
              <ThemedText type="small" themeColor="textSecondary">
                DNI/NIE
              </ThemedText>
              <TextInput
                value={dni}
                onChangeText={setDni}
                placeholder="12345678A"
                placeholderTextColor={theme.textMuted}
                autoCapitalize="characters"
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
                placeholder="nombre@empresa.com"
                placeholderTextColor={theme.textMuted}
                autoCapitalize="none"
                keyboardType="email-address"
                style={[
                  styles.input,
                  { color: theme.text, borderColor: theme.cardBorder, backgroundColor: theme.backgroundElement },
                ]}
              />
            </View>

            <View style={styles.field}>
              <ThemedText type="small" themeColor="textSecondary">
                Contraseña inicial
              </ThemedText>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Mín. 8 caracteres"
                placeholderTextColor={theme.textMuted}
                secureTextEntry
                style={[
                  styles.input,
                  { color: theme.text, borderColor: theme.cardBorder, backgroundColor: theme.backgroundElement },
                ]}
              />
            </View>

            <View style={styles.field}>
              <ThemedText type="small" themeColor="textSecondary">
                Rol
              </ThemedText>
              <View style={styles.pickerRow}>
                {(['EMPLEADO', 'GERENTE'] as const).map((opt) => (
                  <Pressable
                    key={opt}
                    onPress={() => setRol(opt)}
                    style={[
                      styles.pickerChip,
                      {
                        borderColor: rol === opt ? theme.primary : theme.cardBorder,
                        backgroundColor: rol === opt ? theme.primary : 'transparent',
                      },
                    ]}>
                    <ThemedText type="small" style={{ color: rol === opt ? '#ffffff' : theme.text }}>
                      {opt === 'EMPLEADO' ? 'Empleado' : 'Gerente'}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.field}>
              <ThemedText type="small" themeColor="textSecondary">
                Empresa
              </ThemedText>
              {empresas.isLoading ? (
                <ActivityIndicator color={theme.primary} />
              ) : (
                <View style={styles.pickerRow}>
                  {empresas.data?.empresas.map((item) => (
                    <Pressable
                      key={item.id}
                      onPress={() => {
                        setEmpresaId(item.id);
                        setDepartamentoId(null);
                      }}
                      style={[
                        styles.pickerChip,
                        {
                          borderColor: empresaId === item.id ? theme.primary : theme.cardBorder,
                          backgroundColor: empresaId === item.id ? theme.primary : 'transparent',
                        },
                      ]}>
                      <ThemedText type="small" style={{ color: empresaId === item.id ? '#ffffff' : theme.text }}>
                        {item.nombre}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            {rol === 'EMPLEADO' && (
              <>
                <View style={styles.field}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Departamento (opcional)
                  </ThemedText>
                  {departamentosEmpresa.length === 0 ? (
                    <ThemedText type="small" themeColor="textMuted">
                      Sin departamentos disponibles.
                    </ThemedText>
                  ) : (
                    <View style={styles.pickerRow}>
                      {departamentosEmpresa.map((item) => (
                        <Pressable
                          key={item.id}
                          onPress={() => setDepartamentoId(departamentoId === item.id ? null : item.id)}
                          style={[
                            styles.pickerChip,
                            {
                              borderColor: departamentoId === item.id ? theme.primary : theme.cardBorder,
                              backgroundColor: departamentoId === item.id ? theme.primary : 'transparent',
                            },
                          ]}>
                          <ThemedText type="small" style={{ color: departamentoId === item.id ? '#ffffff' : theme.text }}>
                            {item.nombre}
                          </ThemedText>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>

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
              </>
            )}

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
                  backgroundColor: pressed || crearUsuario.isPending ? theme.primaryPressed : theme.primary,
                  opacity: canSubmit ? 1 : 0.5,
                },
              ]}>
              <ThemedText style={styles.submitButtonText}>
                {crearUsuario.isPending ? 'Creando...' : 'Crear usuario'}
              </ThemedText>
            </Pressable>
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
  card: {
    gap: Spacing.three,
  },
  field: {
    gap: Spacing.half,
  },
  input: {
    borderWidth: 1,
    borderRadius: Radius.input,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: SoraFonts.regular,
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
});
