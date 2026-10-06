import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { BrainCircuit, ListOrdered } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState, NeedsTags, PageHeader, SeverityBadge } from "@/components/common";
import { AllocationPanel } from "@/components/AllocationPanel";
import { sortedQueue } from "@/lib/engine";
import { useNow, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/allocation")({
  head: () => ({
    meta: [
      { title: "Smart Allocation — MediFlow" },
      { name: "description", content: "Priority-scored waiting queue with transparent bed, ward and doctor recommendations." },
      { property: "og:title", content: "Smart Allocation — MediFlow" },
      { property: "og:description", content: "Transparent priority scoring and one-click allocation approval." },
    ],
  }),
  component: AllocationPage,
});

function AllocationPage() {
  const { state } = useStore();
  const now = useNow(15000);
  const queue = sortedQueue(state, now);
  const [sel, setSel] = useState<string | null>(null);
  const selected = queue.find((q) => q.p.id === sel)?.p.id ?? queue[0]?.p.id;

  return (
    <div>
      <PageHeader
        title="Smart Allocation Engine"
        subtitle="Score = severity ×15 + waiting time + resource needs + availability (+30 for S4–5 in emergency mode)"
      />
      {queue.length === 0 ? (
        <EmptyState
          icon={<ListOrdered className="h-8 w-8" />}
          title="The waiting queue is empty"
          text="Admit a patient on the Patients page to get a recommendation."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(280px,380px)_1fr]">
          <Card className="h-fit">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base"><ListOrdered className="h-4 w-4" /> Priority queue ({queue.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {queue.map(({ p, score }, i) => (
                <button
                  key={p.id}
                  onClick={() => setSel(p.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted",
                    selected === p.id && "border-primary bg-primary/5",
                    state.emergency && p.severity >= 4 && "border-destructive",
                  )}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">{p.name}</span>
                      <SeverityBadge level={p.severity} />
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{score.mins} min</span>
                      <NeedsTags needs={p.needs} />
                    </div>
                  </div>
                  <span className="font-display text-lg font-semibold text-primary">{score.total}</span>
                </button>
              ))}
            </CardContent>
          </Card>
          <Card className="h-fit">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base"><BrainCircuit className="h-4 w-4 text-teal" /> Recommendation</CardTitle>
            </CardHeader>
            <CardContent>
              {selected && <AllocationPanel key={selected} patientId={selected} onDone={() => setSel(null)} />}
            </CardContent>
          </Card>
        </div>
      )}
      <div className="mt-4">
        <Button asChild variant="outline"><Link to="/patients">Admit a new patient</Link></Button>
      </div>
    </div>
  );
}
