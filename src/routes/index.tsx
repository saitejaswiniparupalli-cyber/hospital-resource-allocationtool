import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, BedDouble, Bell, CheckCircle2, Clock, HeartPulse, Users, Wind } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/common";
import { getAlerts, isOnDuty, itemAvailable, last7Days, wardOccupancy } from "@/lib/engine";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — MediFlow" },
      { name: "description", content: "Live bed occupancy, ICU, ventilators, staff and alerts for the hospital." },
      { property: "og:title", content: "Dashboard — MediFlow" },
      { property: "og:description", content: "Live hospital resource overview and alerts." },
    ],
  }),
  component: Dashboard,
});

const tooltipStyle = { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--popover-foreground)" };

function Dashboard() {
  const { state } = useStore();
  const occupied = state.beds.filter((b) => b.status === "occupied").length;
  const occPct = Math.round((occupied / state.beds.length) * 100);
  const icuFree = wardOccupancy(state, "icu").free;
  const vents = itemAvailable(state, "ventilator");
  const onDuty = state.staff.filter(isOnDuty).length;
  const waiting = state.patients.filter((p) => p.status === "waiting").length;
  const alerts = getAlerts(state);
  const wardData = state.wards.map((w) => {
    const o = wardOccupancy(state, w.id);
    return { ward: w.name, Occupied: o.occupied, Cleaning: o.cleaning, Free: o.free };
  });

  const kpis = [
    { label: "Bed occupancy", value: `${occPct}%`, sub: `${occupied}/${state.beds.length} beds`, icon: BedDouble, warn: occPct >= 85 },
    { label: "Free ICU beds", value: icuFree, sub: "Intensive care", icon: HeartPulse, warn: icuFree <= 1, em: true },
    { label: "Ventilators available", value: vents, sub: "Ready to deploy", icon: Wind, warn: vents <= 3, em: true },
    { label: "Staff on duty", value: onDuty, sub: "Current shift", icon: Users, warn: false },
    { label: "Patients waiting", value: waiting, sub: "In priority queue", icon: Clock, warn: waiting >= 5 },
  ];

  return (
    <div>
      <PageHeader title="Hospital overview" subtitle="Real-time resource status across all wards" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {kpis.map((k) => (
          <Card key={k.label} className={cn(state.emergency && k.em && "emergency-glow")}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium">{k.label}</span>
                <k.icon className={cn("h-4 w-4", k.warn ? "text-destructive" : "text-teal")} />
              </div>
              <div className={cn("mt-2 font-display text-3xl font-semibold", k.warn && "text-destructive")}>{k.value}</div>
              <div className="text-xs text-muted-foreground">{k.sub}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-base">Occupancy by ward</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={wardData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="ward" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)" }} />
                <Legend />
                <Bar dataKey="Occupied" stackId="a" fill="var(--occupied)" />
                <Bar dataKey="Cleaning" stackId="a" fill="var(--cleaning)" />
                <Bar dataKey="Free" stackId="a" fill="var(--free)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="h-4 w-4" /> Live alerts
              <span className="ml-auto rounded-full bg-secondary px-2 text-xs">{alerts.length}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-72 space-y-2 overflow-auto">
            {alerts.length === 0 ? (
              <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground justify-center">
                <CheckCircle2 className="h-4 w-4 text-free" /> All systems normal
              </div>
            ) : (
              alerts.map((a) => (
                <div
                  key={a.text}
                  className={cn(
                    "flex items-start gap-2 rounded-md border px-3 py-2 text-sm",
                    a.level === "critical" ? "border-destructive/40 bg-destructive/10 text-destructive" : "border-warning/40 bg-warning/10",
                  )}
                >
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {a.text}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Admissions vs discharges — last 7 days</CardTitle>
            <Link to="/reports" className="text-sm text-primary hover:underline">Reports →</Link>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={last7Days(state)}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Line type="monotone" dataKey="admissions" name="Admissions" stroke="var(--chart-1)" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="discharges" name="Discharges" stroke="var(--chart-2)" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
