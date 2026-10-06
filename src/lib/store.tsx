import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { dayKey, recommend, RESOURCE_LABEL } from "./engine";
import { createSeed } from "./seed";
import type { AppState, BedStatus, Needs, Patient, ResourceKey } from "./types";

const KEY = "mediflow-state-v1";

export interface AdmitInput {
  name: string;
  age: number;
  condition: string;
  severity: number;
  needs: Needs;
}

interface Ctx {
  state: AppState;
  admit: (i: AdmitInput) => Patient;
  approve: (patientId: string, bedId?: string) => boolean;
  discharge: (patientId: string) => void;
  setBedStatus: (bedId: string, status: Exclude<BedStatus, "occupied">) => void;
  restock: (itemId: string, qty: number) => boolean;
  toggleEmergency: () => void;
  reset: () => void;
}

const StoreCtx = createContext<Ctx | null>(null);

function bumpStat(s: AppState, field: "admissions" | "discharges") {
  const k = dayKey(new Date());
  const exists = s.stats.some((x) => x.date === k);
  const stats = exists
    ? s.stats.map((x) => (x.date === k ? { ...x, [field]: x[field] + 1 } : x))
    : [...s.stats, { date: k, admissions: 0, discharges: 0, [field]: 1 }];
  return stats.slice(-30);
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState | null>(null);
  const ref = useRef<AppState | null>(null);

  useEffect(() => {
    let s: AppState | null = null;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) s = JSON.parse(raw);
    } catch {
      s = null;
    }
    if (!s || s.version !== 1) s = createSeed();
    ref.current = s;
    setState(s);
  }, []);

  useEffect(() => {
    if (state) localStorage.setItem(KEY, JSON.stringify(state));
  }, [state]);

  const commit = useCallback((next: AppState) => {
    ref.current = next;
    setState(next);
  }, []);

  const admit = useCallback(
    (i: AdmitInput) => {
      const s = ref.current!;
      const max = s.patients.reduce((m, p) => Math.max(m, parseInt(p.id.slice(2)) || 0), 0);
      const p: Patient = {
        id: `PT${String(max + 1).padStart(4, "0")}`,
        ...i,
        status: "waiting",
        createdAt: Date.now(),
        usedResources: [],
      };
      commit({ ...s, patients: [...s.patients, p] });
      toast.success(`${p.name} added to the waiting queue`);
      return p;
    },
    [commit],
  );

  const approve = useCallback(
    (patientId: string, bedId?: string) => {
      const s = ref.current!;
      const p = s.patients.find((x) => x.id === patientId);
      if (!p || p.status !== "waiting") {
        toast.error("Patient is not waiting for allocation");
        return false;
      }
      const rec = recommend(s, p, bedId);
      if (!rec.ok || !rec.bed || !rec.doctor || !rec.nurse) {
        toast.error("Cannot allocate", { description: rec.issues.join(" · ") });
        return false;
      }
      const used = (["ventilator", "oxygen", "ot"] as ResourceKey[]).filter((r) => p.needs[r]);
      const bed = rec.bed;
      commit({
        ...s,
        beds: s.beds.map((b) => (b.id === bed.id ? { ...b, status: "occupied", patientId: p.id } : b)),
        inventory: s.inventory.map((it) =>
          used.includes(it.id as ResourceKey) ? { ...it, inUse: Math.min(it.total, it.inUse + 1) } : it,
        ),
        patients: s.patients.map((x) =>
          x.id === p.id
            ? { ...x, status: "admitted", admittedAt: Date.now(), bedId: bed.id, doctorId: rec.doctor!.id, nurseId: rec.nurse!.id, usedResources: used }
            : x,
        ),
        stats: bumpStat(s, "admissions"),
      });
      toast.success(`${p.name} allocated to ${bed.label}`, {
        description: `${rec.doctor.name} · Nurse ${rec.nurse.name}${used.length ? ` · ${used.map((u) => RESOURCE_LABEL[u]).join(", ")}` : ""}`,
      });
      return true;
    },
    [commit],
  );

  const discharge = useCallback(
    (patientId: string) => {
      const s = ref.current!;
      const p = s.patients.find((x) => x.id === patientId);
      if (!p || p.status === "discharged") return;
      const wasAdmitted = p.status === "admitted";
      commit({
        ...s,
        beds: s.beds.map((b) => (b.patientId === p.id ? { ...b, status: "free", patientId: undefined } : b)),
        inventory: s.inventory.map((it) =>
          p.usedResources.includes(it.id as ResourceKey) ? { ...it, inUse: Math.max(0, it.inUse - 1) } : it,
        ),
        patients: s.patients.map((x) =>
          x.id === p.id ? { ...x, status: "discharged", dischargedAt: Date.now(), usedResources: [] } : x,
        ),
        stats: wasAdmitted ? bumpStat(s, "discharges") : s.stats,
      });
      toast.success(wasAdmitted ? `${p.name} discharged — bed and resources released` : `${p.name} removed from queue`);
    },
    [commit],
  );

  const setBedStatus = useCallback(
    (bedId: string, status: Exclude<BedStatus, "occupied">) => {
      const s = ref.current!;
      const bed = s.beds.find((b) => b.id === bedId);
      if (!bed) return;
      if (bed.status === "occupied") {
        toast.error("Bed is occupied — discharge the patient first");
        return;
      }
      commit({ ...s, beds: s.beds.map((b) => (b.id === bedId ? { ...b, status } : b)) });
      toast.success(status === "cleaning" ? `${bed.label} marked for cleaning` : `${bed.label} is now available`);
    },
    [commit],
  );

  const restock = useCallback(
    (itemId: string, qty: number) => {
      const s = ref.current!;
      const it = s.inventory.find((i) => i.id === itemId);
      if (!it || !Number.isInteger(qty) || qty <= 0) {
        toast.error("Enter a whole number greater than 0");
        return false;
      }
      commit({ ...s, inventory: s.inventory.map((i) => (i.id === itemId ? { ...i, total: i.total + qty } : i)) });
      toast.success(`Restocked ${it.name} (+${qty} ${it.unit})`);
      return true;
    },
    [commit],
  );

  const toggleEmergency = useCallback(() => {
    const s = ref.current!;
    commit({ ...s, emergency: !s.emergency });
    if (s.emergency) toast("Emergency mode deactivated");
    else toast.error("Emergency mode activated", { description: "Critical patients prioritized" });
  }, [commit]);

  const reset = useCallback(() => {
    commit(createSeed());
    toast.success("Demo data reset");
  }, [commit]);

  const value = useMemo(
    () => (state ? { state, admit, approve, discharge, setBedStatus, restock, toggleEmergency, reset } : null),
    [state, admit, approve, discharge, setBedStatus, restock, toggleEmergency, reset],
  );

  if (!value) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">Loading MediFlow…</div>
    );
  }
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const c = useContext(StoreCtx);
  if (!c) throw new Error("useStore outside provider");
  return c;
}

export function useNow(intervalMs = 30000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}
