import type { EmpresaEntryDto } from '@gestor-rrhh/shared';
import { Redirect, router } from 'expo-router';
import { ChevronLeft, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, SoraFonts, Spacing, glowShadow } from '@/constants/theme';
import { useActualizarConfigEmpresa, useCrearEmpresaAdmin, useEliminarEmpresaAdmin, useEmpresasAdmin } from '@/hooks/use-empresas-admin';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/store/auth-store';

type Feedback = { type: 'success' | 'error'; message: string };

const crearErrorMessages: Record<string, string> = {
  'cif-duplicado': 'Ese CIF ya está registrado.',
  'nombre-duplicado': 'Ya existe una empresa con ese nombre.',
};

const eliminarErrorMessages: Record<string, string> = {
  'not-found': 'Empresa no encontrada.',
  'has-admins': 'No se puede eliminar: hay administradores asociados.',
  'has-blockers': 'No se puede eliminar: hay usuarios, departamentos o centros asociados.',
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

function ConfigToggle({
  label,
  value,
  onToggle,
  disabled,
}: {
  label: string;
  value: boolean;
  onToggle: () => void;
  disabled: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable onPress={onToggle} disabled={disabled} style={[styles.toggleRow, { opacity: disabled ? 0.6 : 1 }]}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.toggleLabel}>
        {label}
      </ThemedText>
      <StatusBadge
        label={value ? 'Sí' : 'No'}
        bg={value ? theme.primary : theme.neutralIconBg}
        text={value ? '#ffffff' : theme.textMuted}
      />
    </Pressable>
  );
}

function EmpresaRow({ empresa }: { empresa: EmpresaEntryDto }) {
  const theme = useTheme();
  const actualizarConfig = useActualizarConfigEmpresa();
  const eliminar = useEliminarEmpresaAdmin();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteFeedback, setDeleteFeedback] = useState<Feedback | null>(null);

  const handleToggle = (field: 'pausaCuentaComoTrabajo' | 'geolocalizacionFichaje') => {
    actualizarConfig.mutate({
      id: empresa.id,
      input: {
        pausaCuentaComoTrabajo: field === 'pausaCuentaComoTrabajo' ? !empresa.pausaCuentaComoTrabajo : empresa.pausaCuentaComoTrabajo,
        geolocalizacionFichaje: field === 'geolocalizacionFichaje' ? !empresa.geolocalizacionFichaje : empresa.geolocalizacionFichaje,
      },
    });
  };

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleteFeedback(null);
    eliminar.mutate(empresa.id, {
      onSuccess: (result) => {
        setConfirmDelete(false);
        if (result.outcome !== 'ok') {
          setDeleteFeedback({ type: 'error', message: eliminarErrorMessages[result.outcome] ?? 'No se pudo eliminar.' });
        }
      },
      onError: () => {
        setConfirmDelete(false);
        setDeleteFeedback({ type: 'error', message: 'No se pudo eliminar la empresa.' });
      },
    });
  };

  return (
    <View style={[styles.item, { borderColor: theme.cardBorder }]}>
      <View style={styles.itemHeader}>
        <ThemedText type="smallBold">{empresa.nombre}</ThemedText>
        <ThemedText type="small" themeColor="textMuted">
          {empresa.cif}
        </ThemedText>
      </View>
      <ThemedText type="small" themeColor="textMuted">
        {empresa.usuariosCount} usuarios · {empresa.departamentosCount} departamentos · {empresa.centrosTrabajoCount} centros
      </ThemedText>

      <ConfigToggle
        label="Pausa cuenta como trabajo"
        value={empresa.pausaCuentaComoTrabajo}
        onToggle={() => handleToggle('pausaCuentaComoTrabajo')}
        disabled={actualizarConfig.isPending}
      />
      <ConfigToggle
        label="Geolocalización en el fichaje"
        value={empresa.geolocalizacionFichaje}
        onToggle={() => handleToggle('geolocalizacionFichaje')}
        disabled={actualizarConfig.isPending}
      />

      <FeedbackBanner feedback={deleteFeedback} />
      <Pressable
        onPress={handleDelete}
        disabled={eliminar.isPending}
        style={({ pressed }) => [
          styles.dangerButton,
          {
            backgroundColor: confirmDelete ? theme.errorText : 'transparent',
            borderColor: theme.errorBorder,
            opacity: eliminar.isPending ? 0.6 : pressed ? 0.8 : 1,
          },
        ]}>
        <ThemedText type="small" style={{ color: confirmDelete ? '#ffffff' : theme.errorText }}>
          {eliminar.isPending ? 'Eliminando...' : confirmDelete ? '¿Seguro? Toca para confirmar' : 'Eliminar empresa'}
        </ThemedText>
      </Pressable>
      {confirmDelete && (
        <Pressable onPress={() => setConfirmDelete(false)}>
          <ThemedText type="small" themeColor="textMuted" style={styles.cancelDelete}>
            Cancelar
          </ThemedText>
        </Pressable>
      )}
    </View>
  );
}

