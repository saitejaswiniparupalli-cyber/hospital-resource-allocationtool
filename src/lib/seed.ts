import { dayKey, WARD_SPEC } from "./engine";
import type { AppState, Bed, Item, Patient, ResourceKey, Shift, Staff, Ward, WardId } from "./types";

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST = ["Aarav", "Priya", "Rohan", "Ananya", "Vikram", "Meera", "Arjun", "Kavya", "Rahul", "Sneha", "Karan", "Divya", "Aditya", "Isha", "Nikhil", "Pooja", "Sanjay", "Lakshmi", "Manoj", "Riya", "Farhan", "Neha", "Suresh", "Tara", "Imran", "Asha", "Deepak", "Nisha", "Gautam", "Zara"];
const LAST = ["Sharma", "Reddy", "Iyer", "Patel", "Nair", "Gupta", "Khan", "Menon", "Rao", "Das", "Singh", "Joshi", "Verma", "Pillai", "Bose"];
const CONDITIONS: Record<WardId, string[]> = {
  general: ["Pneumonia", "Dengue fever", "Diabetic ketoacidosis", "Gastroenteritis", "Typhoid", "Hypertension crisis"],
  icu: ["Septic shock", "Acute respiratory failure", "Post-cardiac arrest", "Severe head injury", "Multi-organ failure"],
  emergency: ["Road traffic accident", "Acute MI", "Stroke", "Fracture – femur", "Severe burns", "Anaphylaxis"],
  maternity: ["Labour – full term", "Pregnancy – pre-eclampsia", "Post C-section", "Pregnancy – observation"],
  pediatrics: ["Bronchiolitis", "Child – high fever", "Asthma attack", "Child – dehydration", "Appendicitis"],
};

const WARDS: (Ward & { beds: number; prefix: string })[] = [
  { id: "general", name: "General", beds: 24, prefix: "G" },
  { id: "icu", name: "ICU", beds: 12, prefix: "ICU" },
  { id: "emergency", name: "Emergency", beds: 14, prefix: "ER" },
  { id: "maternity", name: "Maternity", beds: 10, prefix: "M" },
  { id: "pediatrics", name: "Pediatrics", beds: 12, prefix: "P" },
];

