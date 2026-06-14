import { useState } from "react";
import { Settings, Volume2, Trash2, Cpu, Cloud, Wifi, WifiOff } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { BackendType } from "@/hooks/useJarvis";

interface SettingsPanelProps {
  voiceEnabled: boolean;
  setVoiceEnabled: (v: boolean) => void;
  voiceSpeed: number;
  setVoiceSpeed: (v: number) => void;
  onClear: () => void;
  modelId: string;
  backend: BackendType;
  groqKey: string;
  onGroqKeySave: (key: string) => void;
  onSwitchToOffline: () => void;
}

export function SettingsPanel({
  voiceEnabled,
  setVoiceEnabled,
  voiceSpeed,
  setVoiceSpeed,
  onClear,
  modelId,
  backend,
  groqKey,
  onGroqKeySave,
  onSwitchToOffline,
}: SettingsPanelProps) {
  const [keyInput, setKeyInput] = useState(groqKey);
  const [showKey, setShowKey] = useState(false);

  const handleSaveKey = () => {
    const trimmed = keyInput.trim();
    if (trimmed) onGroqKeySave(trimmed);
  };

  const handleClearKey = () => {
    setKeyInput("");
    onSwitchToOffline();
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 text-muted-foreground hover:text-primary hover:bg-primary/10"
          data-testid="button-settings"
        >
          <Settings className="w-5 h-5" />
        </Button>
      </SheetTrigger>
      <SheetContent className="bg-card border-l-border w-80 sm:max-w-md backdrop-blur-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-primary font-mono tracking-widest text-lg border-b border-white/10 pb-4 mb-6">
            SYSTEM_SETTINGS
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-8 mt-4">
          {/* Voice Output */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-muted-foreground" />
                <Label className="text-sm font-medium text-foreground">Voice Output</Label>
              </div>
              <Switch
                checked={voiceEnabled}
                onCheckedChange={setVoiceEnabled}
                data-testid="switch-voice-enabled"
              />
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex justify-between">
                <Label className="text-xs text-muted-foreground">Speech Rate</Label>
                <span className="text-xs font-mono text-primary">{voiceSpeed.toFixed(1)}x</span>
              </div>
              <Slider
                value={[voiceSpeed]}
                min={0.5}
                max={2}
                step={0.1}
                disabled={!voiceEnabled}
                onValueChange={([val]) => setVoiceSpeed(val)}
                className="[&>[role=slider]]:bg-primary"
                data-testid="slider-voice-speed"
              />
            </div>
          </div>

          {/* Engine Info */}
          <div className="space-y-3 bg-secondary/30 p-4 rounded-lg border border-white/5">
            <div className="flex items-center gap-2 text-primary mb-2">
              <Cpu className="w-4 h-4" />
              <h3 className="text-sm font-semibold">Engine Status</h3>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Model</span>
              <span className="font-mono text-foreground text-right max-w-[160px] truncate">
                {modelId.replace("-MLC", "") || "—"}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Mode</span>
              <span className={`font-mono flex items-center gap-1 ${backend === "groq" ? "text-blue-400" : "text-green-400"}`}>
                {backend === "groq" ? (
                  <><Cloud className="w-3 h-3" /> Groq Cloud</>
                ) : backend === "webgpu" ? (
                  <><WifiOff className="w-3 h-3" /> Offline / WebGPU</>
                ) : (
                  <><Wifi className="w-3 h-3" /> Initializing</>
                )}
              </span>
            </div>
          </div>

          {/* Groq API Key */}
          <div className="space-y-3 bg-secondary/30 p-4 rounded-lg border border-white/5">
            <div className="flex items-center gap-2 text-blue-400 mb-1">
              <Cloud className="w-4 h-4" />
              <h3 className="text-sm font-semibold">Groq Cloud Mode</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Free API key at{" "}
              <a
                href="https://console.groq.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 underline"
              >
                console.groq.com
              </a>
              . Instant responses, no download needed.
            </p>
            <div className="flex gap-2">
              <Input
                type={showKey ? "text" : "password"}
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="gsk_..."
                className="bg-background/50 border-white/10 text-xs font-mono h-8 flex-1"
                data-testid="input-groq-key"
              />
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-muted-foreground px-2"
                onClick={() => setShowKey((v) => !v)}
                data-testid="button-toggle-key-visibility"
              >
                {showKey ? "Hide" : "Show"}
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSaveKey}
                disabled={!keyInput.trim()}
                className="flex-1 h-8 text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30"
                data-testid="button-save-groq-key"
              >
                Use Groq
              </Button>
              {groqKey && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleClearKey}
                  className="h-8 text-xs text-muted-foreground"
                  data-testid="button-clear-groq-key"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-white/10">
            <Button
              variant="destructive"
              className="w-full bg-destructive/20 text-destructive hover:bg-destructive hover:text-destructive-foreground border border-destructive/50 transition-colors"
              onClick={onClear}
              data-testid="button-clear-history"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Purge Memory
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
