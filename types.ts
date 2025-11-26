export enum Role {
  USER = 'user',
  MODEL = 'model'
}

export enum Theme {
  LIGHT = 'light',
  DARK = 'dark',
  JARVIS = 'jarvis' // Special cyan/dark theme
}

export interface Message {
  id: string;
  role: Role;
  text: string;
  timestamp: number;
  isError?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
}

export interface Settings {
  theme: Theme;
  enableTTS: boolean;
  voiceName: string;
  model: string;
  systemInstruction: string;
}

export const AVAILABLE_VOICES = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'];
export const AVAILABLE_MODELS = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Fastest)' },
  { id: 'gemini-2.5-flash-thinking', name: 'Gemini 2.5 Flash Thinking' },
  { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro (Smartest)' }
];
