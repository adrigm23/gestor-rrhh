import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import type { FichajeEmpresaEntryDto } from '@gestor-rrhh/shared';
import { Redirect, router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/card';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { StatusBadge } from '@/components/ui/status-badge';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, SoraFonts, Spacing } from '@/constants/theme';
import { useEmpresasOptions } from '@/hooks/use-empleados-directorio';
import {
  useCrearExportacion,
  useEmpleadosPorEmpresa,
  useExportacionStatus,
  useFichajesEmpresa,
} from '@/hooks/use-fichajes-empresa';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/store/auth-store';
import type { FichajesEmpresaFilters } from '@/api/fichajes-empresa';

const estadoOptions: { value: FichajesEmpresaFilters['estado']; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'abierto', label: 'Abierto' },
  { value: 'cerrado', label: 'Cerrado' },
];

const tipoOptions: { value: FichajesEmpresaFilters['tipo']; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'JORNADA', label: 'Jornada' },
  { value: 'PAUSA_COMIDA', label: 'Pausa comida' },
  { value: 'DESCANSO', label: 'Descanso' },
  { value: 'MEDICO', label: 'Médico' },
];

const tipoLabel: Record<string, string> = {
  JORNADA: 'Jornada',
  PAUSA_COMIDA: 'Pausa comida',
  DESCANSO: 'Descanso',
  MEDICO: 'Médico',
};

