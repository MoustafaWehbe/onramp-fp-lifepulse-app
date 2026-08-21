import { useEffect, useState } from "react";
import { Sparkles, Plus, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAreas } from "@/hooks/useAreas";
import {
  useAiSuggestions,
  useGenerateAiSuggestions,
  useAcceptAiSuggestion,
  useAcceptAllAiSuggestions,
  useDismissAiSuggestion,
  getAiErrorInfo,
  type AiSuggestion,
} from "@/hooks/useAiSuggestions";
import { areaTokens } from "@/lib/area-colors";
import { AreaDot } from "@/components/area/area-dot";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AiPanel() {
  const { data: areas = [] } = useAreas();
  const { data: suggestions = [], isLoading: suggestionsLoading } = useAiSuggestions();
  const generate = useGenerateAiSuggestions();
  const acceptAll = useAcceptAllAiSuggestions();
  const accept = useAcceptAiSuggestion();
  const dismiss = useDismissAiSuggestion();

  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [notConfigured, setNotConfigured] = useState(false);

  // Ticks the cooldown countdown down to zero once the server tells us how
  // long to wait after a 429, so the button re-enables itself without a reload.
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const interval = setInterval(() => {
      setCooldownSeconds((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownSeconds]);

  const grouped = areas
    .map((area) => ({
      area,
      items: suggestions.filter((s) => s.areaId === area.id),
    }))
    .filter((g) => g.items.length > 0);

  const noAreas = areas.length === 0;
  const hasSuggestions = suggestions.length > 0;
  const isGenerating = generate.isPending;

  const handleGenerate = () => {
    generate.mutate(undefined, {
      onSuccess: () => {
        setNotConfigured(false);
        toast.success("Fresh suggestions are ready");
      },
      onError: (err) => {
        const info = getAiErrorInfo(err);
        if (info.notConfigured) {
          setNotConfigured(true);
          return;
        }
        if (info.retryAfterSeconds) setCooldownSeconds(info.retryAfterSeconds);
        toast.error(info.message);
      },
    });
  };

  const handleAcceptAll = () => {
    acceptAll.mutate(undefined, {
      onSuccess: (accepted) => {
        toast.success(`Added ${accepted.length} habit${accepted.length === 1 ? "" : "s"}`);
      },
      onError: (err) => toast.error(getAiErrorInfo(err).message),
    });
  };

  const handleAccept = (id: string) => {
    accept.mutate(id, {
      onSuccess: () => toast.success("Habit added"),
      onError: (err) => toast.error(getAiErrorInfo(err).message),
    });
  };

  const handleDismiss = (id: string) => {
    dismiss.mutate(id, {
      onError: (err) => toast.error(getAiErrorInfo(err).message),
    });
  };

  return (
    <div className="rounded-2xl bg-foreground p-6 text-background">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "size-1.5 rounded-full",
              areaTokens.spirit.bg,
              isGenerating && "animate-pulse",
            )}
            aria-hidden="true"
          />
          <span className="mono text-[10px] font-medium uppercase tracking-widest text-background/60">
            AI Synthesizer
          </span>
        </div>
        {hasSuggestions && (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={handleAcceptAll}
            disabled={acceptAll.isPending}
          >
            {acceptAll.isPending ? "Adding…" : `Add all (${suggestions.length})`}
          </Button>
        )}
      </div>

      {!hasSuggestions && (
        <div className="mb-4 flex items-start gap-3">
          <Sparkles className={cn("size-5 shrink-0", areaTokens.spirit.text)} aria-hidden="true" />
          <div>
            <h4 className="text-base font-bold">
              {notConfigured ? "AI suggestions aren't available yet" : "Personalized habit ideas"}
            </h4>
            <p className="mt-1 text-sm text-background/70">
              {notConfigured
                ? "This feature needs an OpenAI API key configured on the server."
                : noAreas
                  ? "Create a life area first — then Kultivar can suggest habits tailored to your profile and goals."
                  : "Generate a few tailored habit ideas for each of your life areas, based on your profile, goals, and what you're already tracking."}
            </p>
          </div>
        </div>
      )}

      {!notConfigured && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleGenerate}
          disabled={noAreas || isGenerating || cooldownSeconds > 0}
        >
          {isGenerating && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
          {isGenerating
            ? "Cultivating suggestions…"
            : cooldownSeconds > 0
              ? `Try again in ${Math.ceil(cooldownSeconds / 60)}m`
              : hasSuggestions
                ? "Regenerate"
                : "Generate suggestions"}
        </Button>
      )}

      {hasSuggestions && (
        <div className="mt-4 space-y-4" aria-label="AI habit suggestions">
          {grouped.map(({ area, items }) => (
            <div key={area.id}>
              <div className="mb-1.5 flex items-center gap-2">
                <AreaDot color={area.color} className="size-1.5" />
                <span className="mono text-[10px] uppercase tracking-wider text-background/60">
                  {area.name}
                </span>
              </div>
              <div className="space-y-2">
                {items.map((suggestion) => (
                  <SuggestionRow
                    key={suggestion.id}
                    suggestion={suggestion}
                    onAccept={() => handleAccept(suggestion.id)}
                    onDismiss={() => handleDismiss(suggestion.id)}
                    accepting={accept.isPending && accept.variables === suggestion.id}
                    dismissing={dismiss.isPending && dismiss.variables === suggestion.id}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {!hasSuggestions && !suggestionsLoading && !notConfigured && !noAreas && (
        <p className="mt-3 text-xs text-background/50">
          Suggestions are tailored to your profile, goals, and the areas you&apos;ve created — 3 per
          area, each with a note to help you stick with it.
        </p>
      )}
    </div>
  );
}

function SuggestionRow({
  suggestion,
  onAccept,
  onDismiss,
  accepting,
  dismissing,
}: {
  suggestion: AiSuggestion;
  onAccept: () => void;
  onDismiss: () => void;
  accepting: boolean;
  dismissing: boolean;
}) {
  const busy = accepting || dismissing;
  return (
    <div className="rounded-lg bg-background/5 p-3 ring-1 ring-background/10">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium">{suggestion.suggestedName}</p>
          {suggestion.rationale && (
            <p className="mt-0.5 text-xs italic text-background/60">{suggestion.rationale}</p>
          )}
          {/* Shown here so the note isn't a surprise that only appears after the
              habit has already been added. */}
          {suggestion.notes && (
            <p className="mt-1.5 border-l-2 border-background/20 pl-2 text-xs text-background/50">
              {suggestion.notes}
            </p>
          )}
          <span className="mono mt-1 inline-block text-[10px] uppercase tracking-wider text-background/40">
            {suggestion.frequency}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onAccept}
            disabled={busy}
            aria-label={`Add "${suggestion.suggestedName}"`}
            className="grid size-7 place-items-center rounded-md bg-background/10 text-background transition-colors hover:bg-background/20 disabled:opacity-50"
          >
            <Plus className="size-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onDismiss}
            disabled={busy}
            aria-label={`Dismiss "${suggestion.suggestedName}"`}
            className="grid size-7 place-items-center rounded-md text-background/50 transition-colors hover:bg-background/10 hover:text-background disabled:opacity-50"
          >
            <X className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
