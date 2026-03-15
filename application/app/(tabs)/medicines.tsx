import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const mockMedicines = [
  {
    id: 1,
    name: "Paracetamol",
    dosage: "500mg",
    time: "08:00 AM",
    status: "taken",
  },
  {
    id: 2,
    name: "Vitamin D",
    dosage: "1 Pill",
    time: "01:00 PM",
    status: "pending",
  },
  {
    id: 3,
    name: "Metformin",
    dosage: "500mg",
    time: "08:00 PM",
    status: "pending",
  },
];

export default function MedicinesScreen() {
  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView className="flex-1 px-6 pt-6">
        <Text className="text-3xl font-bold text-slate-800 mb-2">
          Medicines
        </Text>
        <Text className="text-slate-500 mb-6">
          Your daily schedule and reminders.
        </Text>

        <View className="gap-4">
          {mockMedicines.map((med) => (
            <View
              key={med.id}
              className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex-row items-center justify-between"
            >
              <View className="flex-row items-center flex-1">
                <View
                  className={`w-12 h-12 rounded-full items-center justify-center ${
                    med.status === "taken" ? "bg-green-100" : "bg-blue-100"
                  }`}
                >
                  <MaterialCommunityIcons
                    name="pill"
                    size={24}
                    color={med.status === "taken" ? "#16a34a" : "#2563eb"}
                  />
                </View>
                <View className="ml-4">
                  <Text className="text-lg font-bold text-slate-800">
                    {med.name}
                  </Text>
                  <Text className="text-slate-500">
                    {med.dosage} • {med.time}
                  </Text>
                </View>
              </View>

              <View>
                {med.status === "taken" ? (
                  <Text className="text-green-600 font-bold uppercase text-xs">
                    Taken
                  </Text>
                ) : (
                  <TouchableOpacity className="bg-blue-600 px-4 py-2 rounded-full">
                    <Text className="text-white font-medium text-xs">
                      Confirm
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </View>
        <View className="h-10" />
      </ScrollView>
    </SafeAreaView>
  );
}
