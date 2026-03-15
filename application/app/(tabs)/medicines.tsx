import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../../services/api";

interface ScheduleItem {
  time: string;
  status: string;
}

interface MedicineModel {
  _id: string;
  name: string;
  dosage: string;
  schedule: ScheduleItem[];
}

interface DisplayMedicine {
  id: string; // medicineId + _ + scheduleIndex
  medicineId: string;
  scheduleIndex: number;
  name: string;
  dosage: string;
  time: string;
  status: string;
}

export default function MedicinesScreen() {
  const [medicines, setMedicines] = useState<DisplayMedicine[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMedicines = async () => {
    try {
      setLoading(true);
      const userId = await AsyncStorage.getItem("userId");
      if (!userId) {
        setLoading(false);
        return;
      }

      const response = await api.get<{ data: MedicineModel[] }>(
        `/medicines/user/${userId}`,
      );

      const rawMedicines = Array.isArray(response.data)
        ? response.data
        : (response as any);

      // Flatten the schedules into displayable cards
      const displayMeds: DisplayMedicine[] = [];
      rawMedicines.forEach((med: MedicineModel) => {
        med.schedule?.forEach((item: ScheduleItem, idx: number) => {
          displayMeds.push({
            id: `${med._id}_${idx}`,
            medicineId: med._id,
            scheduleIndex: idx,
            name: med.name,
            dosage: med.dosage,
            time: item.time,
            status: item.status,
          });
        });
      });

      setMedicines(displayMeds);
    } catch (error) {
      console.error("Error fetching medicines:", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchMedicines();
    }, []),
  );

  const confirmMedicine = async (medicineId: string, scheduleIndex: number) => {
    try {
      // Optimistic update
      setMedicines((prev) =>
        prev.map((m) =>
          m.medicineId === medicineId && m.scheduleIndex === scheduleIndex
            ? { ...m, status: "taken" }
            : m,
        ),
      );

      await api.put(`/medicines/${medicineId}/status`, {
        scheduleIndex,
        status: "taken",
      });
    } catch (error) {
      console.error("Error updating medicine status:", error);
      // Revert on error
      fetchMedicines();
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView className="flex-1 px-6 pt-6">
        <View className="flex-row justify-between items-center mb-2">
          <Text className="text-3xl font-bold text-slate-800">Medicines</Text>
          <TouchableOpacity
            onPress={fetchMedicines}
            className="p-2 bg-slate-200 rounded-full"
          >
            <MaterialCommunityIcons name="refresh" size={20} color="#475569" />
          </TouchableOpacity>
        </View>
        <Text className="text-slate-500 mb-6">
          Your daily schedule and reminders.
        </Text>

        {loading ? (
          <ActivityIndicator size="large" color="#2563eb" className="mt-10" />
        ) : medicines.length === 0 ? (
          <View className="items-center mt-10">
            <MaterialCommunityIcons name="pill" size={48} color="#cbd5e1" />
            <Text className="text-slate-400 mt-4">
              No medicines scheduled yet.
            </Text>
            <Text className="text-slate-400 mt-1 text-center">
              Ask Care+ to add your medication through the voice chat!
            </Text>
          </View>
        ) : (
          <View className="gap-4">
            {medicines.map((med) => (
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
                    <TouchableOpacity
                      onPress={() =>
                        confirmMedicine(med.medicineId, med.scheduleIndex)
                      }
                      className="bg-blue-600 px-4 py-2 rounded-full"
                    >
                      <Text className="text-white font-medium text-xs">
                        Confirm
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
        <View className="h-10" />
      </ScrollView>
    </SafeAreaView>
  );
}
