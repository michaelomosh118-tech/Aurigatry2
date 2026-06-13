import { Settings, Volume2, Trash2, Cpu } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface SettingsPanelProps {
  voiceEnabled: boolean;
  setVoiceEnabled: (v: boolean) => void;
  voiceSpeed: number;
  setVoiceSpeed: (v: number) => void;
  onClear: () => void;
  modelId: string;
}

export function SettingsPanel({
  voiceEnabled,
  setVoiceEnabled,
  voiceSpeed,
  setVoiceSpeed,
  onClear,
  modelId
}: SettingsPanelProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="absolute top-4 right-4 text-muted-foreground hover:text-primary hover:bg-primary/10">
          <Settings className="w-5 h-5" />
        </Button>
      </SheetTrigger>
      <SheetContent className="bg-card border-l-border w-80 sm:max-w-md backdrop-blur-xl">
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
              <Switch checked={voiceEnabled} onCheckedChange={setVoiceEnabled} />
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
              <span className="font-mono text-foreground">{modelId.replace("-MLC", "")}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Hardware</span>
              <span className="font-mono text-green-400">WebGPU Native</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Network</span>
              <span className="font-mono text-green-400">Offline</span>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-white/10">
            <Button 
              variant="destructive" 
              className="w-full bg-destructive/20 text-destructive hover:bg-destructive hover:text-destructive-foreground border border-destructive/50 transition-colors"
              onClick={onClear}
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
