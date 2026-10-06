import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Search, Stethoscope, UserRound } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, PageHeader } from "@/components/common";
import { currentShift, isAvailable, isOnDuty, staffLoad } from "@/lib/engine";
import { useStore } from "@/lib/store";
import type { Staff } from "@/lib/types";

export const Route = createFileRoute("/staff")({
  head: () => ({
    meta: [
      { title: "Staff — MediFlow" },
      { name: "description", content: "Doctors and nurses with shifts, specializations and live patient load." },
      { property: "og:title", content: "Staff — MediFlow" },
      { property: "og:description", content: "See who is available now and the least-loaded staff." },
    ],
  }),
  component: StaffPage,
});

function StaffPage() {
  const { state } = useStore();
  const [role, setRole] = useState("all");
  const [q, setQ] = useState("");
  const [availOnly, setAvailOnly] = useState(false);
  const shift = currentShift();

  const leastLoaded = (r: Staff["role"]) =>
    state.staff.filter((s) => s.role === r && isAvailable(state, s)).sort((a, b) => staffLoad(state, a.id) - staffLoad(state, b.id))[0];

  const list = state.staff
    .filter((s) => role === "all" || s.role === role)
    .filter((s) => !availOnly || isAvailable(state, s))
    .filter((s) => {
      const t = q.toLowerCase();
      return !t || s.name.toLowerCase().includes(t) || s.specialization.toLowerCase().includes(t);
    });

  const suggestions = [
    { label: "Suggested doctor", s: leastLoaded("doctor"), icon: Stethoscope },
    { label: "Suggested nurse", s: leastLoaded("nurse"), icon: UserRound },
  ];

  return (
    <div>
      <PageHeader title="Staff" subtitle={`Current shift: ${shift} · ${state.staff.filter(isOnDuty).length} on duty`} />
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        {suggestions.map(({ label, s, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground"><Icon className="h-5 w-5" /></div>
              <div>
                <div className="text-xs text-muted-foreground">{label} (least loaded, available now)</div>
                {s ? (
                  <div className="font-semibold">{s.name} <span className="text-sm font-normal text-muted-foreground">· {s.specialization} · {staffLoad(state, s.id)}/{s.maxLoad}</span></div>
                ) : (
                  <div className="font-semibold text-destructive">No one available</div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="sr-only">Staff list</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-48 flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-8" placeholder="Search name or specialization" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                <SelectItem value="doctor">Doctors</SelectItem>
                <SelectItem value="nurse">Nurses</SelectItem>
              </SelectContent>
            </Select>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={availOnly} onCheckedChange={setAvailOnly} /> Available now
            </label>
          </div>
        </CardHeader>
        <CardContent>
          {list.length === 0 ? (
            <EmptyState icon={<Stethoscope className="h-8 w-8" />} title="No staff match these filters" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Specialization</TableHead>
                    <TableHead>Shift</TableHead>
                    <TableHead className="w-48">Patient load</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.map((s) => {
                    const load = staffLoad(state, s.id);
                    const duty = isOnDuty(s);
                    const avail = isAvailable(state, s);
                    return (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell className="capitalize">{s.role}</TableCell>
                        <TableCell>{s.specialization}</TableCell>
                        <TableCell>{s.shift}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={(load / s.maxLoad) * 100} className="h-2" />
                            <span className="w-10 text-xs text-muted-foreground">{load}/{s.maxLoad}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span
                            className={
                              avail
                                ? "rounded-full bg-free/15 px-2 py-0.5 text-xs font-medium"
                                : duty
                                  ? "rounded-full bg-warning/20 px-2 py-0.5 text-xs font-medium"
                                  : "rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                            }
                          >
                            {avail ? "Available" : duty ? "At capacity" : "Off duty"}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
