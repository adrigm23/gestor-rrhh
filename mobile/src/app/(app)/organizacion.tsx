import type { CentroTrabajoEntryDto, DepartamentoEntryDto, GerenteOptionDto } from '@gestor-rrhh/shared';
import { Redirect, router } from 'expo-router';
import { ChevronLeft, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/card';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, SoraFonts, Spacing, glowShadow } from '@/constants/theme';
import {
  useCentros,
  useCrearCentroTrabajo,
  useCrearDepartamento,
  useDepartamentosOrg,
  useEmpresasOptions,
  useGerentesOptions,
  useUpdateCentroDireccion,
} from '@/hooks/use-organizacion';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/store/auth-store';

type Tab = 'centros' | 'departamentos';
type Feedback = { type: 'success' | 'error'; message: string };

const crearCentroErrorMessages: Record<string, string> = {
  'empresa-requerida': 'Empresa requerida.',
  'gerente-invalido': 'Gerente inválido.',
  'nombre-duplicado': 'Ya existe un centro con ese nombre.',
};

const crearDepartamentoErrorMessages: Record<string, string> = {
  'empresa-requerida': 'Empresa requerida.',
  'gerente-invalido': 'Gerente inválido.',
  'centro-invalido': 'Centro de trabajo inválido.',
  'nombre-duplicado': 'Ya existe un departamento con ese nombre.',
};

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

function GerentePicker({
  gerentes,
  selectedId,
  onSelect,
}: {
  gerentes: GerenteOptionDto[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const theme = useTheme();
  if (gerentes.length === 0) {
    return (
      <ThemedText type="small" themeColor="textMuted">
        No hay gerentes disponibles.
      </ThemedText>
    );
  }
  return (
    <View style={styles.pickerRow}>
      <Pressable
        onPress={() => onSelect(null)}
        style={[styles.pickerChip, { borderColor: selectedId === null ? theme.primary : theme.cardBorder, backgroundColor: selectedId === null ? theme.primary : 'transparent' }]}>
        <ThemedText type="small" style={{ color: selectedId === null ? '#ffffff' : theme.text }}>
          Sin gerente
        </ThemedText>
      </Pressable>
      {gerentes.map((g) => (
        <Pressable
          key={g.id}
          onPress={() => onSelect(g.id)}
          style={[styles.pickerChip, { borderColor: selectedId === g.id ? theme.primary : theme.cardBorder, backgroundColor: selectedId === g.id ? theme.primary : 'transparent' }]}>
          <ThemedText type="small" style={{ color: selectedId === g.id ? '#ffffff' : theme.text }}>
            {g.nombre}
          </ThemedText>
        </Pressable>
      ))}
    </View>
  );
}

function CentroRow({ centro, isAdmin }: { centro: CentroTrabajoEntryDto; isAdmin: boolean }) {
  const theme = useTheme();
  const [direccion, setDireccion] = useState(centro.direccion ?? '');
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const updateDireccion = useUpdateCentroDireccion();
  const dirty = direccion !== (centro.direccion ?? '');

  const handleSave = () => {
    setFeedback(null);
    updateDireccion.mutate(
      { id: centro.id, direccion },
      {
        onSuccess: (result) => {
          if (result.outcome === 'ok') {
            setFeedback({ type: 'success', message: 'Dirección actualizada.' });
          } else {
            const messages: Record<string, string> = {
              'not-found': 'Centro no encontrado.',
              'out-of-scope': 'Centro fuera de tu empresa.',
            };
            setFeedback({ type: 'error', message: messages[result.outcome] ?? 'No se pudo actualizar.' });
          }
        },
        onError: () => setFeedback({ type: 'error', message: 'No se pudo actualizar la dirección.' }),
      },
    );
  };

  return (
    <View style={[styles.item, { borderColor: theme.cardBorder }]}>
      <ThemedText type="smallBold">{centro.nombre}</ThemedText>
      <ThemedText type="small" themeColor="textMuted">
        {centro.gerenteNombre ?? 'Sin gerente'}
        {isAdmin && centro.empresaNombre ? ` · ${centro.empresaNombre}` : ''}
        {' · '}
        {centro.departamentosCount} departamento{centro.departamentosCount === 1 ? '' : 's'}
      </ThemedText>
      <View style={styles.direccionRow}>
        <TextInput
          value={direccion}
          onChangeText={setDireccion}
          placeholder="Sin dirección"
          placeholderTextColor={theme.textMuted}
          style={[
            styles.direccionInput,
            { color: theme.text, borderColor: theme.cardBorder, backgroundColor: theme.backgroundElement },
          ]}
        />
        {dirty && (
          <Pressable
            onPress={handleSave}
            disabled={updateDireccion.isPending}
            style={({ pressed }) => [
              styles.saveChip,
              { backgroundColor: pressed || updateDireccion.isPending ? theme.primaryPressed : theme.primary },
            ]}>
            <ThemedText type="small" style={{ color: '#ffffff' }}>
              {updateDireccion.isPending ? '...' : 'Guardar'}
            </ThemedText>
          </Pressable>
        )}
      </View>
      <FeedbackBanner feedback={feedback} />
    </View>
  );
}

export default function OrganizacionScreen() {
  const theme = useTheme();
  const role = useAuthStore((state) => state.user?.role);
  const isAdmin = role === 'ADMIN_SISTEMA';

  const [tab, setTab] = useState<Tab>('centros');
  const [showForm, setShowForm] = useState(false);

  const centros = useCentros();
  const departamentos = useDepartamentosOrg();
  const gerentes = useGerentesOptions();
  const empresas = useEmpresasOptions();

  const crearCentro = useCrearCentroTrabajo();
  const crearDepartamento = useCrearDepartamento();

  const [nombre, setNombre] = useState('');
  const [gerenteId, setGerenteId] = useState<string | null>(null);
  const [centroTrabajoId, setCentroTrabajoId] = useState<string | null>(null);
  const [direccion, setDireccion] = useState('');
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  if (role !== 'GERENTE' && role !== 'ADMIN_SISTEMA') {
    return <Redirect href="/" />;
  }

  const resetForm = () => {
    setNombre('');
    setGerenteId(null);
    setCentroTrabajoId(null);
    setDireccion('');
    setEmpresaId(null);
  };

  const switchTab = (next: Tab) => {
    setTab(next);
    setShowForm(false);
    setFeedback(null);
    resetForm();
  };

  const canSubmit = nombre.trim().length > 0 && (!isAdmin || Boolean(empresaId)) && !crearCentro.isPending && !crearDepartamento.isPending;

  const handleSubmit = () => {
    if (!canSubmit) return;
    setFeedback(null);
    if (tab === 'centros') {
      crearCentro.mutate(
        {
          nombre: nombre.trim(),
          gerenteId: gerenteId ?? undefined,
          direccion: direccion.trim() || undefined,
          empresaId: isAdmin ? empresaId ?? undefined : undefined,
        },
        {
          onSuccess: (result) => {
            if (result.outcome === 'ok') {
              setFeedback({ type: 'success', message: 'Centro creado correctamente.' });
              resetForm();
              setShowForm(false);
            } else {
              setFeedback({ type: 'error', message: crearCentroErrorMessages[result.outcome] ?? 'No se pudo crear el centro.' });
            }
          },
          onError: () => setFeedback({ type: 'error', message: 'No se pudo crear el centro.' }),
        },
      );
    } else {
      crearDepartamento.mutate(
        {
          nombre: nombre.trim(),
          gerenteId: gerenteId ?? undefined,
          centroTrabajoId: centroTrabajoId ?? undefined,
          empresaId: isAdmin ? empresaId ?? undefined : undefined,
        },
        {
          onSuccess: (result) => {
            if (result.outcome === 'ok') {
              setFeedback({ type: 'success', message: 'Departamento creado correctamente.' });
              resetForm();
              setShowForm(false);
            } else {
              setFeedback({
                type: 'error',
                message: crearDepartamentoErrorMessages[result.outcome] ?? 'No se pudo crear el departamento.',
              });
            }
          },
          onError: () => setFeedback({ type: 'error', message: 'No se pudo crear el departamento.' }),
        },
      );
    }
  };

  const isPending = crearCentro.isPending || crearDepartamento.isPending;

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={[styles.backButton, { borderColor: theme.cardBorder }]}>
            <ChevronLeft size={18} color={theme.text} />
          </Pressable>
          <ThemedText type="heading" style={styles.headerTitle}>
            Organización
          </ThemedText>
          <Pressable
            onPress={() => setShowForm((v) => !v)}
            style={({ pressed }) => [styles.newButton, { backgroundColor: pressed ? theme.primaryPressed : theme.primary }]}>
            <Plus size={18} color="#ffffff" />
          </Pressable>
        </View>

        <View style={styles.tabRow}>
          <SegmentedControl
            options={[
              { value: 'centros', label: 'Centros' },
              { value: 'departamentos', label: 'Departamentos' },
            ]}
            value={tab}
            onChange={switchTab}
          />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {showForm && (
            <Card style={styles.card}>
              <ThemedText type="default" style={styles.sectionTitle}>
                {tab === 'centros' ? 'Nuevo centro de trabajo' : 'Nuevo departamento'}
              </ThemedText>

              <View style={styles.field}>
                <ThemedText type="small" themeColor="textSecondary">
                  Nombre
                </ThemedText>
                <TextInput
                  value={nombre}
                  onChangeText={setNombre}
                  placeholder="Nombre"
                  placeholderTextColor={theme.textMuted}
                  style={[
                    styles.input,
                    { color: theme.text, borderColor: theme.cardBorder, backgroundColor: theme.backgroundElement },
                  ]}
                />
              </View>

              {isAdmin && (
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
                          onPress={() => setEmpresaId(item.id)}
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
              )}

              <View style={styles.field}>
                <ThemedText type="small" themeColor="textSecondary">
                  Gerente (opcional)
                </ThemedText>
                {gerentes.isLoading ? (
                  <ActivityIndicator color={theme.primary} />
                ) : (
                  <GerentePicker gerentes={gerentes.data?.gerentes ?? []} selectedId={gerenteId} onSelect={setGerenteId} />
                )}
              </View>

              {tab === 'centros' && (
                <View style={styles.field}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Dirección (opcional)
                  </ThemedText>
                  <TextInput
                    value={direccion}
                    onChangeText={setDireccion}
                    placeholder="Dirección"
                    placeholderTextColor={theme.textMuted}
                    style={[
                    styles.input,
                    { color: theme.text, borderColor: theme.cardBorder, backgroundColor: theme.backgroundElement },
                  ]}
                  />
                </View>
              )}

              {tab === 'departamentos' && (
                <View style={styles.field}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Centro de trabajo (opcional)
                  </ThemedText>
                  {centros.isLoading ? (
                    <ActivityIndicator color={theme.primary} />
                  ) : (centros.data?.centros.length ?? 0) === 0 ? (
                    <ThemedText type="small" themeColor="textMuted">
                      No hay centros disponibles.
                    </ThemedText>
                  ) : (
                    <View style={styles.pickerRow}>
                      <Pressable
                        onPress={() => setCentroTrabajoId(null)}
                        style={[
                          styles.pickerChip,
                          { borderColor: centroTrabajoId === null ? theme.primary : theme.cardBorder, backgroundColor: centroTrabajoId === null ? theme.primary : 'transparent' },
                        ]}>
                        <ThemedText type="small" style={{ color: centroTrabajoId === null ? '#ffffff' : theme.text }}>
                          Sin centro
                        </ThemedText>
                      </Pressable>
                      {centros.data?.centros.map((item) => (
                        <Pressable
                          key={item.id}
                          onPress={() => setCentroTrabajoId(item.id)}
                          style={[
                            styles.pickerChip,
                            {
                              borderColor: centroTrabajoId === item.id ? theme.primary : theme.cardBorder,
                              backgroundColor: centroTrabajoId === item.id ? theme.primary : 'transparent',
                            },
                          ]}>
                          <ThemedText type="small" style={{ color: centroTrabajoId === item.id ? '#ffffff' : theme.text }}>
                            {item.nombre}
                          </ThemedText>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>
              )}

              <FeedbackBanner feedback={feedback} />

              <Pressable
                onPress={handleSubmit}
                disabled={!canSubmit}
                style={({ pressed }) => [
                  styles.submitButton,
                  glowShadow(theme.primary),
                  { backgroundColor: pressed || isPending ? theme.primaryPressed : theme.primary, opacity: canSubmit ? 1 : 0.5 },
                ]}>
                <ThemedText style={styles.submitButtonText}>{isPending ? 'Creando...' : 'Crear'}</ThemedText>
              </Pressable>
            </Card>
          )}

          {tab === 'centros' && (
            <Card style={styles.card}>
              <View style={styles.sectionHeader}>
                <ThemedText type="default" style={[styles.sectionTitle, styles.sectionTitleFlex]}>
                  Centros registrados
                </ThemedText>
                {!centros.isLoading && <ThemedText type="small" themeColor="textMuted">{centros.data?.centros.length ?? 0}</ThemedText>}
              </View>
              {centros.isLoading && <ActivityIndicator color={theme.primary} />}
              {!centros.isLoading && (centros.data?.centros.length ?? 0) === 0 && (
                <ThemedText type="small" themeColor="textMuted" style={styles.emptyText}>
                  No hay centros registrados.
                </ThemedText>
              )}
              {centros.data?.centros.map((centro) => (
                <CentroRow key={centro.id} centro={centro} isAdmin={isAdmin} />
              ))}
            </Card>
          )}

          {tab === 'departamentos' && (
            <Card style={styles.card}>
              <View style={styles.sectionHeader}>
                <ThemedText type="default" style={[styles.sectionTitle, styles.sectionTitleFlex]}>
                  Departamentos registrados
                </ThemedText>
                {!departamentos.isLoading && (
                  <ThemedText type="small" themeColor="textMuted">{departamentos.data?.departamentos.length ?? 0}</ThemedText>
                )}
              </View>
              {departamentos.isLoading && <ActivityIndicator color={theme.primary} />}
              {!departamentos.isLoading && (departamentos.data?.departamentos.length ?? 0) === 0 && (
                <ThemedText type="small" themeColor="textMuted" style={styles.emptyText}>
                  No hay departamentos registrados.
                </ThemedText>
              )}
              {departamentos.data?.departamentos.map((item: DepartamentoEntryDto) => (
                <View key={item.id} style={[styles.item, { borderColor: theme.cardBorder }]}>
                  <ThemedText type="smallBold">{item.nombre}</ThemedText>
                  <ThemedText type="small" themeColor="textMuted">
                    {item.gerenteNombre ?? 'Sin gerente'} · {item.centroTrabajoNombre ?? 'Sin centro'}
                    {isAdmin && item.empresaNombre ? ` · ${item.empresaNombre}` : ''}
                    {' · '}
                    {item.empleadosCount} empleado{item.empleadosCount === 1 ? '' : 's'}
                  </ThemedText>
                </View>
              ))}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },
  headerTitle: {
    flex: 1,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabRow: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },
  scrollContent: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  card: {
    gap: Spacing.three,
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
  direccionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.half,
  },
  direccionInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Radius.tile,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    fontFamily: SoraFonts.regular,
  },
  saveChip: {
    borderRadius: Radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
});
