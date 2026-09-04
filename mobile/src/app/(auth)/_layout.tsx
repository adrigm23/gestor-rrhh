import { Redirect, Stack } from 'expo-router';

import { useAuthStore } from '@/store/auth-store';

export default function AuthLayout() {
  const loading = useAuthStore((state) => state.loading);
  const authenticated = useAuthStore((state) => state.authenticated);

  if (loading) {
    return null;
  }

  if (authenticated) {
    return <Redirect href="/" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
