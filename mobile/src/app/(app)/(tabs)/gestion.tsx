import { Redirect, router } from 'expo-router';
import {
  Building,
  Building2,
  CheckSquare,
  ChevronRight,
  Clock3,
  ClipboardList,
  PenLine,
  Users,
  type LucideIcon,
} from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/card';
import { IconTile } from '@/components/ui/icon-tile';
import { StatusBadge } from '@/components/ui/status-badge';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/store/auth-store';

type Section = {
  title: string;
  description: string;
  icon: LucideIcon;
  // Clave del theme a usar como color del IconTile — así cada módulo tiene
  // un tinte reconocible propio, en vez de repetir siempre el mismo teal
  // (Fase 2.18b, cerrando la brecha con la propuesta de Stitch).
  tone: ThemeColor;
  adminOnly?: boolean;
  // Igual que escritorio/page.tsx en la web: ADMIN_SISTEMA no tiene acceso
  // a esta sección en absoluto (ni siquiera "Próximamente" — no aplica).
  hiddenForAdmin?: boolean;
  href?:
    | '/aprobar-solicitudes'
    | '/proponer-modificacion'
    | '/panel-horas'
    | '/empleados'
    | '/organizacion'
    | '/fichajes-empresa'
    | '/empresas';
};

const sections: Section[] = [
  {
    title: 'Aprobar solicitudes',
    description: 'Vacaciones y ausencias pendientes de tu equipo.',
    icon: CheckSquare,
    tone: 'primary',
    href: '/aprobar-solicitudes',
  },
  {
    title: 'Proponer corrección de fichaje',
    description: 'Corrige un fichaje de un empleado; queda a la espera de que lo acepte.',
    icon: PenLine,
    tone: 'accentSky',
    href: '/proponer-modificacion',
  },
  {
    title: 'Panel de horas',
    description: 'Horas trabajadas frente al contrato, por empleado.',
    icon: Clock3,
    tone: 'accentViolet',
    href: '/panel-horas',
    hiddenForAdmin: true,
  },
  {
    title: 'Empleados',
    description: 'Directorio y gestión de tu equipo.',
    icon: Users,
    tone: 'warningDot',
    href: '/empleados',
  },
  {
    title: 'Departamentos y centros de trabajo',
    description: 'Estructura organizativa de la empresa.',
    icon: Building2,
    tone: 'pauseText',
    href: '/organizacion',
  },
  {
    title: 'Fichajes de empresa',
    description: 'Consola de validación y exportación.',
    icon: ClipboardList,
    tone: 'primary',
    href: '/fichajes-empresa',
  },
  {
    title: 'Empresas',
    description: 'Gestión multiempresa.',
    icon: Building,
    tone: 'accentSky',
    adminOnly: true,
    href: '/empresas',
  },
];

// Igual que en la web (cada página de gestor/admin redirige si el rol no
// encaja), no solo se oculta el tab: esta pantalla también se protege por
// si se llega por URL directa (web) sin pasar por la navegación.
export default function GestionScreen() {
  const theme = useTheme();
  const role = useAuthStore((state) => state.user?.role);

  if (role !== 'GERENTE' && role !== 'ADMIN_SISTEMA') {
    return <Redirect href="/" />;
  }

  const visibleSections = sections.filter(
    (section) =>
      (!section.adminOnly || role === 'ADMIN_SISTEMA') && (!section.hiddenForAdmin || role !== 'ADMIN_SISTEMA'),
  );

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Card>
            <ThemedText type="heading">Gestión</ThemedText>
            <ThemedText type="small" themeColor="textMuted" style={styles.subtitle}>
              Herramientas de {role === 'ADMIN_SISTEMA' ? 'administración' : 'gestor'}. Se irán activando por
              fases.
            </ThemedText>
          </Card>

          {visibleSections.map((section) => {
            const tone = theme[section.tone];
            const content = (
              <View style={styles.sectionRow}>
                <IconTile tint={tone} icon={<section.icon size={20} color={tone} />} />
                <View style={styles.sectionBody}>
                  <View style={styles.sectionHeader}>
                    <ThemedText type="smallBold" style={styles.sectionHeaderTitle}>
                      {section.title}
                    </ThemedText>
                    {section.href ? (
                      <ChevronRight size={18} color={theme.textMuted} />
                    ) : (
                      <StatusBadge label="Próximamente" bg={theme.neutralIconBg} text={theme.textMuted} />
                    )}
                  </View>
                  <ThemedText type="small" themeColor="textMuted">
                    {section.description}
                  </ThemedText>
                </View>
              </View>
            );

            if (section.href) {
              return (
                <Pressable key={section.title} onPress={() => router.push(section.href!)}>
                  <Card style={styles.sectionCard}>{content}</Card>
                </Pressable>
              );
            }

            return (
              <Card key={section.title} style={styles.sectionCard}>
                {content}
              </Card>
            );
          })}
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
  subtitle: {
    marginTop: Spacing.half,
  },
  sectionCard: {
    gap: Spacing.two,
  },
  sectionRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  sectionBody: {
    flex: 1,
    gap: Spacing.two,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  sectionHeaderTitle: {
    flex: 1,
  },
});
