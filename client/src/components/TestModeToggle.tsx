import { useTestMode } from "@/hooks/useTestMode";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AlertCircle } from "lucide-react";

export function TestModeToggle() {
  const { testMode, toggleTestMode, canUseLiveMode, isActivated } = useTestMode();
  const disabled = !testMode && !canUseLiveMode;

  const toggleComponent = (
    <div className="flex items-center gap-1.5">
      <Switch
        id="test-mode"
        checked={testMode}
        onCheckedChange={toggleTestMode}
        data-testid="test-mode-toggle"
        disabled={disabled}
        className="scale-90"
      />
      <Label htmlFor="test-mode" className={`cursor-pointer ${disabled ? "cursor-not-allowed opacity-50" : ""}`}>
        <Badge variant="outline" className={`text-[10px] h-5 px-1.5 font-medium border-border/30 rounded-md ${testMode ? "text-muted-foreground bg-muted/20" : "text-foreground bg-primary/10"}`}>
          {testMode ? "Test" : "Live"}
        </Badge>
      </Label>
    </div>
  );

  if (disabled && isActivated === false) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2">
              {toggleComponent}
              <AlertCircle className="w-4 h-4 text-warning" />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Complete business activation to use live mode</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return toggleComponent;
}

