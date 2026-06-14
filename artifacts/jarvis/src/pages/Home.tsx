import { useState, useEffect, useRef, FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Send, AlertTriangle, Key, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { useJarvis } from "@/hooks/useJarvis";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";

import { Orb } from "@/components/Orb";
import { ConversationHistory } from "@/components/ConversationHistory";
import { SettingsPanel } from "@/components/SettingsPanel";

export default function Home() {
  const jarvis = useJarvis();
  const recognition = useSpeechRecognition();
  const tts = useSpeechSynthesis();

  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [voiceSpeed, setVoiceSpeed] = useState(1.0);
  const [textInput, setTextInput] = useState("");
  const [keyDraft, setKeyDraft] = useState("");
  const autoStartListeningRef = useRef(false);

  // When speech recognition finishes, send the message
  useEffect(() => {
    if (!recognition.isListening && recognition.transcript && autoStartListeningRef.current) {
      handleSendMessage(recognition.transcript);
      autoStartListeningRef.current = false;
    }
  }, [recognition.isListening, recognition.transcript]);

  // Space bar shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === "Space" && jarvis.state === "idle") {
        e.preventDefault();
        toggleListening();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [jarvis.state, recognition.isListening]);

  const toggleListening = () => {
    if (recognition.isListening) {
      recognition.stopListening();
    } else {
      if (jarvis.state === "speaking") tts.stop();
      autoStartListeningRef.current = true;
      recognition.startListening();
      jarvis.setState("listening");
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;
    tts.stop();
    recognition.stopListening();
    setTextInput("");
    const response = await jarvis.sendMessage(content);
    if (response && voiceEnabled) {
      tts.speak(response, { rate: voiceSpeed, onEnd: () => jarvis.setState("idle") });
    } else if (response) {
      jarvis.setState("idle");
    }
  };

  const onSubmitForm = (e: FormEvent) => {
    e.preventDefault();
    if (textInput.trim()) handleSendMessage(textInput);
  };

  // ── No API key → key entry screen ──────────────────────────────────────
  if (!jarvis.groqKey) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,255,255,0.05)_0%,transparent_70%)]" />
        <Orb state="idle" />
        <div className="mt-12 w-full max-w-sm flex flex-col items-center space-y-6 z-10">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-mono tracking-wider text-primary font-bold">J.A.R.V.I.S.</h1>
            <p className="text-xs tracking-widest text-primary/60 uppercase">Your AI assistant</p>
          </div>

          <div className="w-full space-y-4 bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-2 text-primary">
              <Key className="w-4 h-4" />
              <span className="text-sm font-semibold font-mono">Groq API Key Required</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Free account at{" "}
              <a
                href="https://console.groq.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline inline-flex items-center gap-0.5"
              >
                console.groq.com <ExternalLink className="w-3 h-3" />
              </a>
              . No credit card needed.
            </p>
            <Input
              type="password"
              value={keyDraft}
              onChange={(e) => setKeyDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && keyDraft.trim()) jarvis.saveGroqKey(keyDraft); }}
              placeholder="gsk_..."
              className="bg-background/50 border-white/10 font-mono text-sm h-11"
              data-testid="input-api-key-setup"
              autoFocus
            />
            <Button
              className="w-full h-11 font-mono tracking-wider bg-primary/20 text-primary border border-primary/40 hover:bg-primary/30"
              disabled={!keyDraft.trim()}
              onClick={() => jarvis.saveGroqKey(keyDraft)}
              data-testid="button-activate"
            >
              ACTIVATE JARVIS
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Error state ─────────────────────────────────────────────────────────
  if (jarvis.state === "error") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 rounded-full bg-destructive/10 flex items-center justify-center mb-6 border border-destructive/30">
          <AlertTriangle className="w-10 h-10 text-destructive" />
        </div>
        <h1 className="text-3xl font-mono text-foreground mb-4">SYSTEM_FAILURE</h1>
        <p className="text-muted-foreground max-w-md mb-8 text-sm">{jarvis.errorDetails}</p>
        <Button onClick={jarvis.dismissError} variant="outline" className="font-mono">
          RETRY
        </Button>
      </div>
    );
  }

  // ── Main UI ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,255,255,0.03)_0%,rgba(0,0,0,0.8)_80%)] pointer-events-none" />

      {/* Top Bar */}
      <header className="w-full p-4 flex justify-between items-center z-20">
        <div className="font-mono text-primary/70 tracking-widest text-sm flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          J.A.R.V.I.S. ONLINE
        </div>
        <SettingsPanel
          voiceEnabled={voiceEnabled}
          setVoiceEnabled={setVoiceEnabled}
          voiceSpeed={voiceSpeed}
          setVoiceSpeed={setVoiceSpeed}
          onClear={jarvis.clearHistory}
          groqKey={jarvis.groqKey}
          onGroqKeySave={jarvis.saveGroqKey}
        />
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col z-10 w-full max-w-4xl mx-auto px-4 pb-8">
        <ConversationHistory
          messages={jarvis.messages}
          streamingResponse={jarvis.streamingResponse}
        />

        <div className="flex-none flex flex-col items-center justify-end min-h-[300px] mt-auto">
          {/* Status label */}
          <div className="h-8 mb-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={jarvis.state}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="text-xs font-mono uppercase tracking-widest text-primary/80"
              >
                {jarvis.state === "listening" && "Listening..."}
                {jarvis.state === "thinking" && "Processing..."}
                {jarvis.state === "speaking" && "Responding..."}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Live transcript */}
          <div className="h-12 mb-4 w-full max-w-md text-center">
            {recognition.isListening && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-muted-foreground text-sm truncate px-4"
              >
                "{recognition.transcript || "..."}"
              </motion.p>
            )}
          </div>

          <div className="relative mb-8">
            <Orb state={jarvis.state} />
          </div>

          {/* Controls */}
          <div className="w-full max-w-md flex flex-col items-center gap-6">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleListening}
              data-testid="button-mic"
              className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ${
                jarvis.state === "listening"
                  ? "bg-destructive/20 text-destructive border border-destructive/50 shadow-[0_0_20px_rgba(255,0,0,0.3)]"
                  : "bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 hover:border-primary/50 shadow-[0_0_15px_rgba(0,255,255,0.1)] hover:shadow-[0_0_20px_rgba(0,255,255,0.3)]"
              }`}
            >
              {jarvis.state === "listening" ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </motion.button>
            <p className="text-[10px] font-mono text-muted-foreground/50">PRESS SPACE TO TALK</p>

            <form onSubmit={onSubmitForm} className="w-full relative">
              <Input
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Or type your message..."
                disabled={jarvis.state === "thinking"}
                className="bg-secondary/30 border-white/10 text-foreground placeholder:text-muted-foreground/50 pr-12 focus-visible:ring-primary/50 font-sans rounded-xl h-12"
                data-testid="input-message"
              />
              <Button
                type="submit"
                size="icon"
                disabled={!textInput.trim() || jarvis.state === "thinking"}
                className="absolute right-1 top-1 h-10 w-10 bg-transparent text-primary hover:bg-primary/20"
                data-testid="button-send"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
