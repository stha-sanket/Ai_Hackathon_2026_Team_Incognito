import React, { useState } from "react";
import {
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Link, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "react-native";

import { useAuth } from "../../context/AuthContext";
import { useThemeColor } from "@/hooks/use-theme-color";

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const primaryColor = useThemeColor({}, "primary");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRegister = async () => {
    if (!name || !email || !password) {
      setError("Please fill in all fields");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await register(name, email, password, "patient");
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Registration failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-white dark:bg-black"
    >
      <ScrollView contentContainerClassName="flex-grow px-6 py-10 justify-center">
        {/* Header */}
        <View className="items-center mb-16">
          <Ionicons name="person-add-outline" size={80} color={primaryColor} />
          <Text className="text-3xl font-light tracking-widest mt-4 text-gray-800 dark:text-gray-100">
            Create Account
          </Text>
          <Text className="text-sm text-gray-400 mt-2">Join Care+ today</Text>
        </View>

        {/* Form */}
        <View className="w-full">
          {error ? (
            <Text className="text-red-500 text-center text-sm mb-4">
              {error}
            </Text>
          ) : null}

          {/* Name */}
          <View className="flex-row items-center border-b border-gray-200 mb-7 pb-1">
            <Ionicons
              name="person-outline"
              size={18}
              color="#aaa"
              style={{ marginRight: 10 }}
            />
            <TextInput
              className="flex-1 text-base text-gray-700"
              placeholder="Full Name"
              placeholderTextColor="#bbb"
              value={name}
              onChangeText={setName}
            />
          </View>

          {/* Email */}
          <View className="flex-row items-center border-b border-gray-200 mb-7 pb-1">
            <Ionicons
              name="mail-outline"
              size={18}
              color="#aaa"
              style={{ marginRight: 10 }}
            />
            <TextInput
              className="flex-1 text-base text-gray-700"
              placeholder="Email"
              placeholderTextColor="#bbb"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          {/* Password */}
          <View className="flex-row items-center border-b border-gray-200 mb-8 pb-1">
            <Ionicons
              name="lock-closed-outline"
              size={18}
              color="#aaa"
              style={{ marginRight: 10 }}
            />
            <TextInput
              className="flex-1 text-base text-gray-700"
              placeholder="Password"
              placeholderTextColor="#bbb"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          {/* Register Button */}
          <TouchableOpacity
            className="rounded-full h-14 items-center justify-center"
            style={{
              backgroundColor: primaryColor,
              opacity: loading ? 0.5 : 1,
            }}
            onPress={handleRegister}
            disabled={loading}
          >
            <Text className="text-white text-base font-medium tracking-wide">
              {loading ? "Registering..." : "Register"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View className="flex-row justify-center mt-14">
          <Text className="text-gray-400 text-sm">
            Already have an account?{" "}
          </Text>
          <Link href="/(auth)/login">
            <Text
              className="text-sm font-medium"
              style={{ color: primaryColor }}
            >
              Login
            </Text>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
