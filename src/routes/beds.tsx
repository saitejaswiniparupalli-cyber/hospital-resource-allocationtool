import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NeedsTags, PageHeader, SeverityBadge } from "@/components/common";
import { recommend, sortedQueue, wardOccupancy } from "@/lib/engine";
import { useStore } from "@/lib/store";
import type { BedStatus, WardId } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/beds")({
  head: () => ({
    meta: [
      { title: "Beds & Wards — MediFlow" },
      { name: "description", content: "Color-coded bed grid for General, ICU, Emergency, Maternity and Pediatrics wards." },
      { property: "og:title", content: "Beds & Wards — MediFlow" },
      { property: "og:description", content: "Assign, discharge and clean beds across every ward." },
    ],
  }),
  component: BedsPage,
});

const statusCls: Record<BedStatus, string> = {
  free: "bg-free/15 border-free text-foreground hover:bg-free/25",
  occupied: "bg-occupied/15 border-occupied text-foreground hover:bg-occupied/25",
  cleaning: "bg-cleaning/20 border-cleaning text-foreground hover:bg-cleaning/30",
};

function BedsPage() {
  const { state, approve, discharge, setBedStatus } = useStore();
  const [filter, setFilter] = useState<WardId | "all">("all");
  const [bedId, setBedId] = useState<string | null>(null);
  const [assignId, setAssignId] = useState<string>("");

  const bed = state.beds.find((b) => b.id === bedId);
  const patient = bed?.patientId ? state.patients.find((p) => p.id === bed.patientId) : undefined;
  const queue = sortedQueue(state);
  const assignPatient = state.patients.find((p) => p.id === assignId);
  const assignRec = assignPatient && bed ? recommend(state, assignPatient, bed.id) : null;
  const doctor = patient && state.staff.find((s) => s.id === patient.doctorId);
  const nurse = patient && state.staff.find((s) => s.id === patient.nurseId);

  const close = () => {
    setBedId(null);
    setAssignId("");
  };

  return (
    <div>
      <PageHeader
        title="Beds & Wards"
        subtitle="Click any bed to assign, discharge or update cleaning status"
        actions={
          <div className="flex flex-wrap items-center gap-3 text-xs">
            {(["free", "occupied", "cleaning"] as BedStatus[]).map((s) => (
              <span key={s} className="flex items-center gap-1.5 capitalize">
                <span className={cn("h-3 w-3 rounded border", statusCls[s])} /> {s}
              </span>
            ))}
          </div>
        }
      />
      <div className="mb-4 flex flex-wrap gap-2">
        {[{ id: "all", name: "All wards" }, ...state.wards].map((w) => (
          <Button key={w.id} size="sm" variant={filter === w.id ? "default" : "outline"} onClick={() => setFilter(w.id as WardId | "all")}>
            {w.name}
          </Button>
        ))}
      </div>

      <div className="space-y-4">
        {state.wards
          .filter((w) => filter === "all" || w.id === filter)
          .map((w) => {
            const o = wardOccupancy(state, w.id);
            return (
              <Card key={w.id}>
                <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 pb-3">
                  <CardTitle className="text-base">{w.name}</CardTitle>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{o.free} free</span>
                    <span>{o.occupied} occupied</span>
                    <span>{o.cleaning} cleaning</span>
                    <span className={cn("font-semibold", o.pct >= 90 ? "text-destructive" : "text-foreground")}>{o.pct}%</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8 xl:grid-cols-12">
                    {state.beds
                      .filter((b) => b.wardId === w.id)
                      .map((b) => {
                        const p = b.patientId ? state.patients.find((x) => x.id === b.patientId) : undefined;
                        return (
                          <button
                            key={b.id}
                            onClick={() => setBedId(b.id)}
                            className={cn(
                              "rounded-lg border-2 p-2 text-left transition-colors",
                              statusCls[b.status],
                              state.emergency && w.id === "icu" && b.status === "free" && "emergency-glow",
                            )}
                          >
                            <div className="text-xs font-semibold">{b.label}</div>
                            <div className="truncate text-[10px] text-muted-foreground">
                              {p ? p.name.split(" ")[0] : b.status === "cleaning" ? "Cleaning" : "Free"}
                            </div>
                          </button>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
      </div>

      <Dialog open={!!bed} onOpenChange={(o) => !o && close()}>
        <DialogContent>
          {bed && (
            <>
              <DialogHeader>
                <DialogTitle>
                  Bed {bed.label} · {state.wards.find((w) => w.id === bed.wardId)?.name}
                </DialogTitle>
                <DialogDescription className="capitalize">Status: {bed.status}</DialogDescription>
              </DialogHeader>

              {bed.status === "occupied" && patient && (
                <div className="space-y-3">
                  <div className="rounded-lg border p-3 text-sm">
                    <div className="flex items-center gap-2 font-semibold">{patient.name} <SeverityBadge level={patient.severity} /></div>
                    <div className="text-muted-foreground">{patient.age}y · {patient.condition}</div>
                    <div className="mt-2"><NeedsTags needs={patient.needs} /></div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      {doctor?.name} · Nurse {nurse?.name}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">This bed is occupied and cannot be assigned.</p>
                  <Button variant="destructive" className="w-full" onClick={() => { discharge(patient.id); close(); }}>
                    Discharge patient
                  </Button>
                </div>
              )}

              {bed.status === "free" && (
                <div className="space-y-3">
                  <div className="text-sm font-medium">Assign a waiting patient</div>
                  {queue.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No patients waiting in the queue.</p>
                  ) : (
                    <Select value={assignId} onValueChange={setAssignId}>
                      <SelectTrigger><SelectValue placeholder="Select patient (sorted by priority)" /></SelectTrigger>
                      <SelectContent>
                        {queue.map(({ p, score }) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name} · S{p.severity} · score {score.total}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {assignRec && !assignRec.ok && (
                    <p className="text-sm text-destructive">{assignRec.issues.join(" · ")}</p>
                  )}
                  {assignRec?.ok && (
                    <p className="text-xs text-muted-foreground">
                      Will assign {assignRec.doctor?.name} and Nurse {assignRec.nurse?.name}.
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Button className="flex-1" disabled={!assignRec?.ok} onClick={() => { if (approve(assignId, bed.id)) close(); }}>
                      Assign patient
                    </Button>
                    <Button variant="outline" onClick={() => { setBedStatus(bed.id, "cleaning"); close(); }}>
                      Mark for cleaning
                    </Button>
                  </div>
                </div>
              )}

              {bed.status === "cleaning" && (
                <Button className="w-full" onClick={() => { setBedStatus(bed.id, "free"); close(); }}>
                  Cleaning done — mark available
                </Button>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
