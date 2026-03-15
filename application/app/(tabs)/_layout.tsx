import { Tabs } from "expo-router";
import React from "react";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Voice",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="mic.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="medicines"
        options={{
          title: "Medicines",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="pills.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: "Reports",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="doc.fill" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
