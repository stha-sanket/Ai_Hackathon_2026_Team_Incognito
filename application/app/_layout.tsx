import "../global.css";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { Animated, View, Text } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Speech from "expo-speech";
import * as Notifications from "expo-notifications";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { AuthProvider, useAuth } from "../context/AuthContext";

export const unstable_settings = {
  anchor: "(tabs)",
};

function RootLayoutNav() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const notifResponseListenerRef = useRef<any>(null);
  const notifReceivedListenerRef = useRef<any>(null);

  // Global Toast for Foreground Reminder
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-30)).current;

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!user && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (user && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [user, isLoading, segments]);

  // Global notification logic
  useEffect(() => {
    // 1. App is Backgrounded / Closed -> User taps banner
    notifResponseListenerRef.current = Notifications.addNotificationResponseReceivedListener(
      (response: any) => {
        const data = response?.notification?.request?.content?.data;
        if (data?.medicineId) {
          router.push("/(tabs)/medicines");
        }
      },
    );

    // 2. App is Foregrounded -> Notification arrives now
    notifReceivedListenerRef.current = Notifications.addNotificationReceivedListener(
      (notification: any) => {
        const data = notification.request.content.data;
        if (data?.medicineId && data?.medicineName) {
          // Speak in Nepali
          const npText = `तपाईको ${data.medicineName} खाने बेला भयो।`;
          Speech.speak(npText, { language: "ne-NP" });

          // Show Toast 
          setToastMessage(npText);
          setToastVisible(true);
          
          Animated.parallel([
            Animated.spring(opacity, {
              toValue: 1,
              useNativeDriver: true,
              tension: 80,
              friction: 8,
            }),
            Animated.spring(translateY, {
              toValue: 0,
              useNativeDriver: true,
              tension: 80,
              friction: 8,
            }),
          ]).start();

          // Auto-hide toast after 7s
          setTimeout(() => {
            Animated.parallel([
              Animated.timing(opacity, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
              }),
              Animated.timing(translateY, {
                toValue: -30,
                duration: 300,
                useNativeDriver: true,
              }),
            ]).start(() => setToastVisible(false));
          }, 7000);
        }
      }
    );

    return () => {
      if (notifResponseListenerRef.current) notifResponseListenerRef.current.remove();
      if (notifReceivedListenerRef.current) notifReceivedListenerRef.current.remove();
    };
  }, []);

  if (isLoading) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <View style={{ flex: 1 }}>
        <Stack>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="modal"
            options={{ presentation: "modal", title: "Modal" }}
          />
        </Stack>
        <StatusBar style="auto" />

        {/* Floating Custom Toast for reminders whilst in app */}
        {toastVisible && (
          <Animated.View
            style={{
              position: "absolute",
              top: 60,
              left: 20,
              right: 20,
              zIndex: 9999,
              opacity,
              transform: [{ translateY }],
              backgroundColor: "#ffffff",
              borderRadius: 20,
              padding: 16,
              flexDirection: "row",
              alignItems: "center",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.15,
              shadowRadius: 10,
              elevation: 8,
            }}
          >
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#d1fae5', justifyContent: 'center', alignItems: 'center', marginRight: 14 }}>
               <MaterialCommunityIcons name="pill" size={24} color="#059669" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: "#059669", fontWeight: "800", fontSize: 13, marginBottom: 2 }}>
                💊 MEDICINE REMINDER
              </Text>
              <Text style={{ color: "#1e293b", fontWeight: "600", fontSize: 14, lineHeight: 20 }}>
                {toastMessage}
              </Text>
            </View>
          </Animated.View>
        )}
      </View>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}

