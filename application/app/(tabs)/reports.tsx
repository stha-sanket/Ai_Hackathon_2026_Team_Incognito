import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../../services/api";

interface Mood {
  score: number;
  sentiment: string;
  createdAt: string;
}

export default function ReportsScreen() {
  const [aiReport, setAiReport] = useState<string>("");
  const [moodScore, setMoodScore] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const userId = await AsyncStorage.getItem("userId");
      if (!userId) {
        setLoading(false);
        return;
      }

      // Fetch AI Report and Mood History in parallel
      const [reportRes, moodRes] = await Promise.all([
        api.get<{ report: string }>(`/chat/report/${userId}`),
        api.get<Mood[]>(`/moods/user/${userId}?days=7`),
      ]);

      setAiReport(
        (reportRes.data as any)?.report || "No report generated yet.",
      );

      const allMoods = moodRes.data;
      if (allMoods && allMoods.length > 0) {
        // Filter for today's moods only
        const today = new Date().toDateString();
        const todayMoods = allMoods.filter(
          (m) => new Date(m.createdAt).toDateString() === today,
        );

        if (todayMoods.length > 0) {
          const avg =
            todayMoods.reduce((acc, curr) => acc + curr.score, 0) /
            todayMoods.length;
          setMoodScore(Math.round(avg * 10) / 10);
        } else {
          setMoodScore(null);
        }
      } else {
        setMoodScore(null);
      }
    } catch (error) {
      console.error("Error fetching report data:", error);
      setAiReport("रिपोर्ट प्राप्त गर्न सकिएन। (Failed to fetch report.)");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchReportData();
    }, []),
  );

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView className="flex-1 px-6 pt-6">
        <View className="flex-row justify-between items-center mb-2">
          <Text className="text-3xl font-bold text-slate-800">
            Daily Report
          </Text>
          <TouchableOpacity
            onPress={fetchReportData}
            className="p-2 bg-slate-200 rounded-full"
          >
            <MaterialCommunityIcons name="refresh" size={20} color="#475569" />
          </TouchableOpacity>
        </View>
        <Text className="text-slate-500 mb-6">
          Overview of your wellness today.
        </Text>

        <View className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 mb-6">
          <View className="flex-row items-center mb-4">
            <MaterialCommunityIcons
              name="emoticon-happy-outline"
              size={28}
              color="#f59e0b"
            />
            <Text className="text-xl font-bold text-slate-800 ml-2">
              Mood Summary
            </Text>
          </View>
          <View className="flex-row justify-between items-end">
            <View>
              <Text className="text-slate-500 text-sm">Average Score</Text>
              <Text className="text-4xl font-bold text-slate-800 mt-1">
                {moodScore !== null ? moodScore : "--"}
                <Text className="text-lg text-slate-400">/10</Text>
              </Text>
            </View>
            <View className="bg-amber-100 px-3 py-1 rounded-full">
              <Text className="text-amber-700 font-medium">
                {moodScore !== null ? "Synced" : "Tracking"}
              </Text>
            </View>
          </View>
        </View>

        <View className="flex-row gap-4 mb-6">
          <View className="flex-1 bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
            <MaterialCommunityIcons
              name="pill"
              size={28}
              color="#16a34a"
              className="mb-2"
            />
            <Text className="text-slate-500 text-sm mt-2">Adherence</Text>
            <Text className="text-2xl font-bold text-slate-800 mt-1">--%</Text>
          </View>
          <View className="flex-1 bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
            <MaterialCommunityIcons
              name="message-text-outline"
              size={28}
              color="#3b82f6"
              className="mb-2"
            />
            <Text className="text-slate-500 text-sm mt-2">Conversations</Text>
            <Text className="text-2xl font-bold text-slate-800 mt-1">
              Active
            </Text>
          </View>
        </View>

        <View className="bg-blue-600 p-6 rounded-3xl shadow-sm mb-10">
          <View className="flex-row items-center mb-3">
            <MaterialCommunityIcons name="robot" size={24} color="white" />
            <Text className="text-white font-bold text-lg ml-2">
              AI Caregiver Insight
            </Text>
          </View>
          {loading ? (
            <ActivityIndicator size="small" color="#ffffff" className="mt-2" />
          ) : (
            <Text className="text-blue-50 leading-6 text-base">{aiReport}</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
