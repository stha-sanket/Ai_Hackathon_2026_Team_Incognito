import {
  GoogleGenerativeAI,
  FunctionCallingMode,
  type Tool,
} from "@google/generative-ai";
import { Medicine } from "../medicine/medicineModel.ts";
import { Mood } from "../mood/moodModel.ts";
import { ChatMessage } from "./ChatModel.ts";
import { ragService } from "./RAGService.ts";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// --- Agent Tool Declarations ---
const tools: Tool[] = [
  {
    functionDeclarations: [
      {
        name: "get_medicines",
        description:
          "प्रयोगकर्ताको औषधि सूची प्राप्त गर्नुहोस् (Get the user's list of medicines)",
        parameters: {
          type: "OBJECT" as any,
          properties: {
            userId: {
              type: "STRING" as any,
              description: "User's ID",
            },
          },
          required: ["userId"],
        },
      },
      {
        name: "add_medicine",
        description:
          "नयाँ औषधि थप्नुहोस् (Add a new medicine to the user's schedule)",
        parameters: {
          type: "OBJECT" as any,
          properties: {
            userId: { type: "STRING" as any, description: "User's ID" },
            name: {
              type: "STRING" as any,
              description: "औषधिको नाम (Medicine name)",
            },
            dosage: {
              type: "STRING" as any,
              description: "मात्रा जस्तै 500mg (Dosage e.g. 500mg)",
            },
            time: {
              type: "STRING" as any,
              description:
                "समय जस्तै बिहान ०८:०० (Time e.g. 08:00 AM or बिहान)",
            },
            notes: {
              type: "STRING" as any,
              description: "अतिरिक्त नोट (Optional notes)",
            },
          },
          required: ["userId", "name", "dosage", "time"],
        },
      },
      {
        name: "mark_medicine_taken",
        description:
          "औषधि खाइएको चिन्ह लगाउनुहोस् (Mark a medicine as taken or skipped)",
        parameters: {
          type: "OBJECT" as any,
          properties: {
            medicineId: { type: "STRING" as any, description: "Medicine ID" },
            scheduleIndex: {
              type: "NUMBER" as any,
              description: "Schedule slot index (0-based)",
            },
            status: {
              type: "STRING" as any,
              description: "Status: taken or skipped",
            },
          },
          required: ["medicineId", "scheduleIndex", "status"],
        },
      },
      {
        name: "log_mood",
        description:
          "प्रयोगकर्ताको मनस्थिति रेकर्ड गर्नुहोस् (Log the user's current mood based on the conversation)",
        parameters: {
          type: "OBJECT" as any,
          properties: {
            userId: { type: "STRING" as any, description: "User's ID" },
            score: {
              type: "NUMBER" as any,
              description: "Mood score from 1 (very sad) to 10 (very happy)",
            },
            sentiment: {
              type: "STRING" as any,
              description: "positive, neutral, or negative",
            },
            notes: {
              type: "STRING" as any,
              description: "Brief context from conversation",
            },
          },
          required: ["userId", "score", "sentiment"],
        },
      },
      {
        name: "get_mood_report",
        description:
          "पछिल्लो ७ दिनको मनस्थिति रिपोर्ट प्राप्त गर्नुहोस् (Get a mood report for the last 7 days)",
        parameters: {
          type: "OBJECT" as any,
          properties: {
            userId: { type: "STRING" as any, description: "User's ID" },
          },
          required: ["userId"],
        },
      },
      {
        name: "get_conversation_history",
        description:
          "कुराकानी इतिहास प्राप्त गर्नुहोस् (Get recent conversation history)",
        parameters: {
          type: "OBJECT" as any,
          properties: {
            userId: { type: "STRING" as any, description: "User's ID" },
            limit: {
              type: "NUMBER" as any,
              description: "Number of messages to retrieve",
            },
          },
          required: ["userId"],
        },
      },
    ],
  },
];

