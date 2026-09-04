import { Redirect, router } from 'expo-router';
import { ChevronLeft, ChevronRight, Plus, Search } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, SoraFonts, Spacing } from '@/constants/theme';
import { useDirectory, useEmpresasOptions } from '@/hooks/use-empleados-directorio';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/store/auth-store';
import type { DirectoryFilters } from '@/api/empleados-directorio';

const rolOptions: { value: DirectoryFilters['rol']; label: string }[] = [
  { value: undefined, label: 'Todos' },
  { value: 'EMPLEADO', label: 'Empleado' },
  { value: 'GERENTE', label: 'Gerente' },
];

const estadoOptions: { value: DirectoryFilters['estado']; label: string }[] = [
  { value: 'activos', label: 'Activos' },
  { value: 'baja', label: 'Baja' },
  { value: 'todos', label: 'Todos' },
];

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

export default function EmpleadosDirectorioScreen() {
  const theme = useTheme();
  const role = useAuthStore((state) => state.user?.role);
  const isAdmin = role === 'ADMIN_SISTEMA';

  const [queryInput, setQueryInput] = useState('');
  const [filters, setFilters] = useState<DirectoryFilters>({ estado: 'activos', page: 1 });
  const empresas = useEmpresasOptions();

  // Búsqueda con un pequeño debounce para no disparar una petición por
  // pulsación, igual de simple que el resto de esta pantalla (sin
  // dependencias extra).
  useEffect(() => {
    const timeout = setTimeout(() => {
      setFilters((prev) => ({ ...prev, query: queryInput || undefined, page: 1 }));
    }, 350);
    return () => clearTimeout(timeout);
  }, [queryInput]);

  const directory = useDirectory(filters);

  if (role !== 'GERENTE' && role !== 'ADMIN_SISTEMA') {
    return <Redirect href="/" />;
  }

  const total = directory.data?.total ?? 0;
  const pageSize = directory.data?.pageSize ?? 20;
  const page = directory.data?.page ?? 1;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={[styles.backButton, { borderColor: theme.cardBorder }]}>
            <ChevronLeft size={18} color={theme.text} />
          </Pressable>
          <ThemedText type="heading" style={styles.headerTitle}>
            Empleados
          </ThemedText>
          {isAdmin && (
            <Pressable
              onPress={() => router.push('/empleados/nuevo')}
              style={({ pressed }) => [
                styles.newButton,
                { backgroundColor: pressed ? theme.primaryPressed : theme.primary },
              ]}>
              <Plus size={18} color="#ffffff" />
            </Pressable>
          )}
        </View>

        <View style={styles.filtersArea}>
          <View style={[styles.searchBar, { borderColor: theme.cardBorder, backgroundColor: theme.backgroundElement }]}>
            <Search size={16} color={theme.textMuted} />
            <TextInput
              value={queryInput}
              onChangeText={setQueryInput}
              placeholder="Buscar por nombre, DNI o email"
              placeholderTextColor={theme.textMuted}
              style={[styles.searchInput, { color: theme.text }]}
            />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {rolOptions.map((opt) => (
              <Chip
                key={opt.label}
                label={opt.label}
                selected={filters.rol === opt.value}
                onPress={() => setFilters((prev) => ({ ...prev, rol: opt.value, page: 1 }))}
              />
            ))}
          </ScrollView>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {estadoOptions.map((opt) => (
              <Chip
                key={opt.label}
                label={opt.label}
                selected={filters.estado === opt.value}
                onPress={() => setFilters((prev) => ({ ...prev, estado: opt.value, page: 1 }))}
              />
            ))}
          </ScrollView>

          {isAdmin && (empresas.data?.empresas.length ?? 0) > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              <Chip
                label="Todas las empresas"
                selected={!filters.empresaId}
                onPress={() => setFilters((prev) => ({ ...prev, empresaId: undefined, page: 1 }))}
              />
              {empresas.data?.empresas.map((item) => (
                <Chip
                  key={item.id}
                  label={item.nombre}
                  selected={filters.empresaId === item.id}
                  onPress={() => setFilters((prev) => ({ ...prev, empresaId: item.id, page: 1 }))}
                />
              ))}
            </ScrollView>
          )}
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {directory.isLoading && (
            <Card>
              <ActivityIndicator color={theme.primary} />
            </Card>
          )}

          {!directory.isLoading && (directory.data?.usuarios.length ?? 0) === 0 && (
            <Card>
              <ThemedText type="small" themeColor="textMuted" style={styles.emptyText}>
                No se encontraron empleados.
              </ThemedText>
            </Card>
          )}

          {directory.data?.usuarios.map((item) => (
            <Pressable key={item.id} onPress={() => router.push(`/empleados/${item.id}`)}>
              <Card style={styles.rowCard}>
                <Avatar name={item.nombre} />
                <View style={styles.rowInfo}>
                  <View style={styles.rowHeader}>
                    <ThemedText type="smallBold" style={styles.rowHeaderText}>
                      {item.nombre}
                    </ThemedText>
                    {!item.activo && (
                      <StatusBadge label="Baja" bg={theme.errorBg} text={theme.errorText} />
                    )}
                  </View>
                  <ThemedText type="small" themeColor="textMuted" numberOfLines={1}>
                    {item.email}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textMuted" numberOfLines={1}>
                    {item.rol === 'GERENTE' ? 'Gerente' : 'Empleado'}
                    {item.departamentoNombre ? ` · ${item.departamentoNombre}` : ''}
                    {isAdmin && item.empresaNombre ? ` · ${item.empresaNombre}` : ''}
                  </ThemedText>
                </View>
                <ChevronRight size={18} color={theme.textMuted} />
              </Card>
            </Pressable>
          ))}

          {total > pageSize && (
            <View style={styles.pagination}>
              <Pressable
                disabled={page <= 1}
                onPress={() => setFilters((prev) => ({ ...prev, page: page - 1 }))}
                style={[styles.pageButton, { borderColor: theme.cardBorder, opacity: page <= 1 ? 0.4 : 1 }]}>
                <ThemedText type="small">Anterior</ThemedText>
              </Pressable>
              <ThemedText type="small" themeColor="textMuted">
                Página {page} de {totalPages}
              </ThemedText>
              <Pressable
                disabled={page >= totalPages}
                onPress={() => setFilters((prev) => ({ ...prev, page: page + 1 }))}
                style={[styles.pageButton, { borderColor: theme.cardBorder, opacity: page >= totalPages ? 0.4 : 1 }]}>
                <ThemedText type="small">Siguiente</ThemedText>
              </Pressable>
            </View>
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
  filtersArea: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    gap: Spacing.two,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.input,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: SoraFonts.regular,
  },
  chipRow: {
    gap: Spacing.two,
  },
  chip: {
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  scrollContent: {
    padding: Spacing.four,
    paddingTop: Spacing.three,
    gap: Spacing.three,
  },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  rowInfo: {
    flex: 1,
    gap: Spacing.half,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  rowHeaderText: {
    flexShrink: 1,
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: Spacing.three,
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.two,
  },
  pageButton: {
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
});
