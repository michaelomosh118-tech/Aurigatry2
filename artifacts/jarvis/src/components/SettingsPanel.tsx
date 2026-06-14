import { useState } from "react";
import { Settings, Volume2, Trash2, Key, LogOut } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface SettingsPanelProps {
  voiceEnabled: boolean;
  setVoiceEnabled: (v: boolean) => void;
  voiceSpeed: number;
  setVoiceSpeed: (v: number) => void;
  onClear: () => void;
  groqKey: string;
  onGroqKeySave: (key: string) => void;
}

export function SettingsPanel({
  voiceEnabled,
  setVoiceEnabled,
  voiceSpeed,
  setVoiceSpeed,
  onClear,
  groqKey,
  onGroqKeySave,
}: SettingsPanelProps) {
  const [keyInput, setKeyInput] = useState(groqKey);
  const [showKey, setShowKey] = useState(false);

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
          {/* Voice */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Voice Output</Label>
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

          {/* API Key */}
          <div className="space-y-3 bg-secondary/30 p-4 rounded-lg border border-white/5">
            <div className="flex items-center gap-2 text-primary mb-1">
              <Key className="w-4 h-4" />
              <h3 className="text-sm font-semibold">Groq API Key</h3>
            </div>
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
                onClick={() => onGroqKeySave(keyInput)}
                disabled={!keyInput.trim()}
                className="flex-1 h-8 text-xs bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30"
                data-testid="button-save-groq-key"
              >
                Save Key
              </Button>
              {groqKey && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => { setKeyInput(""); onGroqKeySave(""); }}
                  className="h-8 text-xs text-muted-foreground"
                  data-testid="button-clear-groq-key"
                >
                  <LogOut className="w-3 h-3 mr-1" />
                  Sign out
                </Button>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-white/10">
            <Button
              variant="destructive"
              className="w-full bg-destructive/20 text-destructive hover:bg-destructive hover:text-destructive-foreground border border-destructive/50"
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
