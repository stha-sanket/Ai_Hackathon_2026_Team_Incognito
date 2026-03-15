import {
  View,
  Text,
  TouchableOpacity,
  Platform,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useEffect, useRef } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { speechService } from "../../services/SpeechRecognitionService";
import api from "../../services/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Markdown from "react-native-markdown-display";

interface Message {
  id: string;
  text: string;
  sender: "user" | "ai";
  timestamp: Date;
}

// Fallback responses when server is unavailable
const FALLBACK_RESPONSES: Record<string, string> = {
  default:
    "म तपाइँको कुरा बुझ्दैछु। सर्भर उपलब्ध छैन, कृपया पछि प्रयास गर्नुहोस्।",
  medicine: "औषधि सम्बन्धी जानकारीको लागि सर्भर जडान जाँच गर्नुहोस्।",
  mood: "तपाइँको मनस्थिति रेकर्ड गर्न सर्भरसँग जडान आवश्यक छ।",
};

function getFallback(text: string): string {
  if (text.includes("औषधि") || text.includes("medicine"))
    return FALLBACK_RESPONSES.medicine;
  if (text.includes("मन") || text.includes("mood"))
    return FALLBACK_RESPONSES.mood;
  return FALLBACK_RESPONSES.default;
}

export default function VoiceScreen() {
  const [isRecording, setIsRecording] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "नमस्ते! म तपाइँको स्वास्थ्य सहायक Care+ हुँ। म तपाइँलाई औषधि, मनस्थिति, र स्वास्थ्य सम्बन्धी कुराकानीमा सहयोग गर्न सक्छु। के गर्न सक्छु?",
      sender: "ai",
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    // Load or generate saved userId (must be 24-char hex for MongoDB ObjectId)
    const initUserId = async () => {
      let id = await AsyncStorage.getItem("userId");
      if (!id || id === "demo-user") {
        // Generate a valid 24-character hex string
        id = [...Array(24)]
          .map(() => Math.floor(Math.random() * 16).toString(16))
          .join("");
        await AsyncStorage.setItem("userId", id);
      }
      setUserId(id);
    };
    initUserId();

    // Check and request permissions on mount
    const checkPermissions = async () => {
      const granted = await speechService.requestPermissions();
      if (!granted && Platform.OS !== "web") {
        console.warn("Microphone permissions denied or native module missing");
      }
    };

    checkPermissions();

    // Register the listener
    speechService.setListener((event: any) => {
      if (event.type === "start") {
        setIsRecording(true);
      } else if (event.type === "end") {
        setIsRecording(false);
      } else if (event.type === "result") {
        if (event.results && event.results.length > 0) {
          const result = event.results[0];
          if (result.isFinal) {
            handleSendMessage(result.transcript);
            setIsRecording(false);
          }
        }
      } else if (event.type === "error") {
        setIsRecording(false);
        if (event.error !== "no-speech") {
          console.error(`Speech Error: ${event.error}`);
        }
      }
    });

    return () => {
      speechService.removeListener();
      speechService.stopSpeaking();
    };
  }, []);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setIsLoading(true);

    try {
      // Due to the speech listener capturing a stale closure of `userId` on mount,
      // we must fetch it directly from AsyncStorage if the state variable is null.
      const activeUserId = userId || (await AsyncStorage.getItem("userId"));

      if (!activeUserId) {
        throw new Error("User ID not loaded");
      }

      const response = await api.post<{ reply: string }>("/chat", {
        userId: activeUserId,
        message: text,
      });

      const responseText = (response.data as any)?.reply || getFallback(text);

      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: responseText,
        sender: "ai",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiResponse]);

      // Speak the response via TTS
      speechService.speak(responseText, () => {
        if (isVoiceMode) {
          startListening();
        }
      });
    } catch (error: any) {
      console.error("Chat API error:", error);
      const fallback = getFallback(text);
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: fallback,
        sender: "ai",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiResponse]);
      speechService.speak(fallback, () => {
        if (isVoiceMode) startListening();
      });
    } finally {
      setIsLoading(false);
    }
  };

  const startListening = () => {
    try {
      speechService.stopSpeaking();
      speechService.start("ne-NP");
      setIsRecording(true);
    } catch (e) {
      console.error(e);
      setIsRecording(false);
    }
  };

  const toggleRecording = async () => {
    try {
      if (isRecording) {
        speechService.stop();
        setIsRecording(false);
      } else {
        startListening();
      }
    } catch (e: any) {
      console.error(e);
      setIsRecording(false);
    }
  };

  const toggleVoiceMode = () => {
    const nextMode = !isVoiceMode;
    setIsVoiceMode(nextMode);
    if (nextMode) {
      startListening();
    } else {
      speechService.stopSpeaking();
      speechService.stop();
    }
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View
      className={`max-w-[85%] my-2 p-4 rounded-2xl ${
        item.sender === "user"
          ? "bg-blue-600 self-end rounded-tr-none shadow-sm"
          : "bg-white self-start rounded-tl-none border border-slate-100 shadow-sm"
      }`}
    >
      {item.sender === "user" ? (
        <Text className={`text-base leading-6 text-white font-medium`}>
          {item.text}
        </Text>
      ) : (
        <Markdown
          style={{
            body: {
              fontSize: 16,
              lineHeight: 24,
              color: "#1e293b",
            },
            paragraph: {
              marginTop: 0,
              marginBottom: 0,
            },
          }}
        >
          {item.text}
        </Markdown>
      )}
      <View className="flex-row justify-end mt-1 items-center">
        <Text
          className={`text-[10px] ${item.sender === "user" ? "text-blue-100" : "text-slate-400"}`}
        >
          {item.timestamp.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
        {item.sender === "ai" && (
          <MaterialCommunityIcons
            name="robot"
            size={12}
            color="#94a3b8"
            style={{ marginLeft: 4 }}
          />
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
      >
        <View className="flex-1 px-4 pt-4">
          {/* Header */}
          <View className="items-center mb-4 flex-row justify-between">
            <View className="flex-row items-center">
              <View className="bg-blue-100 p-2 rounded-xl mr-2">
                <MaterialCommunityIcons
                  name="heart-pulse"
                  size={24}
                  color="#2563eb"
                />
              </View>
              <View>
                <Text className="text-xl font-bold text-slate-800 leading-tight">
                  Care+
                </Text>
                <Text className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                  AI Health Agent
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={toggleVoiceMode}
              className={`flex-row items-center px-3 py-2 rounded-full ${isVoiceMode ? "bg-green-100" : "bg-slate-200"}`}
            >
              <MaterialCommunityIcons
                name={isVoiceMode ? "volume-high" : "volume-off"}
                size={18}
                color={isVoiceMode ? "#16a34a" : "#64748b"}
              />
              <Text
                className={`ml-1 text-xs font-bold ${isVoiceMode ? "text-green-700" : "text-slate-600"}`}
              >
                {isVoiceMode ? "VOICE ON" : "VOICE OFF"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Messages */}
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            className="flex-1"
            contentContainerStyle={{ paddingBottom: 20, paddingTop: 10 }}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({ animated: true })
            }
            onLayout={() =>
              flatListRef.current?.scrollToEnd({ animated: true })
            }
          />

          {/* Thinking indicator */}
          {isLoading && (
            <View className="flex-row items-center mb-2 px-2">
              <ActivityIndicator size="small" color="#2563eb" />
              <Text className="ml-2 text-slate-500 text-sm">
                Care+ सोच्दैछ...
              </Text>
            </View>
          )}

          {/* Input bar */}
          <View className="flex-row items-center p-2 mb-4 bg-white rounded-3xl shadow-md border border-slate-100">
            <TouchableOpacity
              onPress={toggleRecording}
              disabled={isLoading || !userId}
              className={`w-12 h-12 rounded-full items-center justify-center ${
                isRecording
                  ? "bg-red-500"
                  : isLoading || !userId
                    ? "bg-slate-200"
                    : "bg-slate-50"
              }`}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name={isRecording ? "stop" : "microphone"}
                size={24}
                color={
                  isRecording
                    ? "white"
                    : isLoading || !userId
                      ? "#cbd5e1"
                      : "#475569"
                }
              />
            </TouchableOpacity>

            <TextInput
              placeholder="यहाँ टाइप गर्नुहोस् वा बोल्नुहोस्..."
              className="flex-1 px-4 py-2 text-slate-800 text-base max-h-24"
              value={inputText}
              onChangeText={setInputText}
              multiline={false}
              placeholderTextColor="#94a3b8"
              editable={!isLoading && userId !== null}
            />

            <TouchableOpacity
              onPress={() => handleSendMessage(inputText)}
              disabled={!inputText.trim() || isLoading || !userId}
              className={`w-12 h-12 rounded-full items-center justify-center ${
                inputText.trim() && !isLoading && userId
                  ? "bg-blue-600"
                  : "bg-slate-100"
              }`}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#94a3b8" />
              ) : (
                <MaterialCommunityIcons
                  name="send"
                  size={24}
                  color={inputText.trim() ? "white" : "#cbd5e1"}
                />
              )}
            </TouchableOpacity>
          </View>

          <Text className="text-center text-[10px] text-slate-400 mb-2">
            Gemini Flash 2.0 Lite • नेपाली भाषा सहयोग
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