export default function EmpresasScreen() {
  const theme = useTheme();
  const role = useAuthStore((state) => state.user?.role);

  const [showForm, setShowForm] = useState(false);
  const [nombre, setNombre] = useState('');
  const [cif, setCif] = useState('');
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const empresas = useEmpresasAdmin();
  const crear = useCrearEmpresaAdmin();

  if (role !== 'ADMIN_SISTEMA') {
    return <Redirect href="/" />;
  }

  const canSubmit = nombre.trim().length > 0 && cif.trim().length >= 6 && !crear.isPending;

  const handleSubmit = () => {
    if (!canSubmit) return;
    setFeedback(null);
    crear.mutate(
      { nombre: nombre.trim(), cif: cif.trim() },
      {
        onSuccess: (result) => {
          if (result.outcome === 'ok') {
            setFeedback({ type: 'success', message: 'Empresa creada correctamente.' });
            setNombre('');
            setCif('');
            setShowForm(false);
          } else {
            setFeedback({ type: 'error', message: crearErrorMessages[result.outcome] ?? 'No se pudo crear la empresa.' });
          }
        },
        onError: () => setFeedback({ type: 'error', message: 'No se pudo crear la empresa.' }),
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
          <ThemedText type="heading" style={styles.headerTitle}>
            Empresas
          </ThemedText>
          <Pressable
            onPress={() => setShowForm((v) => !v)}
            style={({ pressed }) => [styles.newButton, { backgroundColor: pressed ? theme.primaryPressed : theme.primary }]}>
            <Plus size={18} color="#ffffff" />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {showForm && (
            <Card style={styles.card}>
              <ThemedText type="default" style={styles.sectionTitle}>
                Nueva empresa
              </ThemedText>
              <View style={styles.field}>
                <ThemedText type="small" themeColor="textSecondary">
                  Nombre
                </ThemedText>
                <TextInput
                  value={nombre}
                  onChangeText={setNombre}
                  placeholder="Nombre de la empresa"
                  placeholderTextColor={theme.textMuted}
                  style={[
                    styles.input,
                    { color: theme.text, borderColor: theme.cardBorder, backgroundColor: theme.backgroundElement },
                  ]}
                />
              </View>
              <View style={styles.field}>
                <ThemedText type="small" themeColor="textSecondary">
                  CIF
                </ThemedText>
                <TextInput
                  value={cif}
                  onChangeText={setCif}
                  placeholder="B12345678"
                  placeholderTextColor={theme.textMuted}
                  autoCapitalize="characters"
                  style={[
                    styles.input,
                    { color: theme.text, borderColor: theme.cardBorder, backgroundColor: theme.backgroundElement },
                  ]}
                />
              </View>
              <FeedbackBanner feedback={feedback} />
              <Pressable
                onPress={handleSubmit}
                disabled={!canSubmit}
                style={({ pressed }) => [
                  styles.submitButton,
                  glowShadow(theme.primary),
                  { backgroundColor: pressed || crear.isPending ? theme.primaryPressed : theme.primary, opacity: canSubmit ? 1 : 0.5 },
                ]}>
                <ThemedText style={styles.submitButtonText}>{crear.isPending ? 'Creando...' : 'Crear empresa'}</ThemedText>
              </Pressable>
            </Card>
          )}

          <Card style={styles.card}>
            <View style={styles.sectionHeader}>
              <ThemedText type="default" style={[styles.sectionTitle, styles.sectionTitleFlex]}>
                Empresas registradas
              </ThemedText>
              {!empresas.isLoading && <ThemedText type="small" themeColor="textMuted">{empresas.data?.empresas.length ?? 0}</ThemedText>}
            </View>

            {empresas.isLoading && <ActivityIndicator color={theme.primary} />}

            {!empresas.isLoading && (empresas.data?.empresas.length ?? 0) === 0 && (
              <ThemedText type="small" themeColor="textMuted" style={styles.emptyText}>
                No hay empresas registradas.
              </ThemedText>
            )}

            {empresas.data?.empresas.map((empresa) => (
              <EmpresaRow key={empresa.id} empresa={empresa} />
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
    gap: Spacing.two,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  dangerButton: {
    borderWidth: 1,
    borderRadius: Radius.input,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.half,
  },
  cancelDelete: {
    textAlign: 'center',
    marginTop: Spacing.half,
  },
});