// --- Tool Execution ---
async function executeTool(name: string, args: any): Promise<string> {
  try {
    switch (name) {
      case "get_medicines": {
        const medicines = await Medicine.find({ userId: args.userId });
        if (medicines.length === 0)
          return "तपाइँको कुनै औषधि दर्ता गरिएको छैन।";
        const list = medicines
          .map(
            (m, i) =>
              `${i + 1}. [ID: ${m._id}] ${m.name} - ${m.dosage} (${m.schedule.map((s: any) => `${s.time}: ${s.status}`).join(", ")})`,
          )
          .join("\n");
        return `तपाइँका औषधिहरू:\n${list}`;
      }

      case "add_medicine": {
        const medicine = new Medicine({
          userId: args.userId,
          name: args.name,
          dosage: args.dosage,
          schedule: [{ time: args.time, status: "pending" }],
          notes: args.notes || "",
        });
        await medicine.save();
        return `"${args.name}" औषधि सफलतापूर्वक थपियो।`;
      }

      case "mark_medicine_taken": {
        const medicine = await Medicine.findById(args.medicineId);
        if (!medicine) return "औषधि फेला परेन।";
        const scheduleItem = medicine.schedule?.[args.scheduleIndex];
        if (scheduleItem) {
          scheduleItem.status = args.status;
          await medicine.save();
        }
        return `औषधि "${medicine.name}" ${args.status === "taken" ? "खाइएको" : "छोडिएको"} चिन्हित गरियो।`;
      }

      case "log_mood": {
        const mood = new Mood({
          userId: args.userId,
          score: args.score,
          sentiment: args.sentiment,
          notes: args.notes || "",
        });
        await mood.save();
        return `मनस्थिति रेकर्ड गरियो (${args.sentiment}, स्कोर: ${args.score}/10)।`;
      }

      case "get_mood_report": {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 7);
        const moods = await Mood.find({
          userId: args.userId,
          createdAt: { $gte: cutoff },
        }).sort({ createdAt: -1 });

        if (moods.length === 0) return "पछिल्लो ७ दिनमा मनस्थिति डाटा छैन।";

        const avg =
          moods.reduce((s: number, m: any) => s + m.score, 0) / moods.length;
        const sentiments = moods.map((m: any) => m.sentiment);
        const pos = sentiments.filter((s: string) => s === "positive").length;
        const neg = sentiments.filter((s: string) => s === "negative").length;
        return `पछिल्लो ७ दिनको रिपोर्ट: औसत स्कोर ${avg.toFixed(1)}/10, सकारात्मक दिन: ${pos}, नकारात्मक दिन: ${neg}`;
      }

      case "get_conversation_history": {
        const msgs = await ChatMessage.find({ userId: args.userId })
          .sort({ createdAt: -1 })
          .limit(args.limit || 10);
        if (msgs.length === 0) return "कुनै कुराकानी इतिहास छैन।";
        return msgs
          .reverse()
          .map(
            (m: any) =>
              `${m.role === "patient" ? "बिरामी" : "Care+"}: ${m.content}`,
          )
          .join("\n");
      }

      default:
        return "अज्ञात कार्य।";
    }
  } catch (err: any) {
    console.error(`Tool ${name} error:`, err);
    return `त्रुटि: ${err.message}`;
  }
}

