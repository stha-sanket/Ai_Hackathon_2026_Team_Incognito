import React, { useEffect } from "react";
import { StyleSheet, ActivityIndicator, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

import { useThemeColor } from "@/hooks/use-theme-color";

export default function GoogleLoginScreen() {
  const router = useRouter();
  const primaryColor = useThemeColor({}, "primary");

  useEffect(() => {
    // Simulate OAuth flow
    const timer = setTimeout(() => {
      console.log("Google login successful");
      router.replace("/(tabs)");
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <Ionicons name="logo-google" size={100} color="#EA4335" />
        <ThemedText type="title" style={styles.title}>
          Signing in...
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          Connecting to your Google Account
        </ThemedText>

        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={primaryColor} />
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "300",
    letterSpacing: 0.5,
    marginTop: 30,
  },
  subtitle: {
    marginTop: 10,
    opacity: 0.4,
    textAlign: "center",
    fontSize: 14,
  },
  loaderContainer: {
    marginTop: 60,
  },
});
