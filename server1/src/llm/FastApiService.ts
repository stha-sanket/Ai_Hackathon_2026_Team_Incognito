import { ChatMessage } from "./ChatModel.ts";

const FASTAPI_URL = "http://localhost:8000/api/chat/agent";

export async function runFastApiChat(
    userId: string,
    userMessage: string,
): Promise<string> {
    // Fetch recent conversation for context (last 6 messages)
    const history = await ChatMessage.find({ userId })
        .sort({ createdAt: -1 })
        .limit(6)
        .then((msgs) => msgs.reverse());

    const chatHistory = history.map((m: any) => ({
        role: (m.role === "patient" ? "user" : "assistant") as "user" | "assistant",
        content: m.content,
    }));

    try {
        // Save user message to MongoDB
        await ChatMessage.create({ userId, role: "patient", content: userMessage });

        // Call FastAPI
        const response = await fetch(FASTAPI_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                userId,
                message: userMessage,
                history: chatHistory,
            }),
        });

        if (!response.ok) {
            throw new Error(`FastAPI error: ${response.statusText}`);
        }

        const data = await response.json();
        let reply = data.reply;

        // Clean markdown for better TTS performance
        const cleanReply = reply.replace(/\*\*/g, "").replace(/#/g, "").trim();

        // Save AI response to MongoDB (using original for display)
        await ChatMessage.create({ userId, role: "model", content: reply });

        return cleanReply;
    } catch (err: any) {
        console.error("FastAPI Connection Error:", err);
        return "माफ गर्नुहोस्, म अहिले जडान गर्न असमर्थ छु। (FastAPI Connection Error)";
    }
}
