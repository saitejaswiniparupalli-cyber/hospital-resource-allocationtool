export type WardId = "general" | "icu" | "emergency" | "maternity" | "pediatrics";
export type BedStatus = "free" | "occupied" | "cleaning";
export type ResourceKey = "ventilator" | "oxygen" | "ot";

export interface Ward {
  id: WardId;
  name: string;
}

export interface Bed {
  id: string;
  wardId: WardId;
  label: string;
  status: BedStatus;
  patientId?: string | undefined;
}

export interface Needs {
  icu: boolean;
  ventilator: boolean;
  oxygen: boolean;
  ot: boolean;
}

export interface Patient {
  id: string;
  name: string;
  age: number;
  condition: string;
  severity: number;
  needs: Needs;
  status: "waiting" | "admitted" | "discharged";
  createdAt: number;
  admittedAt?: number;
  dischargedAt?: number;
  bedId?: string;
  doctorId?: string;
  nurseId?: string;
  usedResources: ResourceKey[];
}

export type Shift = "Morning" | "Evening" | "Night";

export interface Staff {
  id: string;
  name: string;
  role: "doctor" | "nurse";
  specialization: string;
  shift: Shift;
  maxLoad: number;
}

export interface Item {
  id: string;
  name: string;
  category: "Equipment" | "Blood" | "Medicine";
  unit: string;
  total: number;
  inUse: number;
  threshold: number;
}

export interface DayStat {
  date: string;
  admissions: number;
  discharges: number;
}

export interface AppState {
  version: number;
  wards: Ward[];
  beds: Bed[];
  patients: Patient[];
  staff: Staff[];
  inventory: Item[];
  stats: DayStat[];
  emergency: boolean;
}
