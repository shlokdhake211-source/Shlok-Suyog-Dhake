import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Message, Role, Settings, Theme, 
  AVAILABLE_VOICES, AVAILABLE_MODELS 
} from './types';
import { streamChatResponse, generateSpeech } from './services/geminiService';
import { audioPlayer } from './services/audioUtils';
import { 
  SendIcon, SettingsIcon, TrashIcon, BotIcon, UserIcon, 
  KeyIcon, LogOutIcon, StopIcon, VolumeIcon
} from './components/Icons';

function App() {
  // --- State ---
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem('jarvis_api_key') || '');
  const [tempKeyInput, setTempKeyInput] = useState('');
  
  const [messages, setMessages] = useState<Message[]>([
    { 
      id: 'init', 
      role: Role.MODEL, 
      text: "I am online. Systems functioning within normal parameters. How may I assist you?", 
      timestamp: Date.now() 
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const [settings, setSettings] = useState<Settings>(() => {
    const saved = localStorage.getItem('jarvis_settings');
    return saved ? JSON.parse(saved) : {
      theme: Theme.JARVIS,
      enableTTS: false,
      voiceName: 'Puck',
      model: 'gemini-2.5-flash',
      systemInstruction: 'You are JARVIS, a highly advanced AI assistant. You are helpful, precise, and slightly witty. You prefer concise answers but can go into detail when requested.'
    };
  });
  
  const [showSettings, setShowSettings] = useState(false);

  // --- Refs ---
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // --- Effects ---
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    localStorage.setItem('jarvis_settings', JSON.stringify(settings));
    
    // Apply Theme
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark', 'jarvis');
    
    if (settings.theme === Theme.JARVIS) {
      root.classList.add('dark');
      document.body.style.setProperty('--primary-glow', '#06b2c8');
    } else {
      root.classList.add(settings.theme);
      document.body.style.removeProperty('--primary-glow');
    }
  }, [settings]);

  // --- Handlers ---
  const handleSaveKey = () => {
    if (tempKeyInput.trim()) {
      const key = tempKeyInput.trim();
      localStorage.setItem('jarvis_api_key', key);
      setApiKey(key);
    }
  };

  const handleRemoveKey = () => {
    localStorage.removeItem('jarvis_api_key');
    setApiKey('');
    setTempKeyInput('');
    setShowSettings(false);
    setMessages([{ 
      id: 'init', 
      role: Role.MODEL, 
      text: "System reset. Please re-authenticate.", 
      timestamp: Date.now() 
    }]);
  };

  const handleSendMessage = useCallback(async () => {
    if (!input.trim() || isTyping || !apiKey) return;

    const userText = input.trim();
    const userMessage: Message = {
      id: Date.now().toString(),
      role: Role.USER,
      text: userText,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      const modelMessageId = (Date.now() + 1).toString();
      let currentResponse = '';

      // Add placeholder for model response
      setMessages(prev => [...prev, {
        id: modelMessageId,
        role: Role.MODEL,
        text: '',
        timestamp: Date.now()
      }]);

      await streamChatResponse(
        apiKey,
        settings.model,
        messages.concat(userMessage), // Pass updated history
        userText,
        settings.systemInstruction,
        (chunk) => {
          currentResponse += chunk;
          setMessages(prev => prev.map(msg => 
            msg.id === modelMessageId ? { ...msg, text: currentResponse } : msg
          ));
        }
      );

      // Handle TTS
      if (settings.enableTTS && currentResponse) {
         setIsSpeaking(true);
         const audioData = await generateSpeech(apiKey, currentResponse, settings.voiceName);
         if (audioData) {
           await audioPlayer.play(audioData);
         }
         setIsSpeaking(false);
      }

    } catch (error: any) {
      console.error(error);
      const errorMessage = error.message?.includes('403') || error.message?.includes('key') 
        ? "Access Denied. Please check your API Key." 
        : "I encountered a system error processing that request.";
        
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: Role.MODEL,
        text: errorMessage,
        timestamp: Date.now(),
        isError: true
      }]);
    } finally {
      setIsTyping(false);
    }
  }, [input, isTyping, messages, settings, apiKey]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleInputResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  const handleStopAudio = () => {
    audioPlayer.stop();
    setIsSpeaking(false);
  };

  const handleClearHistory = () => {
    setMessages([{ 
      id: Date.now().toString(), 
      role: Role.MODEL, 
      text: "Memory wiped. Ready for new instructions.", 
      timestamp: Date.now() 
    }]);
    setShowSettings(false);
  };

  // --- Render Login ---
  if (!apiKey) {
    return (
      <div className="min-h-screen bg-gray-950 text-cyan-50 font-sans flex flex-col items-center justify-center p-4 selection:bg-cyan-500/30">
        <div className="w-full max-w-md space-y-8 animate-fade-in">
          
          <div className="flex flex-col items-center justify-center space-y-6">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-cyan-400 to-blue-600 rounded-full blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative w-24 h-24 rounded-full bg-gray-900 border border-cyan-500/30 flex items-center justify-center shadow-[0_0_40px_rgba(6,178,200,0.15)]">
                <div className="text-cyan-400"><BotIcon /></div>
              </div>
            </div>
            
            <div className="text-center space-y-2">
              <h1 className="text-4xl font-bold tracking-tight text-white font-mono">
                JARVIS
              </h1>
              <p className="text-cyan-400/60 text-sm tracking-widest uppercase">System Initialization</p>
            </div>
          </div>

          <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-8 shadow-2xl space-y-6">
             <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-500">API Access Key (Free)</label>
                <div className="relative group">
                  <input 
                    type="password"
                    value={tempKeyInput}
                    onChange={(e) => setTempKeyInput(e.target.value)}
                    placeholder="Paste your Gemini Key here..."
                    className="w-full bg-gray-950/80 border border-gray-800 rounded-xl py-4 px-5 pl-12 text-gray-100 placeholder-gray-700 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none transition-all font-mono text-sm"
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveKey()}
                  />
                  <div className="absolute left-4 top-4 text-gray-600 group-focus-within:text-cyan-400 transition-colors">
                    <KeyIcon />
                  </div>
                </div>
                <p className="text-[10px] text-gray-600 leading-relaxed">
                  The key allows you to use Google's servers for free. It is stored only in your browser.
                </p>
             </div>
             
             <button 
               onClick={handleSaveKey}
               disabled={!tempKeyInput}
               className="w-full py-4 bg-gradient-to-r from-cyan-700 to-cyan-600 hover:from-cyan-600 hover:to-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold tracking-wide rounded-xl shadow-lg shadow-cyan-900/20 transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3"
             >
               CONNECT TO MAINFRAME
               <SendIcon />
             </button>

             <div className="pt-6 border-t border-gray-800/50 text-center">
                <a 
                  href="https://aistudio.google.com/app/apikey" 
                  target="_blank" 
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-cyan-500/80 hover:text-cyan-400 transition-colors font-mono hover:underline"
                >
                  Get a Free Gemini Key Here <span className="text-xs">↗</span>
                </a>
             </div>
          </div>
        </div>
      </div>
    );
  }

  // --- Render Chat ---
  const isJarvis = settings.theme === Theme.JARVIS;
  const bubbleUser = isJarvis ? 'bg-cyan-900/30 border border-cyan-500/30 text-cyan-50' : 'bg-blue-600 text-white dark:bg-blue-600';
  const bubbleModel = isJarvis ? 'bg-transparent text-cyan-100' : 'bg-gray-200 text-gray-900 dark:bg-gray-800 dark:text-gray-100';

  return (
    <div className={`flex flex-col h-screen ${isJarvis ? 'bg-gray-950 text-cyan-50' : 'bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100'}`}>
      
      {/* Header */}
      <header className={`flex items-center justify-between px-6 py-4 border-b ${isJarvis ? 'bg-gray-950/80 border-cyan-900/30' : 'bg-white/80 dark:bg-gray-900/80 border-gray-200 dark:border-gray-800'} backdrop-blur-md sticky top-0 z-10`}>
        <div className="flex items-center gap-3">
           <div className={`p-2 rounded-full ${isJarvis ? 'bg-cyan-500/10 text-cyan-400 shadow-[0_0_15px_rgba(6,178,200,0.2)]' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'}`}>
             <BotIcon />
           </div>
           <h1 className={`text-lg font-bold tracking-tight ${isJarvis ? 'font-mono' : 'font-sans'}`}>
             JARVIS
           </h1>
        </div>
        <div className="flex items-center gap-2">
           {isSpeaking && (
              <button 
                onClick={handleStopAudio}
                className="p-2 rounded-full hover:bg-red-500/10 text-red-500 transition-colors animate-pulse"
                title="Stop Speaking"
              >
                <StopIcon />
              </button>
           )}
           <button 
             onClick={() => setShowSettings(true)}
             className={`p-2 rounded-full transition-all ${isJarvis ? 'hover:bg-cyan-500/10 hover:text-cyan-400' : 'hover:bg-gray-200 dark:hover:bg-gray-800'}`}
           >
             <SettingsIcon />
           </button>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto p-4 space-y-6">
        <div className="max-w-3xl mx-auto flex flex-col space-y-6">
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex w-full ${msg.role === Role.USER ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex max-w-[85%] md:max-w-[75%] gap-3 ${msg.role === Role.USER ? 'flex-row-reverse' : 'flex-row'}`}>
                
                {/* Avatar */}
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-1 
                  ${msg.role === Role.USER 
                    ? (isJarvis ? 'bg-cyan-900 text-cyan-300' : 'bg-gray-200 dark:bg-gray-700') 
                    : (isJarvis ? 'bg-transparent text-cyan-500 shadow-[0_0_10px_rgba(6,178,200,0.3)]' : 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300')
                  }`}>
                  {msg.role === Role.USER ? <UserIcon /> : <BotIcon />}
                </div>

                {/* Bubble */}
                <div className={`relative px-5 py-3.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-sm ${msg.role === Role.USER ? bubbleUser : bubbleModel} ${msg.isError ? 'border border-red-500/50 text-red-400' : ''}`}>
                   {msg.text || (
                     <div className="flex gap-1 h-5 items-center px-1">
                       <span className="w-1.5 h-1.5 bg-current rounded-full typing-dot"></span>
                       <span className="w-1.5 h-1.5 bg-current rounded-full typing-dot"></span>
                       <span className="w-1.5 h-1.5 bg-current rounded-full typing-dot"></span>
                     </div>
                   )}
                </div>

              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input Area */}
      <div className={`p-4 border-t ${isJarvis ? 'border-cyan-900/30 bg-gray-950/80' : 'border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80'} backdrop-blur-md`}>
        <div className="max-w-3xl mx-auto relative flex items-end gap-2 bg-transparent">
            <div className={`relative flex-1 rounded-2xl border transition-all duration-300
              ${isJarvis 
                ? 'bg-gray-900/50 border-cyan-900/50 focus-within:border-cyan-500/50 focus-within:shadow-[0_0_20px_rgba(6,178,200,0.1)]' 
                : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 focus-within:border-blue-500'
              }`}>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInputResize}
                onKeyDown={handleKeyDown}
                placeholder="Send a command..."
                rows={1}
                className="w-full bg-transparent px-4 py-3.5 max-h-32 min-h-[52px] resize-none outline-none text-sm"
                style={{ overflowY: input.length > 100 ? 'auto' : 'hidden' }}
              />
            </div>
            
            <button
              onClick={handleSendMessage}
              disabled={!input.trim() || isTyping}
              className={`p-3.5 rounded-full flex-shrink-0 transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100
                ${isJarvis 
                  ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_15px_rgba(6,178,200,0.3)]' 
                  : 'bg-blue-600 hover:bg-blue-500 text-white'
                }`}
            >
              <SendIcon />
            </button>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className={`w-full max-w-lg rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto
            ${isJarvis ? 'bg-gray-900 border border-cyan-500/30' : 'bg-white dark:bg-gray-800'}
          `}>
            <div className="p-6 border-b border-gray-700/50 flex justify-between items-center sticky top-0 bg-inherit z-10">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <SettingsIcon /> System Config
              </h2>
              <button onClick={() => setShowSettings(false)} className="opacity-70 hover:opacity-100">✕</button>
            </div>

            <div className="p-6 space-y-6">
              
              {/* Theme Section */}
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-widest opacity-60">Interface Theme</label>
                <div className="grid grid-cols-3 gap-2">
                  {[Theme.JARVIS, Theme.DARK, Theme.LIGHT].map(t => (
                    <button
                      key={t}
                      onClick={() => setSettings(s => ({ ...s, theme: t }))}
                      className={`py-2 px-4 rounded-lg text-sm font-medium capitalize border transition-all
                        ${settings.theme === t 
                          ? (isJarvis ? 'bg-cyan-900/50 border-cyan-500 text-cyan-400' : 'bg-blue-100 border-blue-500 text-blue-700 dark:bg-blue-900 dark:text-blue-300') 
                          : 'border-transparent hover:bg-gray-100 dark:hover:bg-gray-700/50'
                        }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Share Section (New) */}
              <div className={`p-4 rounded-xl border ${isJarvis ? 'bg-cyan-900/10 border-cyan-800' : 'bg-blue-50 border-blue-100 dark:bg-blue-900/10 dark:border-blue-900'}`}>
                <h3 className="font-bold mb-2 flex items-center gap-2 text-sm">
                  <span className="text-lg">🎁</span> How to Share JARVIS
                </h3>
                <p className="text-xs mb-3 opacity-70">To let your friends use this, you need to host it. The easiest way is using StackBlitz:</p>
                <ol className="list-decimal ml-4 space-y-2 text-xs opacity-80 leading-relaxed">
                   <li>Go to <a href="https://stackblitz.com" target="_blank" className="underline font-bold text-cyan-400">StackBlitz.com</a>.</li>
                   <li>Click <strong>"New Project"</strong> and select <strong>"React TypeScript"</strong>.</li>
                   <li>Delete the existing files there and <strong>Copy & Paste</strong> the code from this app into that project.</li>
                   <li>Click the <strong>"Share"</strong> button at the top to get a live link.</li>
                   <li>Send that link to your friends! They can enter their own free key.</li>
                </ol>
              </div>

              {/* Model Section */}
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-widest opacity-60">Neural Network (Model)</label>
                <select 
                  value={settings.model}
                  onChange={(e) => setSettings(s => ({ ...s, model: e.target.value }))}
                  className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-cyan-500/50"
                >
                  {AVAILABLE_MODELS.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              {/* Voice Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-widest opacity-60">Vocal Synthesizer</label>
                  <button 
                    onClick={() => setSettings(s => ({ ...s, enableTTS: !s.enableTTS }))}
                    className={`text-xs px-2 py-1 rounded transition-colors flex items-center gap-1 ${settings.enableTTS ? 'bg-green-500/20 text-green-500' : 'bg-gray-500/20 text-gray-500'}`}
                  >
                    <VolumeIcon muted={!settings.enableTTS} /> {settings.enableTTS ? 'ON' : 'OFF'}
                  </button>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {AVAILABLE_VOICES.map(voice => (
                    <button
                      key={voice}
                      onClick={() => setSettings(s => ({ ...s, voiceName: voice, enableTTS: true }))}
                      className={`py-2 rounded-lg text-xs font-medium border transition-all
                        ${settings.voiceName === voice 
                          ? (isJarvis ? 'bg-cyan-900/50 border-cyan-500 text-cyan-400' : 'bg-blue-100 border-blue-500 text-blue-700 dark:bg-blue-900 dark:text-blue-300') 
                          : 'border-transparent hover:bg-gray-100 dark:hover:bg-gray-700/50'
                        }`}
                    >
                      {voice}
                    </button>
                  ))}
                </div>
              </div>

              {/* System Instructions */}
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-widest opacity-60">Core Directive (System Prompt)</label>
                <textarea 
                  value={settings.systemInstruction}
                  onChange={(e) => setSettings(s => ({ ...s, systemInstruction: e.target.value }))}
                  className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-cyan-500/50 text-sm h-24 resize-none"
                  placeholder="e.g., You are a helpful assistant..."
                />
              </div>

              {/* Danger Zone */}
              <div className="pt-6 border-t border-gray-700/50 flex flex-col gap-3">
                 <button 
                   onClick={handleClearHistory}
                   className="w-full py-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                 >
                   <TrashIcon /> Clear Chat History
                 </button>
                 <button 
                   onClick={handleRemoveKey}
                   className="w-full py-3 rounded-xl border border-red-500/30 text-red-500 hover:bg-red-500/10 text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                 >
                   <LogOutIcon /> Disconnect API Key
                 </button>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;