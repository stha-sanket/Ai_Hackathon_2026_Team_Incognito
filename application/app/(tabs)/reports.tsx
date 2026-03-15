import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../../services/api";

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

      const reportRes = await api.get<any>(`/chat/report/${userId}`);
      const data = reportRes.data as any;

      setAiReport(data?.report || "No report generated yet.");
      setMoodScore(data?.moodScore ?? null);
    } catch (error) {
      console.error("Error fetching report data:", error);
      setAiReport("Failed to fetch report. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchReportData();
    }, []),
  );

  const getMoodLabel = (score: number | null) => {
    if (score === null) return "No Data";
    if (score >= 8) return "Great";
    if (score >= 6) return "Good";
    if (score >= 4) return "Okay";
    if (score >= 2) return "Low";
    return "Needs Attention";
  };

  const getMoodColor = (score: number | null) => {
    if (score === null) return "#94a3b8";
    if (score >= 8) return "#16a34a";
    if (score >= 6) return "#f59e0b";
    if (score >= 4) return "#f97316";
    return "#ef4444";
  };

  const clearHistory = () => {
    Alert.alert(
      "Clear Chat History",
      "This will permanently delete all your conversation history. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            try {
              const userId = await AsyncStorage.getItem("userId");
              if (!userId) return;
              await api.delete(`/chat/history/${userId}`);
              setAiReport("Chat history cleared. Start a new conversation!");
              setMoodScore(null);
            } catch (error) {
              console.error("Error clearing history:", error);
              Alert.alert("Error", "Failed to clear chat history.");
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView className="flex-1 px-6 pt-6">
        <View className="flex-row justify-between items-center mb-2">
          <Text className="text-3xl font-bold text-slate-800">
            Daily Report
          </Text>
          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={clearHistory}
              className="p-2 bg-red-100 rounded-full"
            >
              <MaterialCommunityIcons name="delete-outline" size={20} color="#ef4444" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={fetchReportData}
              className="p-2 bg-slate-200 rounded-full"
            >
              <MaterialCommunityIcons name="refresh" size={20} color="#475569" />
            </TouchableOpacity>
          </View>
        </View>
        <Text className="text-slate-500 mb-6">
          Overview of your wellness today.
        </Text>

        <View className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 mb-6">
          <View className="flex-row items-center mb-4">
            <MaterialCommunityIcons
              name="emoticon-happy-outline"
              size={28}
              color={getMoodColor(moodScore)}
            />
            <Text className="text-xl font-bold text-slate-800 ml-2">
              Mood Summary
            </Text>
          </View>
          {loading ? (
            <ActivityIndicator size="small" color="#3b82f6" className="mt-2" />
          ) : (
            <View className="flex-row justify-between items-end">
              <View>
                <Text className="text-slate-500 text-sm">Wellness Score</Text>
                <Text className="text-4xl font-bold text-slate-800 mt-1">
                  {moodScore !== null ? moodScore : "--"}
                  <Text className="text-lg text-slate-400">/10</Text>
                </Text>
              </View>
              <View
                style={{ backgroundColor: `${getMoodColor(moodScore)}20` }}
                className="px-3 py-1 rounded-full"
              >
                <Text style={{ color: getMoodColor(moodScore) }} className="font-medium">
                  {getMoodLabel(moodScore)}
                </Text>
              </View>
            </View>
          )}
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
