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

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const primaryColor = useThemeColor({}, "primary");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await login(email, password);
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Login failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    router.push("/(auth)/google-login");
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1"
    >
      <ScrollView contentContainerClassName="flex-grow px-6 py-10 justify-center">
        {/* Header */}
        <View className="items-center mb-16">
          <Ionicons
            name="heart-circle-outline"
            size={80}
            color={primaryColor}
          />
          <Text className="text-4xl font-light tracking-widest mt-4 text-gray-800 dark:text-gray-100">
            Care+
          </Text>
          <Text className="text-sm text-gray-400 mt-2">Welcome back!</Text>
        </View>

        {/* Form */}
        <View className="w-full">
          {error ? (
            <Text className="text-red-500 text-center text-sm mb-4">
              {error}
            </Text>
          ) : null}

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

          {/* Login Button */}
          <TouchableOpacity
            className="rounded-full h-14 items-center justify-center"
            style={{
              backgroundColor: primaryColor,
              opacity: loading ? 0.5 : 1,
            }}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text className="text-white text-base font-medium tracking-wide">
              {loading ? "Logging in..." : "Login"}
            </Text>
          </TouchableOpacity>

          {/* Divider */}
          <View className="flex-row items-center my-8">
            <View className="flex-1 h-px bg-gray-100" />
            <Text className="mx-4 text-xs text-gray-300">OR</Text>
            <View className="flex-1 h-px bg-gray-100" />
          </View>

          {/* Google Button */}
          <TouchableOpacity
            className="flex-row items-center justify-center rounded-full h-14 border border-gray-100"
            onPress={handleGoogleLogin}
          >
            <Ionicons
              name="logo-google"
              size={18}
              color="#EA4335"
              style={{ marginRight: 10 }}
            />
            <Text className="text-gray-500 text-sm font-normal">
              Sign in with Google
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View className="flex-row justify-center mt-14">
          <Text className="text-gray-400 text-sm">Don't have an account? </Text>
          <Link href="/(auth)/register">
            <Text
              className="text-sm font-medium"
              style={{ color: primaryColor }}
            >
              Register
            </Text>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