function toDateInput(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function defaultRange(): { from: string; to: string } {
  const today = new Date();
  const from = new Date(today);
  from.setDate(today.getDate() - 7);
  return { from: toDateInput(from), to: toDateInput(today) };
}

function formatDuration(entradaIso: string, salidaIso: string | null): string {
  if (!salidaIso) return 'En curso';
  const ms = Math.max(0, new Date(salidaIso).getTime() - new Date(entradaIso).getTime());
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} h`;
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        { borderColor: selected ? theme.primary : theme.cardBorder, backgroundColor: selected ? theme.primary : 'transparent' },
      ]}>
      <ThemedText type="small" style={{ color: selected ? '#ffffff' : theme.text }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const theme = useTheme();
  const [showPicker, setShowPicker] = useState(false);

  const handleChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowPicker(false);
    if (event.type === 'set' && selectedDate) {
      onChange(toDateInput(selectedDate));
    }
  };

  return (
    <View style={styles.field}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <Pressable
        onPress={() => setShowPicker(true)}
        style={[styles.dateInput, { borderColor: theme.cardBorder, backgroundColor: theme.backgroundElement }]}>
        <ThemedText style={{ color: theme.text }}>{value}</ThemedText>
      </Pressable>
      {showPicker && (
        <DateTimePicker value={new Date(`${value}T00:00:00`)} mode="date" display="default" onChange={handleChange} />
      )}
    </View>
  );
}

function ExportButton({
  label,
  tipo,
  filters,
}: {
  label: string;
  tipo: 'FICHAJES' | 'FICHAJES_EMPRESAS';
  filters: FichajesEmpresaFilters;
}) {
  const theme = useTheme();
  const crear = useCrearExportacion();
  const [jobId, setJobId] = useState<string | null>(null);
  const status = useExportacionStatus(jobId);

  const handlePress = () => {
    setJobId(null);
    crear.mutate(
      {
        tipo,
        empresaId: tipo === 'FICHAJES' ? filters.empresaId : undefined,
        empleadoId: tipo === 'FICHAJES' ? filters.empleadoId : undefined,
        from: filters.from,
        to: filters.to,
        estado: filters.estado,
        tipoFiltro: filters.tipo,
      },
      {
        onSuccess: (result) => {
          if (result.outcome === 'ok') {
            setJobId(result.jobId);
          }
        },
      },
    );
  };

  const errorMessages: Record<string, string> = {
    'invalid-tipo': 'Tipo inválido.',
    'empresa-requerida': 'Selecciona una empresa.',
    'invalid-empresa': 'Empresa inválida.',
    'invalid-empleado': 'Empleado inválido.',
    'empleado-fuera-de-empresa': 'El empleado no pertenece a la empresa seleccionada.',
  };

  const createResult = crear.data;
  const createFailed = createResult && createResult.outcome !== 'ok';

  return (
    <View style={styles.exportButtonGroup}>
      <Pressable
        onPress={handlePress}
        disabled={crear.isPending}
        style={({ pressed }) => [
          styles.outlineButton,
          { borderColor: theme.cardBorder, opacity: crear.isPending ? 0.6 : pressed ? 0.8 : 1 },
        ]}>
        <ThemedText type="smallBold">{crear.isPending ? 'Creando...' : label}</ThemedText>
      </Pressable>
      {createFailed && (
        <ThemedText type="small" style={{ color: theme.errorText }}>
          {errorMessages[createResult.outcome] ?? 'No se pudo crear la exportación.'}
        </ThemedText>
      )}
      {jobId && status.data && (
        <ThemedText type="small" themeColor="textMuted">
          {status.data.status === 'LISTO' && status.data.url ? (
            <ThemedText
              type="small"
              style={{ color: theme.primary }}
              onPress={() => Linking.openURL(status.data!.url as string)}>
              Descargar CSV
            </ThemedText>
          ) : status.data.status === 'ERROR' ? (
            (status.data.error ?? 'Error generando la exportación.')
          ) : (
            'Generando...'
          )}
        </ThemedText>
      )}
    </View>
  );
}

export default function FichajesEmpresaScreen() {
  const theme = useTheme();
  const role = useAuthStore((state) => state.user?.role);
  const isAdmin = role === 'ADMIN_SISTEMA';

  const range = defaultRange();
  const [empresaId, setEmpresaId] = useState<string | undefined>(undefined);
  const [empleadoId, setEmpleadoId] = useState<string | undefined>(undefined);
  const [estado, setEstado] = useState<FichajesEmpresaFilters['estado']>('todos');
  const [tipo, setTipo] = useState<FichajesEmpresaFilters['tipo']>('todos');
  const [from, setFrom] = useState(range.from);
  const [to, setTo] = useState(range.to);

  const empresas = useEmpresasOptions();
  const empleados = useEmpleadosPorEmpresa(empresaId ?? null, isAdmin ? Boolean(empresaId) : true);

  const filters: FichajesEmpresaFilters = { empresaId, empleadoId, estado, tipo, from, to };
  const fichajes = useFichajesEmpresa(filters);

  if (role !== 'GERENTE' && role !== 'ADMIN_SISTEMA') {
    return <Redirect href="/" />;
  }

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={[styles.backButton, { borderColor: theme.cardBorder }]}>
            <ChevronLeft size={18} color={theme.text} />
          </Pressable>
          <ThemedText type="heading">Fichajes de empresa</ThemedText>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Card style={styles.card}>
            <ThemedText type="default" style={styles.sectionTitle}>
              Filtros
            </ThemedText>

            {isAdmin && (
              <View style={styles.field}>
                <ThemedText type="small" themeColor="textSecondary">
                  Empresa
                </ThemedText>
                {empresas.isLoading ? (
                  <ActivityIndicator color={theme.primary} />
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                    <Chip
                      label="Todas"
                      selected={!empresaId}
                      onPress={() => {
                        setEmpresaId(undefined);
                        setEmpleadoId(undefined);
                      }}
                    />
                    {empresas.data?.empresas.map((item) => (
                      <Chip
                        key={item.id}
                        label={item.nombre}
                        selected={empresaId === item.id}
                        onPress={() => {
                          setEmpresaId(item.id);
                          setEmpleadoId(undefined);
                        }}
                      />
                    ))}
                  </ScrollView>
                )}
              </View>
            )}

            <View style={styles.field}>
              <ThemedText type="small" themeColor="textSecondary">
                Empleado
              </ThemedText>
              {empleados.isLoading ? (
                <ActivityIndicator color={theme.primary} />
              ) : (empleados.data?.empleados.length ?? 0) === 0 ? (
                <ThemedText type="small" themeColor="textMuted">
                  {isAdmin && !empresaId ? 'Selecciona una empresa.' : 'No hay empleados.'}
                </ThemedText>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                  <Chip label="Todos" selected={!empleadoId} onPress={() => setEmpleadoId(undefined)} />
                  {empleados.data?.empleados.map((item) => (
                    <Chip
                      key={item.id}
                      label={item.nombre}
                      selected={empleadoId === item.id}
                      onPress={() => setEmpleadoId(item.id)}
                    />
                  ))}
                </ScrollView>
              )}
            </View>

            <View style={styles.field}>
              <ThemedText type="small" themeColor="textSecondary">
                Estado
              </ThemedText>
              <SegmentedControl
                options={estadoOptions as { value: 'todos' | 'abierto' | 'cerrado'; label: string }[]}
                value={estado ?? 'todos'}
                onChange={setEstado}
              />
            </View>

            <View style={styles.field}>
              <ThemedText type="small" themeColor="textSecondary">
                Tipo
              </ThemedText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                {tipoOptions.map((opt) => (
                  <Chip key={opt.label} label={opt.label} selected={tipo === opt.value} onPress={() => setTipo(opt.value)} />
                ))}
              </ScrollView>
            </View>

            <View style={styles.dateRow}>
              <View style={styles.dateField}>
                <DateField label="Desde" value={from} onChange={setFrom} />
              </View>
              <View style={styles.dateField}>
                <DateField label="Hasta" value={to} onChange={setTo} />
              </View>
            </View>
          </Card>

          <Card style={styles.card}>
            <ThemedText type="default" style={styles.sectionTitle}>
              Exportar
            </ThemedText>
            <ExportButton label="Generar informe" tipo="FICHAJES" filters={filters} />
            <ExportButton label="Generar por empresas" tipo="FICHAJES_EMPRESAS" filters={filters} />
          </Card>

          <Card style={styles.card}>
            <View style={styles.sectionHeader}>
              <ThemedText type="default" style={styles.sectionTitle}>
                Resultados
              </ThemedText>
              {!fichajes.isLoading && <ThemedText type="small" themeColor="textMuted">{fichajes.data?.total ?? 0}</ThemedText>}
            </View>

            {fichajes.isLoading && <ActivityIndicator color={theme.primary} />}

            {!fichajes.isLoading && fichajes.data?.canQuery === false && (
              <ThemedText type="small" themeColor="textMuted" style={styles.emptyText}>
                No tienes una empresa asignada para consultar fichajes.
              </ThemedText>
            )}

            {!fichajes.isLoading && fichajes.data?.canQuery !== false && (fichajes.data?.fichajes.length ?? 0) === 0 && (
              <ThemedText type="small" themeColor="textMuted" style={styles.emptyText}>
                No hay fichajes en el periodo seleccionado.
              </ThemedText>
            )}

            {fichajes.data && fichajes.data.total > fichajes.data.fichajes.length && (
              <ThemedText type="small" themeColor="textMuted">
                Mostrando {fichajes.data.fichajes.length} de {fichajes.data.total}. Acota los filtros para ver el resto.
              </ThemedText>
            )}

            {fichajes.data?.fichajes.map((item: FichajeEmpresaEntryDto) => (
              <View key={item.id} style={[styles.item, { borderColor: theme.cardBorder }]}>
                <View style={styles.itemHeader}>
                  <ThemedText type="smallBold" style={styles.itemHeaderText}>
                    {item.empleadoNombre}
                  </ThemedText>
                  <StatusBadge
                    label={item.salida ? 'Cerrado' : 'Abierto'}
                    bg={item.salida ? theme.successBg : theme.warningBg}
                    text={item.salida ? theme.successText : theme.warningBadgeText}
                  />
                </View>
                <ThemedText type="small" themeColor="textMuted">
                  {isAdmin && item.empresaNombre ? `${item.empresaNombre} · ` : ''}
                  {tipoLabel[item.tipo] ?? item.tipo}
                  {item.editado ? ' · Editado' : ''}
                </ThemedText>
                <ThemedText type="small" themeColor="textMuted">
                  {new Intl.DateTimeFormat('es-ES', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(item.entrada))}
                  {item.salida
                    ? ` – ${new Intl.DateTimeFormat('es-ES', { timeStyle: 'short' }).format(new Date(item.salida))}`
                    : ' – en curso'}
                  {' · '}
                  {formatDuration(item.entrada, item.salida)}
                </ThemedText>
                {(item.latitud !== null || item.latitudSalida !== null) && (
                  <View style={styles.locationRow}>
                    {item.latitud !== null && item.longitud !== null && (
                      <Pressable
                        onPress={() => Linking.openURL(`https://www.google.com/maps?q=${item.latitud},${item.longitud}`)}>
                        <ThemedText type="small" style={{ color: theme.primary }}>
                          Ver entrada
                        </ThemedText>
                      </Pressable>
                    )}
                    {item.latitudSalida !== null && item.longitudSalida !== null && (
                      <Pressable
                        onPress={() =>
                          Linking.openURL(`https://www.google.com/maps?q=${item.latitudSalida},${item.longitudSalida}`)
                        }>
                        <ThemedText type="small" style={{ color: theme.primary }}>
                          Ver salida
                        </ThemedText>
                      </Pressable>
                    )}
                  </View>
                )}
              </View>
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
  sectionTitle: {
    fontFamily: SoraFonts.semiBold,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  field: {
    gap: Spacing.half,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  dateRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  dateField: {
    flex: 1,
  },
  dateInput: {
    borderWidth: 1,
    borderRadius: Radius.input,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  exportButtonGroup: {
    gap: Spacing.half,
  },
  outlineButton: {
    borderWidth: 1,
    borderRadius: Radius.input,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
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
  locationRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  itemHeaderText: {
    flex: 1,
  },
});
