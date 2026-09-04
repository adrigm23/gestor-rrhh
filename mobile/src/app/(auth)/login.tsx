import { Image } from 'expo-image';
import { Eye, EyeOff } from 'lucide-react-native';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, SoraFonts, Spacing, glowShadow } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/store/auth-store';

export default function LoginScreen() {
  const theme = useTheme();
  const login = useAuthStore((state) => state.login);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const handleSubmit = async () => {
    setError('');
    setIsLoading(true);

    try {
      const outcome = await login(email, password);
      if (outcome === 'invalid-credentials') {
        setError('Acceso denegado. Revisa tus credenciales.');
      }
      // En "ok" no se navega a mano: authenticated pasa a true y
      // (auth)/_layout.tsx redirige solo a (app).
    } catch {
      setError('Ocurrio un error inesperado.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled">
            <Card size="large" style={styles.card}>
              <View style={styles.brandRow}>
                <View style={styles.logoBox}>
                  <Image
                    source={require('@/assets/images/suma3-logo.jpeg')}
                    style={styles.logoImage}
                    contentFit="contain"
                  />
                </View>
                <View>
                  <ThemedText
                    type="small"
                    themeColor="textMuted"
                    style={styles.brandLabel}>
                    suma3 consultores
                  </ThemedText>
                  <ThemedText style={styles.brandTitle}>mdmm</ThemedText>
                </View>
              </View>

              <View style={styles.headingBlock}>
                <ThemedText type="heading">Iniciar sesion</ThemedText>
                <ThemedText type="small" themeColor="textMuted">
                  Accede con tu correo corporativo.
                </ThemedText>
              </View>

              {error ? (
                <View
                  style={[
                    styles.errorBanner,
                    { backgroundColor: theme.errorBg, borderColor: theme.errorBorder },
                  ]}>
                  <ThemedText type="small" style={{ color: theme.errorText }}>
                    {error}
                  </ThemedText>
                </View>
              ) : null}

              <View style={styles.field}>
                <ThemedText type="small" themeColor="textSecondary">
                  Correo electronico
                </ThemedText>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  placeholder="nombre@empresa.com"
                  placeholderTextColor={theme.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  style={[
                    styles.input,
                    {
                      color: theme.text,
                      backgroundColor: theme.backgroundElement,
                      borderColor: emailFocused ? theme.primary : theme.cardBorder,
                      borderWidth: emailFocused ? 2 : 1,
                    },
                  ]}
                />
              </View>

              <View style={styles.field}>
                <ThemedText type="small" themeColor="textSecondary">
                  Contrasena
                </ThemedText>
                <View style={styles.passwordWrapper}>
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    placeholder="********"
                    placeholderTextColor={theme.textMuted}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    textContentType="password"
                    style={[
                      styles.input,
                      styles.passwordInput,
                      {
                        color: theme.text,
                        backgroundColor: theme.backgroundElement,
                        borderColor: passwordFocused ? theme.primary : theme.cardBorder,
                        borderWidth: passwordFocused ? 2 : 1,
                      },
                    ]}
                  />
                  <Pressable
                    onPress={() => setShowPassword((prev) => !prev)}
                    hitSlop={8}
                    style={[styles.eyeButton, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
                    accessibilityLabel={showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}>
                    {showPassword ? (
                      <EyeOff size={16} color={theme.textMuted} />
                    ) : (
                      <Eye size={16} color={theme.textMuted} />
                    )}
                  </Pressable>
                </View>
              </View>

              <Pressable
                onPress={handleSubmit}
                disabled={isLoading}
                style={({ pressed }) => [
                  styles.submitButton,
                  glowShadow(theme.primary),
                  {
                    backgroundColor:
                      pressed || isLoading ? theme.primaryPressed : theme.primary,
                    opacity: isLoading ? 0.6 : 1,
                  },
                ]}>
                <ThemedText style={styles.submitButtonText}>
                  {isLoading ? 'Validando...' : 'Iniciar sesion'}
                </ThemedText>
              </Pressable>

              <ThemedText type="small" themeColor="textMuted" style={styles.footerCaption}>
                Sistema de administracion multi-empresa
              </ThemedText>
            </Card>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.five,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    padding: 32,
    gap: 0,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  logoBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  logoImage: {
    width: 36,
    height: 36,
  },
  brandLabel: {
    textTransform: 'uppercase',
    letterSpacing: 2,
    fontSize: 11,
  },
  brandTitle: {
    fontSize: 18,
    fontFamily: SoraFonts.semiBold,
  },
  headingBlock: {
    marginTop: Spacing.four,
    gap: Spacing.half,
  },
  errorBanner: {
    marginTop: Spacing.four,
    borderRadius: Radius.input,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  field: {
    marginTop: Spacing.three,
    gap: Spacing.half,
  },
  input: {
    width: '100%',
    borderRadius: Radius.input,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: SoraFonts.regular,
  },
  passwordWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  passwordInput: {
    paddingRight: 48,
  },
  eyeButton: {
    position: 'absolute',
    right: 10,
    borderRadius: Radius.pill,
    borderWidth: 1,
    padding: 8,
  },
  submitButton: {
    width: '100%',
    marginTop: Spacing.four,
    borderRadius: Radius.input,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontFamily: SoraFonts.semiBold,
  },
  footerCaption: {
    marginTop: Spacing.five,
    textAlign: 'center',
    fontSize: 11,
  },
});
