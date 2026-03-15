import { Platform, NativeModules } from "react-native";

export interface SpeechRecognitionResult {
  transcript: string;
  isFinal: boolean;
}

export type SpeechRecognitionCallback = (event: {
  type: "start" | "end" | "result" | "error";
  results?: SpeechRecognitionResult[];
  error?: string;
}) => void;

class SpeechRecognitionService {
  private listener: SpeechRecognitionCallback | null = null;
  private isNativeModuleAvailable = false;
  private nativeModule: any = null;
  private nativeSubscriptions: any[] = [];
  private webRecognizer: any = null;

  private isTTSSupported: boolean | null = null;

  constructor() {
    this.init();
  }

  private init() {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined") {
        const SpeechRecognition =
          (window as any).SpeechRecognition ||
          (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
          this.webRecognizer = new SpeechRecognition();
          this.webRecognizer.continuous = false;
          this.webRecognizer.interimResults = true;

          this.webRecognizer.onstart = () => this.listener?.({ type: "start" });
          this.webRecognizer.onend = () => this.listener?.({ type: "end" });
          this.webRecognizer.onresult = (event: any) => {
            const results = Array.from(event.results).map((res: any) => ({
              transcript: res[0].transcript,
              isFinal: res.isFinal,
            }));
            this.listener?.({ type: "result", results });
          };
          this.webRecognizer.onerror = (event: any) => {
            this.listener?.({ type: "error", error: event.error });
          };
        }
      }
    } else {
      try {
        // Safe require to avoid crash if module is missing or not linked
        const lib = require("expo-speech-recognition");
        this.nativeModule = lib.ExpoSpeechRecognitionModule;
        if (this.nativeModule) {
          this.isNativeModuleAvailable = true;
        }
      } catch (e) {
        console.warn(
          "SpeechRecognition native module not found. Check if it's linked.",
        );
      }
    }
  }

  setListener(callback: SpeechRecognitionCallback) {
    this.listener = callback;

    if (Platform.OS !== "web" && this.isNativeModuleAvailable) {
      try {
        this.removeNativeSubscriptions();

        this.nativeSubscriptions = [
          this.nativeModule.addListener("start", () => {
            this.listener?.({ type: "start" });
          }),
          this.nativeModule.addListener("end", () => {
            this.listener?.({ type: "end" });
          }),
          this.nativeModule.addListener("result", (event: any) => {
            const results = event.results.map((res: any) => ({
              transcript: res.transcript,
              isFinal: event.isFinal,
            }));
            this.listener?.({ type: "result", results });
          }),
          this.nativeModule.addListener("error", (event: any) => {
            this.listener?.({
              type: "error",
              error: event.message || event.error,
            });
          }),
        ];
      } catch (e) {
        console.warn("Failed to attach native speech listener", e);
      }
    }
  }

  removeListener() {
    this.listener = null;
    this.removeNativeSubscriptions();
  }

  private removeNativeSubscriptions() {
    this.nativeSubscriptions.forEach((sub) => sub.remove());
    this.nativeSubscriptions = [];
  }

  async requestPermissions(): Promise<boolean> {
    if (Platform.OS === "web") {
      // Browser usually asks on start(), so we just check support
      return !!this.webRecognizer;
    }

    if (!this.isNativeModuleAvailable) return false;

    try {
      const { status } = await this.nativeModule.requestPermissionsAsync();
      return status === "granted";
    } catch (e) {
      console.error("Failed to request permissions:", e);
      return false;
    }
  }

  start(lang: string = "ne-NP") {
    if (Platform.OS === "web") {
      if (this.webRecognizer) {
        try {
          this.webRecognizer.lang = lang;
          this.webRecognizer.start();
        } catch (e: any) {
          // If already started, stop and start again
          if (e.name === "InvalidStateError") {
            this.webRecognizer.stop();
            setTimeout(() => this.webRecognizer.start(), 100);
          } else {
            this.listener?.({ type: "error", error: e.message });
          }
        }
      } else {
        this.listener?.({
          type: "error",
          error: "Speech recognition not supported in this browser",
        });
      }
      return;
    }

    if (!this.isNativeModuleAvailable) {
      this.listener?.({
        type: "error",
        error: "Native module not found. Please rebuild the app.",
      });
      return;
    }

    try {
      this.nativeModule.start({
        lang,
        interimResults: true,
        continuous: false,
      });
    } catch (e: any) {
      this.listener?.({ type: "error", error: e.message });
    }
  }

  stop() {
    if (Platform.OS === "web") {
      try {
        this.webRecognizer?.stop();
      } catch (e) {
        // Ignore errors during stop
      }
    } else if (this.isNativeModuleAvailable) {
      try {
        this.nativeModule.stop();
      } catch (e) {
        // Ignore errors during stop
      }
    }
  }

  speak(text: string, onDone?: () => void) {
    if (Platform.OS === "android") {
      const RNTts = NativeModules.RNTts;
      if (!RNTts) {
        console.warn(
          "RNTts: Native module missing — please rebuild the app with 'npx expo run:android'.",
        );
        onDone?.();
        return;
      }
      try {
        RNTts.speak(text, () => {
          onDone?.();
        });
      } catch (e) {
        console.error("RNTts speak error:", e);
        onDone?.();
      }
    } else {
      // iOS / web fallback
      try {
        const Speech = require("expo-speech");
        Speech.speak(text, { language: "ne-NP", onDone });
      } catch (e) {
        onDone?.();
      }
    }
  }

  stopSpeaking() {
    if (Platform.OS === "android") {
      try {
        NativeModules.RNTts?.stop();
      } catch (e) {
        // ignore
      }
    } else {
      try {
        const Speech = require("expo-speech");
        Speech.stop();
      } catch (e) {
        // ignore
      }
    }
  }
}

export const speechService = new SpeechRecognitionService();