export function createSeed(): AppState {
  const r = rng(20261006);
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  const name = () => `${pick(FIRST)} ${pick(LAST)}`;
  const now = Date.now();

  const staff: Staff[] = [];
  const shifts: Shift[] = ["Morning", "Evening", "Night"];
  const specs = Object.values(WARD_SPEC);
  let si = 0;
  shifts.forEach((shift) => {
    specs.forEach((spec) => {
      staff.push({ id: `D${++si}`, name: `Dr. ${name()}`, role: "doctor", specialization: spec, shift, maxLoad: 8 });
    });
    specs.forEach((spec) => {
      staff.push({ id: `N${++si}`, name: name(), role: "nurse", specialization: spec, shift, maxLoad: 6 });
    });
  });

  const beds: Bed[] = [];
  WARDS.forEach((w) => {
    for (let i = 1; i <= w.beds; i++) {
      beds.push({ id: `${w.id}-${i}`, wardId: w.id, label: `${w.prefix}-${String(i).padStart(2, "0")}`, status: "free" });
    }
  });

  const occupancyRate: Record<WardId, number> = { general: 0.7, icu: 0.83, emergency: 0.6, maternity: 0.5, pediatrics: 0.55 };
  const patients: Patient[] = [];
  const used: Record<ResourceKey, number> = { ventilator: 0, oxygen: 0, ot: 0 };
  let pid = 0;

  WARDS.forEach((w) => {
    const wb = beds.filter((b) => b.wardId === w.id);
    const n = Math.round(wb.length * occupancyRate[w.id]);
    for (let i = 0; i < n; i++) {
      const bed = wb[i];
      const isIcu = w.id === "icu";
      const severity = isIcu ? 4 + Math.round(r()) : w.id === "emergency" ? 2 + Math.floor(r() * 3) : 1 + Math.floor(r() * 3);
      const needs = {
        icu: isIcu,
        ventilator: isIcu && r() < 0.5,
        oxygen: isIcu || severity >= 3 ? r() < 0.7 : false,
        ot: false,
      };
      const usedResources: ResourceKey[] = [];
      (["ventilator", "oxygen"] as ResourceKey[]).forEach((k) => {
        if (needs[k]) {
          usedResources.push(k);
          used[k]++;
        }
      });
      const docs = staff.filter((s) => s.role === "doctor" && s.specialization === WARD_SPEC[w.id]);
      const nurses = staff.filter((s) => s.role === "nurse" && s.specialization === WARD_SPEC[w.id]);
      const id = `PT${String(++pid).padStart(4, "0")}`;
      const admittedAt = now - Math.floor(r() * 5 * 86400000);
      patients.push({
        id,
        name: name(),
        age: w.id === "pediatrics" ? 1 + Math.floor(r() * 12) : 18 + Math.floor(r() * 65),
        condition: pick(CONDITIONS[w.id]),
        severity,
        needs,
        status: "admitted",
        createdAt: admittedAt - 3600000,
        admittedAt,
        bedId: bed.id,
        doctorId: docs[i % docs.length].id,
        nurseId: nurses[i % nurses.length].id,
        usedResources,
      });
      bed.status = "occupied";
      bed.patientId = id;
    }
    // a couple of beds in cleaning
    const freeOnes = wb.filter((b) => b.status === "free");
    if (freeOnes[freeOnes.length - 1]) freeOnes[freeOnes.length - 1].status = "cleaning";
  });

  const waiting: Omit<Patient, "id" | "status" | "usedResources">[] = [
    { name: name(), age: 67, condition: "Acute respiratory distress", severity: 5, needs: { icu: true, ventilator: true, oxygen: true, ot: false }, createdAt: now - 42 * 60000 },
    { name: name(), age: 34, condition: "Fracture – tibia", severity: 3, needs: { icu: false, ventilator: false, oxygen: false, ot: true }, createdAt: now - 95 * 60000 },
    { name: name(), age: 8, condition: "Child – high fever", severity: 2, needs: { icu: false, ventilator: false, oxygen: false, ot: false }, createdAt: now - 120 * 60000 },
    { name: name(), age: 29, condition: "Labour – full term", severity: 3, needs: { icu: false, ventilator: false, oxygen: false, ot: false }, createdAt: now - 25 * 60000 },
    { name: name(), age: 55, condition: "Chest pain – suspected MI", severity: 4, needs: { icu: false, ventilator: false, oxygen: true, ot: false }, createdAt: now - 15 * 60000 },
  ];
  waiting.forEach((w) =>
    patients.push({ ...w, id: `PT${String(++pid).padStart(4, "0")}`, status: "waiting", usedResources: [] }),
  );

  const inventory: Item[] = [
    { id: "ventilator", name: "Ventilators", category: "Equipment", unit: "units", total: 14, inUse: used.ventilator, threshold: 3 },
    { id: "oxygen", name: "Oxygen cylinders", category: "Equipment", unit: "cylinders", total: Math.max(used.oxygen + 4, 18), inUse: used.oxygen, threshold: 5 },
    { id: "ot", name: "OT rooms", category: "Equipment", unit: "rooms", total: 4, inUse: 1, threshold: 1 },
    { id: "blood-o-neg", name: "Blood O−", category: "Blood", unit: "units", total: 12, inUse: 9, threshold: 4 },
    { id: "blood-o-pos", name: "Blood O+", category: "Blood", unit: "units", total: 30, inUse: 12, threshold: 8 },
    { id: "blood-a-pos", name: "Blood A+", category: "Blood", unit: "units", total: 24, inUse: 10, threshold: 6 },
    { id: "blood-b-pos", name: "Blood B+", category: "Blood", unit: "units", total: 22, inUse: 8, threshold: 6 },
    { id: "med-adrenaline", name: "Adrenaline 1mg", category: "Medicine", unit: "ampoules", total: 60, inUse: 18, threshold: 15 },
    { id: "med-ceftriaxone", name: "Ceftriaxone 1g", category: "Medicine", unit: "vials", total: 120, inUse: 70, threshold: 30 },
    { id: "med-insulin", name: "Insulin (regular)", category: "Medicine", unit: "vials", total: 40, inUse: 31, threshold: 10 },
    { id: "med-paracetamol", name: "Paracetamol IV", category: "Medicine", unit: "bottles", total: 200, inUse: 85, threshold: 40 },
  ];
  // OT room in use by seeded surgery patient
  const surg = patients.find((p) => p.status === "admitted" && p.bedId?.startsWith("emergency"));
  if (surg) {
    surg.needs.ot = true;
    surg.usedResources.push("ot");
  } else inventory[2].inUse = 0;

  const stats = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    stats.push({ date: dayKey(d), admissions: i === 0 ? 3 : 8 + Math.floor(r() * 10), discharges: i === 0 ? 2 : 6 + Math.floor(r() * 10) });
  }

  return {
    version: 1,
    wards: WARDS.map(({ id, name }) => ({ id, name })),
    beds,
    patients,
    staff,
    inventory,
    stats,
    emergency: false,
  };
}
