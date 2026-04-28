import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ToastProvider } from "@/components/Toast";
import { FloatingAI } from "@/components/FloatingAI";
import { ONBOARDING_KEY } from "./onboarding";

SplashScreen.preventAutoHideAsync();

function RootLayoutNav({ onboarded }: { onboarded: boolean }) {
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    // Only redirect once layout is mounted
    const inOnboarding = segments[0] === "onboarding";
    if (!onboarded && !inOnboarding) {
      router.replace("/onboarding");
    } else if (onboarded && inOnboarding) {
      router.replace("/(tabs)");
    }
  }, [onboarded, segments]);

  return (
    <Stack screenOptions={{
      headerShown: false,
      animation: Platform.OS === "android" ? "fade_from_bottom" : "default",
    }}>
      <Stack.Screen name="onboarding" options={{ animation: "fade" }} />
      <Stack.Screen name="(tabs)" options={{ animation: "fade" }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY).then((val) => {
      setOnboarded(val === "true");
    });
  }, []);

  useEffect(() => {
    if ((fontsLoaded || fontError) && onboarded !== null) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, onboarded]);

  if ((!fontsLoaded && !fontError) || onboarded === null) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <KeyboardProvider>
            <ToastProvider>
              <RootLayoutNav onboarded={onboarded} />
              <FloatingAI />
            </ToastProvider>
          </KeyboardProvider>
        </GestureHandlerRootView>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
