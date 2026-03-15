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

interface ObjectItem {
    _id: string;
    objectName: string;
    location: string;
    createdAt: string;
}

export default function ObjectsScreen() {
    const [objects, setObjects] = useState<ObjectItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingObj, setEditingObj] = useState<ObjectItem | null>(null);

    // Form state
    const [formName, setFormName] = useState("");
    const [formLocation, setFormLocation] = useState("");

    const fetchObjects = async () => {
        try {
            setLoading(true);
            const userId = await AsyncStorage.getItem("userId");
            if (!userId) {
                setLoading(false);
                return;
            }

            const response = await api.get<ObjectItem[]>(
                `/objects/user/${userId}`,
            );
            const rawObjects = Array.isArray(response.data)
                ? response.data
                : (response as any);
            setObjects(rawObjects);
        } catch (error) {
            console.error("Error fetching objects:", error);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchObjects();
        }, []),
    );

    const openAddModal = () => {
        setEditingObj(null);
        setFormName("");
        setFormLocation("");
        setModalVisible(true);
    };

    const openEditModal = (obj: ObjectItem) => {
        setEditingObj(obj);
        setFormName(obj.objectName);
        setFormLocation(obj.location);
        setModalVisible(true);
    };

    const handleSave = async () => {
        if (!formName.trim() || !formLocation.trim()) {
            Alert.alert("Missing Fields", "Please fill in both object name and location.");
            return;
        }

        const userId = await AsyncStorage.getItem("userId");
        if (!userId) return;

        const payload = {
            userId,
            objectName: formName.trim(),
            location: formLocation.trim(),
        };

        try {
            if (editingObj) {
                await api.put(`/objects/${editingObj._id}`, payload);
            } else {
                await api.post("/objects", payload);
            }
            setModalVisible(false);
            fetchObjects();
        } catch (error) {
            console.error("Error saving object:", error);
            Alert.alert("Error", "Could not save object.");
        }
    };

    const handleDelete = (obj: ObjectItem) => {
        Alert.alert(
            "Delete Object",
            `Are you sure you want to remove "${obj.objectName}"?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await api.delete(`/objects/${obj._id}`);
                            fetchObjects();
                        } catch (error) {
                            console.error("Error deleting object:", error);
                            Alert.alert("Error", "Could not delete object.");
                        }
                    },
                },
            ]
        );
    };

    const formatDate = (dateStr: string) => {
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            });
        } catch {
            return "Recently";
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-slate-50">
            <ScrollView className="flex-1 px-6 pt-6">
                <View className="flex-row justify-between items-center mb-2">
                    <Text className="text-3xl font-bold text-slate-800">Objects</Text>
                    <View className="flex-row gap-2">
                        <TouchableOpacity
                            onPress={openAddModal}
                            className="p-2 bg-indigo-600 rounded-full"
                        >
                            <MaterialCommunityIcons name="plus" size={20} color="white" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={fetchObjects}
                            className="p-2 bg-slate-200 rounded-full"
                        >
                            <MaterialCommunityIcons name="refresh" size={20} color="#475569" />
                        </TouchableOpacity>
                    </View>
                </View>
                <Text className="text-slate-500 mb-6">
                    Track where you keep your things.
                </Text>

                {loading ? (
                    <ActivityIndicator size="large" color="#4f46e5" className="mt-10" />
                ) : objects.length === 0 ? (
                    <View className="items-center mt-10">
                        <MaterialCommunityIcons name="map-marker-question-outline" size={48} color="#cbd5e1" />
                        <Text className="text-slate-400 mt-4">
                            No objects tracked yet.
                        </Text>
                        <Text className="text-slate-400 mt-1 text-center px-8">
                            Add items you want to remember the location of, or tell the voice assistant!
                        </Text>
                        <TouchableOpacity
                            onPress={openAddModal}
                            className="mt-4 bg-indigo-600 px-6 py-3 rounded-full"
                        >
                            <Text className="text-white font-medium">Track Your First Object</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View className="gap-4">
                        {objects.map((obj) => (
                            <View
                                key={obj._id}
                                className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100"
                            >
                                <View className="flex-row items-center mb-3">
                                    <View className="w-12 h-12 rounded-full bg-indigo-100 items-center justify-center">
                                        <MaterialCommunityIcons
                                            name="map-marker"
                                            size={24}
                                            color="#4f46e5"
                                        />
                                    </View>
                                    <View className="ml-4 flex-1">
                                        <Text className="text-lg font-bold text-slate-800">
                                            {obj.objectName}
                                        </Text>
                                        <View className="flex-row items-center mt-1">
                                            <MaterialCommunityIcons
                                                name="crosshairs-gps"
                                                size={14}
                                                color="#64748b"
                                            />
                                            <Text className="text-slate-500 ml-1">
                                                {obj.location}
                                            </Text>
                                        </View>
                                        <Text className="text-slate-400 text-xs mt-1">
                                            Saved {formatDate(obj.createdAt)}
                                        </Text>
                                    </View>
                                </View>

                                <View className="flex-row justify-end gap-2">
                                    <TouchableOpacity
                                        onPress={() => openEditModal(obj)}
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
                                        onPress={() => handleDelete(obj)}
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
                                {editingObj ? "Edit Object" : "Add Object"}
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
                            Object Name
                        </Text>
                        <TextInput
                            className="bg-slate-100 rounded-xl px-4 py-3 text-slate-800 mb-4"
                            placeholder="e.g. Keys, Glasses, Wallet"
                            placeholderTextColor="#94a3b8"
                            value={formName}
                            onChangeText={setFormName}
                        />

                        <Text className="text-slate-500 text-sm mb-1 font-medium">
                            Location
                        </Text>
                        <TextInput
                            className="bg-slate-100 rounded-xl px-4 py-3 text-slate-800 mb-6"
                            placeholder="e.g. Living room table, Bedroom drawer"
                            placeholderTextColor="#94a3b8"
                            value={formLocation}
                            onChangeText={setFormLocation}
                        />

                        <TouchableOpacity
                            onPress={handleSave}
                            className="bg-indigo-600 py-4 rounded-2xl items-center"
                        >
                            <Text className="text-white font-bold text-base">
                                {editingObj ? "Save Changes" : "Save Object"}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}
