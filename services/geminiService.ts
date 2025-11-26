import { GoogleGenAI, GenerateContentResponse, Modality } from "@google/genai";
import { Message, Role } from '../types';

// Helper to create client instance on the fly
const createClient = (apiKey: string) => new GoogleGenAI({ apiKey });

export const streamChatResponse = async (
  apiKey: string,
  modelId: string,
  history: Message[],
  newMessage: string,
  systemInstruction: string,
  onChunk: (text: string) => void
): Promise<string> => {
  if (!apiKey) throw new Error("API Key is required");

  const ai = createClient(apiKey);

  try {
    // Transform history for the API
    const historyForApi = history.map(msg => ({
      role: msg.role === Role.USER ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));

    const chat = ai.chats.create({
      model: modelId,
      history: historyForApi,
      config: {
        systemInstruction: systemInstruction,
      },
    });

    const result = await chat.sendMessageStream({ message: newMessage });
    
    let fullText = '';
    for await (const chunk of result) {
      const c = chunk as GenerateContentResponse;
      if (c.text) {
        fullText += c.text;
        onChunk(c.text);
      }
    }
    return fullText;
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    throw error;
  }
};

export const generateSpeech = async (apiKey: string, text: string, voiceName: string): Promise<string | null> => {
  if (!apiKey) return null;
  const ai = createClient(apiKey);

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName },
          },
        },
      },
    });

    // Extract base64 audio
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    return base64Audio || null;
  } catch (error) {
    console.error("TTS Generation Error:", error);
    return null;
  }
};