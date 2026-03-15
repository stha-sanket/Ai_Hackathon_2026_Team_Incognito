import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert,
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
  notes?: string;
}

export default function MedicinesScreen() {
  const [medicines, setMedicines] = useState<MedicineModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingMed, setEditingMed] = useState<MedicineModel | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formDosage, setFormDosage] = useState("");
  const [formTime, setFormTime] = useState("");
  const [formNotes, setFormNotes] = useState("");

  const fetchMedicines = async () => {
    try {
      setLoading(true);
      const userId = await AsyncStorage.getItem("userId");
      if (!userId) {
        setLoading(false);
        return;
      }

      const response = await api.get<MedicineModel[]>(
        `/medicines/user/${userId}`,
      );
      const rawMedicines = Array.isArray(response.data)
        ? response.data
        : (response as any);
      setMedicines(rawMedicines);
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

  const openAddModal = () => {
    setEditingMed(null);
    setFormName("");
    setFormDosage("");
    setFormTime("");
    setFormNotes("");
    setModalVisible(true);
  };

  const openEditModal = (med: MedicineModel) => {
    setEditingMed(med);
    setFormName(med.name);
    setFormDosage(med.dosage);
    setFormTime(med.schedule?.[0]?.time || "");
    setFormNotes(med.notes || "");
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!formName.trim() || !formDosage.trim() || !formTime.trim()) {
      Alert.alert("Missing Fields", "Please fill in name, dosage, and time.");
      return;
    }

    const userId = await AsyncStorage.getItem("userId");
    if (!userId) return;

    const payload = {
      userId,
      name: formName.trim(),
      dosage: formDosage.trim(),
      schedule: [{ time: formTime.trim(), status: "pending" }],
      notes: formNotes.trim(),
    };

    try {
      if (editingMed) {
        await api.put(`/medicines/${editingMed._id}`, payload);
      } else {
        await api.post("/medicines", payload);
      }
      setModalVisible(false);
      fetchMedicines();
    } catch (error) {
      console.error("Error saving medicine:", error);
      Alert.alert("Error", "Could not save medicine.");
    }
  };

  const handleDelete = (med: MedicineModel) => {
    Alert.alert(
      "Delete Medicine",
      `Are you sure you want to delete "${med.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete(`/medicines/${med._id}`);
              fetchMedicines();
            } catch (error) {
              console.error("Error deleting medicine:", error);
              Alert.alert("Error", "Could not delete medicine.");
            }
          },
        },
      ]
    );
  };

  const confirmDose = async (medicineId: string, scheduleIndex: number) => {
    try {
      setMedicines((prev) =>
        prev.map((m) =>
          m._id === medicineId
            ? {
              ...m,
              schedule: m.schedule.map((s, i) =>
                i === scheduleIndex ? { ...s, status: "taken" } : s
              ),
            }
            : m,
        ),
      );
      await api.put(`/medicines/${medicineId}/status`, {
        scheduleIndex,
        status: "taken",
      });
    } catch (error) {
      console.error("Error updating medicine status:", error);
      fetchMedicines();
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView className="flex-1 px-6 pt-6">
        <View className="flex-row justify-between items-center mb-2">
          <Text className="text-3xl font-bold text-slate-800">Medicines</Text>
          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={openAddModal}
              className="p-2 bg-blue-600 rounded-full"
            >
              <MaterialCommunityIcons name="plus" size={20} color="white" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={fetchMedicines}
              className="p-2 bg-slate-200 rounded-full"
            >
              <MaterialCommunityIcons name="refresh" size={20} color="#475569" />
            </TouchableOpacity>
          </View>
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
            <TouchableOpacity
              onPress={openAddModal}
              className="mt-4 bg-blue-600 px-6 py-3 rounded-full"
            >
              <Text className="text-white font-medium">Add Your First Medicine</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="gap-4">
            {medicines.map((med) => (
              <View
                key={med._id}
                className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100"
              >
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center flex-1">
                    <View
                      className={`w-12 h-12 rounded-full items-center justify-center ${med.schedule?.[0]?.status === "taken"
                          ? "bg-green-100"
                          : "bg-blue-100"
                        }`}
                    >
                      <MaterialCommunityIcons
                        name="pill"
                        size={24}
                        color={
                          med.schedule?.[0]?.status === "taken"
                            ? "#16a34a"
                            : "#2563eb"
                        }
                      />
                    </View>
                    <View className="ml-4 flex-1">
                      <Text className="text-lg font-bold text-slate-800">
                        {med.name}
                      </Text>
                      <Text className="text-slate-500">
                        {med.dosage} • {med.schedule?.[0]?.time || "No time set"}
                      </Text>
                      {med.notes ? (
                        <Text className="text-slate-400 text-xs mt-1">
                          {med.notes}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                </View>

                <View className="flex-row justify-between items-center">
                  <View className="flex-row gap-2">
                    <TouchableOpacity
                      onPress={() => openEditModal(med)}
                      className="bg-slate-100 px-3 py-2 rounded-full flex-row items-center"
                    >
                      <MaterialCommunityIcons
                        name="pencil-outline"
                        size={14}
                        color="#475569"
                      />
                      <Text className="text-slate-600 font-medium text-xs ml-1">
                        Edit
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDelete(med)}
                      className="bg-red-50 px-3 py-2 rounded-full flex-row items-center"
                    >
                      <MaterialCommunityIcons
                        name="delete-outline"
                        size={14}
                        color="#ef4444"
                      />
                      <Text className="text-red-500 font-medium text-xs ml-1">
                        Delete
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {med.schedule?.[0]?.status === "taken" ? (
                    <View className="bg-green-100 px-3 py-2 rounded-full">
                      <Text className="text-green-700 font-bold text-xs">
                        Taken ✓
                      </Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      onPress={() => confirmDose(med._id, 0)}
                      className="bg-blue-600 px-4 py-2 rounded-full"
                    >
                      <Text className="text-white font-medium text-xs">
                        Mark Taken
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

      {/* Add / Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white rounded-t-3xl p-6 pb-10">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-2xl font-bold text-slate-800">
                {editingMed ? "Edit Medicine" : "Add Medicine"}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialCommunityIcons
                  name="close"
                  size={24}
                  color="#94a3b8"
                />
              </TouchableOpacity>
            </View>

            <Text className="text-slate-500 text-sm mb-1 font-medium">
              Medicine Name
            </Text>
            <TextInput
              className="bg-slate-100 rounded-xl px-4 py-3 text-slate-800 mb-4"
              placeholder="e.g. Paracetamol"
              placeholderTextColor="#94a3b8"
              value={formName}
              onChangeText={setFormName}
            />

            <Text className="text-slate-500 text-sm mb-1 font-medium">
              Dosage
            </Text>
            <TextInput
              className="bg-slate-100 rounded-xl px-4 py-3 text-slate-800 mb-4"
              placeholder="e.g. 500mg"
              placeholderTextColor="#94a3b8"
              value={formDosage}
              onChangeText={setFormDosage}
            />

            <Text className="text-slate-500 text-sm mb-1 font-medium">
              Time
            </Text>
            <TextInput
              className="bg-slate-100 rounded-xl px-4 py-3 text-slate-800 mb-4"
              placeholder="e.g. 08:00 AM"
              placeholderTextColor="#94a3b8"
              value={formTime}
              onChangeText={setFormTime}
            />

            <Text className="text-slate-500 text-sm mb-1 font-medium">
              Notes (optional)
            </Text>
            <TextInput
              className="bg-slate-100 rounded-xl px-4 py-3 text-slate-800 mb-6"
              placeholder="e.g. Take after meals"
              placeholderTextColor="#94a3b8"
              value={formNotes}
              onChangeText={setFormNotes}
            />

            <TouchableOpacity
              onPress={handleSave}
              className="bg-blue-600 py-4 rounded-2xl items-center"
            >
              <Text className="text-white font-bold text-base">
                {editingMed ? "Save Changes" : "Add Medicine"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
