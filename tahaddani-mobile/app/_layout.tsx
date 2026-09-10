import { useEffect } from 'react';
import { I18nManager, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import {
  Tajawal_400Regular,
  Tajawal_500Medium,
  Tajawal_700Bold,
  Tajawal_900Black,
  useFonts,
} from '@expo-google-fonts/tajawal';
import { AccountProvider } from '../src/contexts/AccountContext';
import { CoinsProvider } from '../src/contexts/CoinsContext';
import { SubProvider } from '../src/contexts/SubContext';
import { AudioProvider } from '../src/contexts/AudioContext';
import { InviteListener } from '../src/components/InviteListener';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { colors } from '../src/theme/tokens';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Tajawal_400Regular,
    Tajawal_500Medium,
    Tajawal_700Bold,
    Tajawal_900Black,
  });

  // The app is Arabic-first; layout direction is set once at the root.
  useEffect(() => {
    if (!I18nManager.isRTL) {
      I18nManager.allowRTL(true);
      I18nManager.forceRTL(true);
    }
  }, []);

  // Hide the splash once fonts resolve. A font failure still releases it, so a
  // missing typeface degrades to the system font instead of a frozen splash.
  useEffect(() => {
    if (fontsLoaded || fontError) void SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return <View style={{ flex: 1, backgroundColor: colors.background }} />;

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <AccountProvider>
          <SubProvider>
            <CoinsProvider>
              <AudioProvider>
                <StatusBar style="dark" />
                <Stack
                  screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: colors.background },
                  }}
                />
                {/* Friend-invite banner, visible over any screen (web parity). */}
                <InviteListener />
              </AudioProvider>
            </CoinsProvider>
          </SubProvider>
        </AccountProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
