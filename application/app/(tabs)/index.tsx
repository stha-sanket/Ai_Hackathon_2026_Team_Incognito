import {
  View,
  Text,
  TouchableOpacity,
  Platform,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useEffect, useRef } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { speechService } from "../../services/SpeechRecognitionService";

interface Message {
  id: string;
  text: string;
  sender: "user" | "ai";
  timestamp: Date;
}

export default function VoiceScreen() {
  const [isRecording, setIsRecording] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "नमस्ते! म तपाइँको स्वास्थ्य सहायक केयर+ हुँ। म तपाइँलाई कसरी मद्दत गर्न सक्छु?",
      sender: "ai",
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
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
          // When we get a final result, we "send" it to the chat
          if (result.isFinal) {
            handleSendMessage(result.transcript);
            setIsRecording(false);
          }
        }
      } else if (event.type === "error") {
        setIsRecording(false);
        console.error(`Speech Error: ${event.error}`);
      }
    });

    return () => {
      speechService.removeListener();
      speechService.stopSpeaking();
    };
  }, []);

  const handleSendMessage = (text: string) => {
    if (!text.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: text,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");

    // Simulate AI response in Nepali
    setTimeout(() => {
      const responseText = getMockNepaliResponse(text);
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: responseText,
        sender: "ai",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiResponse]);

      // Speak the response
      speechService.speak(responseText, () => {
        // If voice mode is on, start listening again after AI finishes speaking
        if (isVoiceMode) {
          startListening();
        }
      });
    }, 800);
  };

  const getMockNepaliResponse = (userInput: string) => {
    const input = userInput.toLowerCase();

    // Simple response logic (can be expanded)
    if (input.includes("टाउको") || input.includes("headache")) {
      return "तपाइँको टाउको दुखाइको लागि आराम गर्नुहोस् र धेरै पानी पिउनुहोस्।";
    }
    if (input.includes("ज्वरो") || input.includes("fever")) {
      return "ज्वरो आएको बेला शरीरको तापक्रम जाँच गरिरहनुहोस्।";
    }
    if (input.includes("धन्न्यवाद") || input.includes("thank")) {
      return "तपाइँलाई स्वागत छ!";
    }

    return "म तपाइँको कुरा बुझ्दैछु। अरु केहि समस्या छ?";
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
      <Text
        className={`text-base leading-6 ${item.sender === "user" ? "text-white font-medium" : "text-slate-800"}`}
      >
        {item.text}
      </Text>
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
                  Health Companion
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

          <View className="flex-row items-center p-2 mb-4 bg-white rounded-3xl shadow-md border border-slate-100">
            <TouchableOpacity
              onPress={toggleRecording}
              className={`w-12 h-12 rounded-full items-center justify-center ${isRecording ? "bg-red-500" : "bg-slate-50"}`}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name={isRecording ? "stop" : "microphone"}
                size={24}
                color={isRecording ? "white" : "#475569"}
              />
            </TouchableOpacity>

            <TextInput
              placeholder="यहाँ टाइप गर्नुहोस् वा बोल्नुहोस्..."
              className="flex-1 px-4 py-2 text-slate-800 text-base max-h-24"
              value={inputText}
              onChangeText={setInputText}
              multiline={false}
              placeholderTextColor="#94a3b8"
            />

            <TouchableOpacity
              onPress={() => handleSendMessage(inputText)}
              disabled={!inputText.trim()}
              className={`w-12 h-12 rounded-full items-center justify-center ${
                inputText.trim() ? "bg-blue-600" : "bg-slate-100"
              }`}
            >
              <MaterialCommunityIcons
                name="send"
                size={24}
                color={inputText.trim() ? "white" : "#cbd5e1"}
              />
            </TouchableOpacity>
          </View>

          <Text className="text-center text-[10px] text-slate-400 mb-2">
            तपाइँ नेपाली वा अंग्रेजीमा संवाद गर्न सक्नुहुन्छ
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
