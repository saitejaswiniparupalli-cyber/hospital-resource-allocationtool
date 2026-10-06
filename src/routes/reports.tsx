import { createFileRoute } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/common";
import { isOnDuty, staffLoad, wardOccupancy } from "@/lib/engine";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports — MediFlow" },
      { name: "description", content: "Utilization summary for beds, equipment and staff with CSV export." },
      { property: "og:title", content: "Reports — MediFlow" },
      { property: "og:description", content: "Hospital utilization summary and CSV download." },
    ],
  }),
  component: ReportsPage,
});

interface Row {
  category: string;
  resource: string;
  total: number;
  inUse: number;
  available: number;
  pct: number;
}

function ReportsPage() {
  const { state } = useStore();
  const rows: Row[] = [
    ...state.wards.map((w) => {
      const o = wardOccupancy(state, w.id);
      return { category: "Beds", resource: `${w.name} ward`, total: o.total, inUse: o.occupied, available: o.free, pct: o.pct };
    }),
    ...state.inventory.map((i) => ({
      category: i.category,
      resource: i.name,
      total: i.total,
      inUse: i.inUse,
      available: i.total - i.inUse,
      pct: i.total ? Math.round((i.inUse / i.total) * 100) : 0,
    })),
    ...(["doctor", "nurse"] as const).map((r) => {
      const on = state.staff.filter((s) => s.role === r && isOnDuty(s));
      const cap = on.reduce((a, s) => a + s.maxLoad, 0);
      const load = on.reduce((a, s) => a + staffLoad(state, s.id), 0);
      return {
        category: "Staff (on duty)",
        resource: r === "doctor" ? "Doctor capacity" : "Nurse capacity",
        total: cap,
        inUse: Math.min(load, cap),
        available: Math.max(0, cap - load),
        pct: cap ? Math.min(100, Math.round((load / cap) * 100)) : 0,
      };
    }),
  ];

  const download = () => {
    const header = ["Category", "Resource", "Total", "In use", "Available", "Utilization %"];
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = [header, ...rows.map((r) => [r.category, r.resource, r.total, r.inUse, r.available, r.pct])]
      .map((line) => line.map(esc).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `mediflow-utilization-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Utilization report downloaded");
  };

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Utilization summary across beds, equipment, blood, medicines and staff"
        actions={<Button onClick={download}><Download className="h-4 w-4" /> Download CSV</Button>}
      />
      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">In use</TableHead>
                <TableHead className="text-right">Available</TableHead>
                <TableHead className="text-right">Utilization</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.category + r.resource}>
                  <TableCell className="text-muted-foreground">{r.category}</TableCell>
                  <TableCell className="font-medium">{r.resource}</TableCell>
                  <TableCell className="text-right">{r.total}</TableCell>
                  <TableCell className="text-right">{r.inUse}</TableCell>
                  <TableCell className="text-right">{r.available}</TableCell>
                  <TableCell className={r.pct >= 90 ? "text-right font-semibold text-destructive" : "text-right font-semibold"}>{r.pct}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
