import { AlertTriangle, BedDouble, CheckCircle2, Stethoscope, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { priority, recommend, staffLoad } from "@/lib/engine";
import { useNow, useStore } from "@/lib/store";
import { NeedsTags, SeverityBadge } from "./common";

export function AllocationPanel({ patientId, onDone }: { patientId: string; onDone?: () => void }) {
  const { state, approve } = useStore();
  const now = useNow();
  const p = state.patients.find((x) => x.id === patientId);
  if (!p) return null;
  if (p.status !== "waiting") {
    return <div className="rounded-lg border p-4 text-sm text-muted-foreground">This patient is already {p.status}.</div>;
  }
  const rec = recommend(state, p);
  const score = priority(state, p, now);
  const ward = state.wards.find((w) => w.id === rec.wardId);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-display text-lg font-semibold">{p.name}</span>
        <SeverityBadge level={p.severity} />
        <span className="text-sm text-muted-foreground">
          {p.age}y · {p.condition}
        </span>
        <NeedsTags needs={p.needs} />
      </div>

      <div className="rounded-lg border bg-muted/40 p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium">Priority score breakdown</span>
          <span className="font-display text-2xl font-bold text-primary">{score.total}</span>
        </div>
        <ul className="space-y-1.5 text-sm">
          {score.parts.map((pt) => (
            <li key={pt.label} className="flex justify-between gap-4">
              <span className="text-muted-foreground">{pt.label}</span>
              <span className="font-mono font-medium">+{pt.value}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border p-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><BedDouble className="h-3.5 w-3.5" /> Ward & bed</div>
          <div className="mt-1 font-semibold">{ward?.name}</div>
          <div className="text-sm">{rec.bed ? rec.bed.label : <span className="text-destructive">No bed</span>}</div>
        </div>
        <div className="rounded-lg border p-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Stethoscope className="h-3.5 w-3.5" /> Doctor (least loaded)</div>
          {rec.doctor ? (
            <>
              <div className="mt-1 font-semibold">{rec.doctor.name}</div>
              <div className="text-xs text-muted-foreground">{rec.doctor.specialization} · load {staffLoad(state, rec.doctor.id)}/{rec.doctor.maxLoad}</div>
            </>
          ) : <div className="mt-1 text-sm text-destructive">None available</div>}
        </div>
        <div className="rounded-lg border p-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><UserRound className="h-3.5 w-3.5" /> Nurse (least loaded)</div>
          {rec.nurse ? (
            <>
              <div className="mt-1 font-semibold">{rec.nurse.name}</div>
              <div className="text-xs text-muted-foreground">{rec.nurse.specialization} · load {staffLoad(state, rec.nurse.id)}/{rec.nurse.maxLoad}</div>
            </>
          ) : <div className="mt-1 text-sm text-destructive">None available</div>}
        </div>
      </div>

      {rec.issues.length > 0 && (
        <div className="flex gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>{rec.issues.join(" · ")}</div>
        </div>
      )}

      <Button
        className="w-full"
        disabled={!rec.ok}
        onClick={() => {
          if (approve(p.id)) onDone?.();
        }}
      >
        <CheckCircle2 className="h-4 w-4" /> Approve allocation
      </Button>
    </div>
  );
}
