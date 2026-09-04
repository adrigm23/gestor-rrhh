import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';
import { useAuthStore } from '@/store/auth-store';

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];
  const role = useAuthStore((state) => state.user?.role);
  const canManage = role === 'GERENTE' || role === 'ADMIN_SISTEMA';
  // Igual que sidebar.tsx en la web: "Calendario" es una sección de primer
  // nivel, justo después de "Fichaje" — no existe para ADMIN_SISTEMA (no
  // ficha ni pide vacaciones), igual que la pantalla se autoprotege
  // (Fase 2.18c: antes vivía fuera de las tabs por un bug de navegación
  // que solo se daba en el preview web de expo-router, no en nativo).
  const showCalendario = role === 'EMPLEADO' || role === 'GERENTE';

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      labelStyle={{ selected: { color: colors.text } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/home.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      {showCalendario && (
        <NativeTabs.Trigger name="calendario">
          <NativeTabs.Trigger.Label>Calendario</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="calendar" md="calendar_month" />
        </NativeTabs.Trigger>
      )}

      <NativeTabs.Trigger name="explore">
        <NativeTabs.Trigger.Label>Solicitudes</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/explore.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="historial">
        <NativeTabs.Trigger.Label>Historial</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="clock.arrow.circlepath" md="history" />
      </NativeTabs.Trigger>

      {canManage && (
        <NativeTabs.Trigger name="gestion">
          <NativeTabs.Trigger.Label>Gestión</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="briefcase" md="business_center" />
        </NativeTabs.Trigger>
      )}

      <NativeTabs.Trigger name="perfil">
        <NativeTabs.Trigger.Label>Perfil</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person.circle" md="person" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
