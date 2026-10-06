import { useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Search, UserPlus, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState, NeedsTags, PageHeader, SeverityBadge } from "@/components/common";
import { AllocationPanel } from "@/components/AllocationPanel";
import { useStore } from "@/lib/store";
import type { Needs } from "@/lib/types";

export const Route = createFileRoute("/patients")({
  head: () => ({
    meta: [
      { title: "Patients — MediFlow" },
      { name: "description", content: "Admit patients, search and filter the patient list, and discharge to free resources." },
      { property: "og:title", content: "Patients — MediFlow" },
      { property: "og:description", content: "Admission form and searchable patient registry." },
    ],
  }),
  component: PatientsPage,
});

const emptyNeeds: Needs = { icu: false, ventilator: false, oxygen: false, ot: false };

function PatientsPage() {
  const { state, admit, discharge } = useStore();
  const [form, setForm] = useState({ name: "", age: "", condition: "", severity: "3" });
  const [needs, setNeeds] = useState<Needs>(emptyNeeds);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [allocId, setAllocId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [sev, setSev] = useState("all");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const err: Record<string, string> = {};
    const name = form.name.trim();
    const age = Number(form.age);
    if (name.length < 2) err.name = "Enter the patient's full name";
    if (form.age === "" || !Number.isInteger(age) || age < 0 || age > 120) err.age = "Age must be 0–120";
    if (form.condition.trim().length < 2) err.condition = "Describe the condition";
    setErrors(err);
    if (Object.keys(err).length) return;
    const p = admit({ name, age, condition: form.condition.trim(), severity: Number(form.severity), needs });
    setForm({ name: "", age: "", condition: "", severity: "3" });
    setNeeds(emptyNeeds);
    setAllocId(p.id);
  };

  const list = state.patients
    .filter((p) => (status === "all" ? true : p.status === status))
    .filter((p) => (sev === "all" ? true : p.severity === Number(sev)))
    .filter((p) => {
      const s = q.toLowerCase();
      return !s || p.name.toLowerCase().includes(s) || p.condition.toLowerCase().includes(s) || p.id.toLowerCase().includes(s);
    })
    .sort((a, b) => (b.admittedAt ?? b.createdAt) - (a.admittedAt ?? a.createdAt));

  const bedLabel = (id?: string) => state.beds.find((b) => b.id === id)?.label ?? "—";

  return (
    <div>
      <PageHeader title="Patients" subtitle="Admit new patients and manage the patient registry" />
      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <Card className="h-fit">
          <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><UserPlus className="h-4 w-4" /> Admit patient</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-3" noValidate>
              <div>
                <Label htmlFor="name">Full name</Label>
                <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="age">Age</Label>
                  <Input id="age" type="number" min={0} max={120} value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} />
                  {errors.age && <p className="mt-1 text-xs text-destructive">{errors.age}</p>}
                </div>
                <div>
                  <Label>Severity (1–5)</Label>
                  <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["1", "2", "3", "4", "5"].map((s) => (
                        <SelectItem key={s} value={s}>{s} {s === "5" ? "– Critical" : s === "1" ? "– Minor" : ""}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="cond">Condition</Label>
                <Input id="cond" placeholder="e.g. Pneumonia, Labour – full term" value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })} />
                {errors.condition && <p className="mt-1 text-xs text-destructive">{errors.condition}</p>}
              </div>
              <div>
                <Label>Resources needed</Label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {([["icu", "ICU bed"], ["ventilator", "Ventilator"], ["oxygen", "Oxygen"], ["ot", "OT"]] as [keyof Needs, string][]).map(([k, l]) => (
                    <label key={k} className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm">
                      <Checkbox checked={needs[k]} onCheckedChange={(c) => setNeeds({ ...needs, [k]: c === true })} /> {l}
                    </label>
                  ))}
                </div>
              </div>
              <Button type="submit" className="w-full">Admit & get recommendation</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="gap-3 pb-3">
            <div className="flex flex-wrap gap-2">
              <div className="relative min-w-48 flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input className="pl-8" placeholder="Search name, condition or ID" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="waiting">Waiting</SelectItem>
                  <SelectItem value="admitted">Admitted</SelectItem>
                  <SelectItem value="discharged">Discharged</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sev} onValueChange={setSev}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All severities</SelectItem>
                  {[5, 4, 3, 2, 1].map((s) => <SelectItem key={s} value={String(s)}>Severity {s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="text-xs text-muted-foreground">{list.length} patient(s)</div>
          </CardHeader>
          <CardContent>
            {list.length === 0 ? (
              <EmptyState icon={<Users className="h-8 w-8" />} title="No patients match" text="Try a different search or filter." />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Patient</TableHead>
                      <TableHead>Sev.</TableHead>
                      <TableHead>Needs</TableHead>
                      <TableHead>Bed</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {list.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          <div className="font-medium">{p.name}</div>
                          <div className="text-xs text-muted-foreground">{p.id} · {p.age}y · {p.condition}</div>
                        </TableCell>
                        <TableCell><SeverityBadge level={p.severity} /></TableCell>
                        <TableCell><NeedsTags needs={p.needs} /></TableCell>
                        <TableCell>{p.status === "admitted" ? bedLabel(p.bedId) : "—"}</TableCell>
                        <TableCell className="capitalize">{p.status}</TableCell>
                        <TableCell className="text-right">
                          {p.status === "waiting" && (
                            <div className="flex justify-end gap-1">
                              <Button size="sm" onClick={() => setAllocId(p.id)}>Allocate</Button>
                              <Button size="sm" variant="ghost" onClick={() => discharge(p.id)}>Remove</Button>
                            </div>
                          )}
                          {p.status === "admitted" && (
                            <Button size="sm" variant="outline" onClick={() => discharge(p.id)}>Discharge</Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!allocId} onOpenChange={(o) => !o && setAllocId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Smart allocation recommendation</DialogTitle></DialogHeader>
          {allocId && <AllocationPanel patientId={allocId} onDone={() => setAllocId(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
