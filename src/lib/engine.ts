import type { AppState, Bed, Patient, ResourceKey, Shift, Staff, WardId } from "./types";

export const WARD_SPEC: Record<WardId, string> = {
  general: "General Medicine",
  icu: "Critical Care",
  emergency: "Emergency Medicine",
  maternity: "Obstetrics",
  pediatrics: "Pediatrics",
};

export const RESOURCE_LABEL: Record<ResourceKey, string> = {
  ventilator: "Ventilator",
  oxygen: "Oxygen cylinder",
  ot: "OT room",
};

export function currentShift(d = new Date()): Shift {
  const h = d.getHours();
  if (h >= 6 && h < 14) return "Morning";
  if (h >= 14 && h < 22) return "Evening";
  return "Night";
}

export const isOnDuty = (s: Staff) => s.shift === currentShift();

export function staffLoad(state: AppState, id: string) {
  return state.patients.filter(
    (p) => p.status === "admitted" && (p.doctorId === id || p.nurseId === id),
  ).length;
}

export const isAvailable = (state: AppState, s: Staff) =>
  isOnDuty(s) && staffLoad(state, s.id) < s.maxLoad;

export function itemAvailable(state: AppState, id: string) {
  const it = state.inventory.find((i) => i.id === id);
  return it ? it.total - it.inUse : 0;
}

export function wardOccupancy(state: AppState, wardId: WardId) {
  const beds = state.beds.filter((b) => b.wardId === wardId);
  const occupied = beds.filter((b) => b.status === "occupied").length;
  const cleaning = beds.filter((b) => b.status === "cleaning").length;
  return {
    total: beds.length,
    occupied,
    cleaning,
    free: beds.length - occupied - cleaning,
    pct: beds.length ? Math.round((occupied / beds.length) * 100) : 0,
  };
}

export function wardPreference(p: Pick<Patient, "needs" | "condition" | "age" | "severity">): WardId[] {
  if (p.needs.icu) return ["icu"];
  const c = p.condition.toLowerCase();
  const list: WardId[] = [];
  if (/pregnan|labou?r|deliver|matern|obstet|c-section/.test(c)) list.push("maternity");
  if (p.age < 14) list.push("pediatrics");
  if (p.severity >= 4) list.push("emergency");
  list.push("general", "emergency");
  return Array.from(new Set(list));
}

export function pickStaff(state: AppState, role: Staff["role"], wardId: WardId): Staff | undefined {
  return state.staff
    .filter((s) => s.role === role && isAvailable(state, s))
    .map((s) => ({ s, load: staffLoad(state, s.id), match: s.specialization === WARD_SPEC[wardId] ? 0 : 1 }))
    .sort((a, b) => a.match - b.match || a.load - b.load)[0]?.s;
}

export interface Recommendation {
  ok: boolean;
  bed?: Bed;
  wardId: WardId;
  doctor?: Staff;
  nurse?: Staff;
  issues: string[];
}

export function recommend(state: AppState, p: Patient, forcedBedId?: string): Recommendation {
  const issues: string[] = [];
  const prefs = wardPreference(p);
  let bed: Bed | undefined;
  if (forcedBedId) {
    bed = state.beds.find((b) => b.id === forcedBedId);
    if (!bed || bed.status !== "free") {
      issues.push("Selected bed is not free");
      bed = undefined;
    } else if (p.needs.icu && bed.wardId !== "icu") {
      issues.push("Patient requires an ICU bed");
    }
  } else {
    for (const w of prefs) {
      bed = state.beds.find((b) => b.wardId === w && b.status === "free");
      if (bed) break;
    }
    if (!bed) issues.push(p.needs.icu ? "No free ICU bed" : "No free bed in suitable wards");
  }
  (["ventilator", "oxygen", "ot"] as ResourceKey[]).forEach((r) => {
    if (p.needs[r] && itemAvailable(state, r) <= 0) issues.push(`No ${RESOURCE_LABEL[r].toLowerCase()} available`);
  });
  const wardId = bed?.wardId ?? prefs[0];
  const doctor = pickStaff(state, "doctor", wardId);
  const nurse = pickStaff(state, "nurse", wardId);
  if (!doctor) issues.push("No doctor available on this shift");
  if (!nurse) issues.push("No nurse available on this shift");
  return { ok: issues.length === 0, bed, wardId, doctor, nurse, issues };
}

export interface ScorePart {
  label: string;
  value: number;
}

export function priority(state: AppState, p: Patient, now = Date.now()) {
  const mins = Math.max(0, Math.floor((now - p.createdAt) / 60000));
  const needs =
    (p.needs.icu ? 10 : 0) + (p.needs.ventilator ? 10 : 0) + (p.needs.oxygen ? 5 : 0) + (p.needs.ot ? 5 : 0);
  const parts: ScorePart[] = [
    { label: `Severity ${p.severity}/5 (×15)`, value: p.severity * 15 },
    { label: `Waiting ${mins} min (1 pt / 6 min, max 25)`, value: Math.min(25, Math.floor(mins / 6)) },
    { label: "Resource needs (ICU 10, Vent 10, O₂ 5, OT 5)", value: needs },
    { label: "Resources available now", value: recommend(state, p).ok ? 10 : 0 },
  ];
  if (state.emergency && p.severity >= 4) parts.push({ label: "Emergency mode boost", value: 30 });
  return { total: parts.reduce((a, b) => a + b.value, 0), parts, mins };
}

export function sortedQueue(state: AppState, now = Date.now()) {
  return state.patients
    .filter((p) => p.status === "waiting")
    .map((p) => ({ p, score: priority(state, p, now) }))
    .sort((a, b) => b.score.total - a.score.total);
}

export function getAlerts(state: AppState) {
  const alerts: { level: "critical" | "warning"; text: string }[] = [];
  state.wards.forEach((w) => {
    const o = wardOccupancy(state, w.id);
    if (o.free === 0) alerts.push({ level: "critical", text: `${w.name} has no free beds` });
    else if (o.pct >= 90) alerts.push({ level: "critical", text: `${w.name} ${o.pct}% full` });
    else if (o.pct >= 80) alerts.push({ level: "warning", text: `${w.name} ${o.pct}% full` });
  });
  state.inventory.forEach((i) => {
    const a = i.total - i.inUse;
    if (a <= 0) alerts.push({ level: "critical", text: `${i.name} out of stock` });
    else if (a <= i.threshold) alerts.push({ level: "warning", text: `${i.name} stock low (${a} left)` });
  });
  const crit = state.patients.filter((p) => p.status === "waiting" && p.severity >= 4).length;
  if (crit) alerts.push({ level: "critical", text: `${crit} critical patient${crit > 1 ? "s" : ""} waiting` });
  return alerts.sort((a, b) => (a.level === b.level ? 0 : a.level === "critical" ? -1 : 1));
}

export const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function last7Days(state: AppState) {
  const out = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const k = dayKey(d);
    const s = state.stats.find((x) => x.date === k);
    out.push({
      day: d.toLocaleDateString(undefined, { weekday: "short" }),
      admissions: s?.admissions ?? 0,
      discharges: s?.discharges ?? 0,
    });
  }
  return out;
}