// --- Main Agent Chat Function ---
export async function runAgentChat(
  userId: string,
  userMessage: string,
): Promise<string> {
  if (!GEMINI_API_KEY || GEMINI_API_KEY === "YOUR_GEMINI_API_KEY_HERE") {
    return "Gemini API key सेट गरिएको छैन। कृपया server1/.env मा GEMINI_API_KEY थप्नुहोस्।";
  }

  // RAG: inject relevant health knowledge
  const ragContext = ragService.retrieve(userMessage);

  // Proactive Medicine Check
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const pendingMedicines = await Medicine.find({
    userId,
    "schedule.status": "pending",
  });

  let proactiveInstruction = "";
  if (pendingMedicines.length > 0) {
    const overdueNames = pendingMedicines.map((m) => m.name).join(", ");
    proactiveInstruction = `\n[IMPORTANT INSTRUCTION]: The patient has pending medicines (${overdueNames}) that they haven't marked as taken today. You MUST proactively ask them (in Nepali) if they have taken their medicine yet. DO NOT skip this question.`;
  }

  // Build system prompt in Nepali
  const systemPrompt = `तपाइँ Care+ हुनुहुन्छ, एक बुद्धिमान स्वास्थ्य सहायक। 
तपाइँको काम बिरामीलाई नेपाली भाषामा सहयोग गर्नु हो।
तपाइँसँग यी क्षमताहरू छन्:
- औषधिको तालिका हेर्नुस् र थप्नुस्
- मनस्थिति ट्र्याक गर्नुस्
- स्वास्थ्य सल्लाह दिनुस्
- कुराकानीको रिपोर्ट दिनुस्

सधैं नेपालीमा जवाफ दिनुस्। छोटो र स्पष्ट जवाफ दिनुस्।
Current userId: ${userId}
${proactiveInstruction}

${ragContext ? ragContext : ""}`.trim();

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: systemPrompt,
    tools,
    toolConfig: { functionCallingConfig: { mode: FunctionCallingMode.AUTO } },
  });

  // Fetch recent conversation for context (last 6 messages)
  const history = await ChatMessage.find({ userId })
    .sort({ createdAt: -1 })
    .limit(6)
    .then((msgs) => msgs.reverse());

  const chatHistory = history.map((m: any) => ({
    role: (m.role === "patient" ? "user" : "model") as "user" | "model",
    parts: [{ text: m.content }],
  }));

  const chat = model.startChat({ history: chatHistory });

  try {
    // Save user message
    await ChatMessage.create({ userId, role: "patient", content: userMessage });

    // Send to Gemini
    let result = await chat.sendMessage(userMessage);

    // Agentic loop: keep calling tools until we get a text response
    while (true) {
      const candidate = result.response.candidates?.[0];
      if (!candidate) break;

      const parts = candidate.content.parts;
      const functionCallPart = parts.find((p: any) => p.functionCall);

      if (!functionCallPart || !functionCallPart.functionCall) {
        break; // Final text response
      }

      const { name, args } = functionCallPart.functionCall;
      console.log(`[Agent] Calling tool: ${name}`, args);
      const toolResult = await executeTool(name, args);
      console.log(`[Agent] Tool result: ${toolResult}`);

      // Send tool result back to model
      result = await chat.sendMessage([
        {
          functionResponse: {
            name,
            response: { result: toolResult },
          },
        },
      ]);
    }

    const finalText = result.response.text();

    // Save AI response
    await ChatMessage.create({ userId, role: "model", content: finalText });

    // --- Automated Mood Analysis (Post-Chat) ---
    // We don't await this to keep the chat response fast, though we could for reliability.
    // For now, let's fire and forget, or await to be safe.
    analyzeAndLogMood(userId, userMessage, finalText).catch((err) =>
      console.error("Auto-mood error:", err),
    );

    return finalText;
  } catch (err: any) {
    console.error("Gemini error:", err);
    throw err;
  }
}

/**
 * Automatically analyze the user's mood from the recent interaction and save it.
 */
async function analyzeAndLogMood(
  userId: string,
  userMessage: string,
  aiResponse: string,
) {
  try {
    const moodModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `Based on this interaction, determine the user's current mood.
User: "${userMessage}"
Care+: "${aiResponse}"

Provide a JSON response with:
- score: (Number 1-10)
- sentiment: (String: "positive", "neutral", or "negative")
- notes: (String: brief explanation in English)

Return ONLY JSON.`;

    const result = await moodModel.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\{.*\}/s);
    if (jsonMatch) {
      const { score, sentiment, notes } = JSON.parse(jsonMatch[0]);
      await Mood.create({
        userId,
        score: score || 5,
        sentiment: sentiment || "neutral",
        notes: notes || "Auto-logged from conversation",
      });
      console.log(`[Mood] Auto-logged: ${sentiment} (${score}/10)`);
    }
  } catch (err) {
    console.error("Failed to auto-log mood:", err);
  }
}

// --- Report Generation ---
export async function generateUserReport(userId: string): Promise<string> {
  if (!GEMINI_API_KEY || GEMINI_API_KEY === "YOUR_GEMINI_API_KEY_HERE") {
    return "Gemini API key सेट गरिएको छैन।";
  }

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
  });

  // Get last 7 days of data
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);

  const [medicines, moods, chats] = await Promise.all([
    Medicine.find({ userId }),
    Mood.find({ userId, createdAt: { $gte: cutoff } }),
    ChatMessage.find({ userId, createdAt: { $gte: cutoff } }).limit(20),
  ]);

  const dataContext = `
औषधिहरू: ${medicines.map((m: any) => `${m.name} ${m.dosage}`).join(", ") || "कुनै छैन"}
पछिल्लो ७ दिनका मनस्थिति: ${moods.map((m: any) => `${m.sentiment}(${m.score})`).join(", ") || "कुनै रेकर्ड छैन"}
पछिल्लो कुराकानीहरू: ${chats
    .map((c: any) => `${c.role}: ${c.content}`)
    .join(" | ")
    .slice(0, 500)}
`;

  const prompt = `तलको डाटाको आधारमा बिरामीको नेपालीमा स्वास्थ्य रिपोर्ट तयार गर्नुहोस्:\n${dataContext}\nरिपोर्ट छोटो, स्पष्ट र उपयोगी होस्।`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}
