import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function ReportsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView className="flex-1 px-6 pt-6">
        <Text className="text-3xl font-bold text-slate-800 mb-2">
          Daily Report
        </Text>
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
                8.5<Text className="text-lg text-slate-400">/10</Text>
              </Text>
            </View>
            <View className="bg-amber-100 px-3 py-1 rounded-full">
              <Text className="text-amber-700 font-medium">Positive Trend</Text>
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
            <Text className="text-2xl font-bold text-slate-800 mt-1">100%</Text>
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
              4 Logs
            </Text>
          </View>
        </View>

        <View className="bg-blue-600 p-6 rounded-3xl shadow-sm mb-10">
          <Text className="text-white font-bold text-lg mb-2">
            Caregiver Insight
          </Text>
          <Text className="text-blue-100 leading-5">
            Patient consistently took all medication today and indicated a
            positive mood. Minimal intervention required.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
