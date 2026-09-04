import { Redirect, Stack } from 'expo-router';

import { useAuthStore } from '@/store/auth-store';

export default function AppLayout() {
  const loading = useAuthStore((state) => state.loading);
  const authenticated = useAuthStore((state) => state.authenticated);

  // El arranque en frío ya se resolvió en el layout raíz (fuentes cargadas)
  // antes de montar este árbol, pero restore() sigue en curso la primera
  // vez: no redirigir todavía con un authenticated:false que puede ser
  // provisional.
  if (loading) {
    return null;
  }

  if (!authenticated) {
    return <Redirect href="/login" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
