import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, PackagePlus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/common";
import { useStore } from "@/lib/store";
import type { Item } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/inventory")({
  head: () => ({
    meta: [
      { title: "Equipment & Inventory — MediFlow" },
      { name: "description", content: "Ventilators, oxygen, OT rooms, blood units and key medicines with low-stock warnings." },
      { property: "og:title", content: "Equipment & Inventory — MediFlow" },
      { property: "og:description", content: "Available vs in-use stock with one-click restocking." },
    ],
  }),
  component: InventoryPage,
});

function InventoryPage() {
  const { state, restock } = useStore();
  const [item, setItem] = useState<Item | null>(null);
  const [qty, setQty] = useState("10");
  const [err, setErr] = useState("");

  const submit = () => {
    const n = Number(qty);
    if (!Number.isInteger(n) || n <= 0 || n > 1000) {
      setErr("Enter a whole number between 1 and 1000");
      return;
    }
    if (item && restock(item.id, n)) setItem(null);
  };

  return (
    <div>
      <PageHeader title="Equipment & Inventory" subtitle="Available vs in-use stock across critical resources" />
      {(["Equipment", "Blood", "Medicine"] as const).map((cat) => (
        <section key={cat} className="mb-6">
          <h2 className="mb-3 text-lg font-semibold">{cat === "Medicine" ? "Key medicines" : cat === "Blood" ? "Blood units" : "Equipment"}</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {state.inventory
              .filter((i) => i.category === cat)
              .map((i) => {
                const avail = i.total - i.inUse;
                const low = avail <= i.threshold;
                const highlight = state.emergency && (i.id === "ventilator" || i.id === "oxygen");
                return (
                  <Card key={i.id} className={cn(low && "border-destructive/50", highlight && "emergency-glow")}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-medium">{i.name}</div>
                        {low && (
                          <span className="flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-medium text-destructive">
                            <AlertTriangle className="h-3 w-3" /> {avail <= 0 ? "Out" : "Low"}
                          </span>
                        )}
                      </div>
                      <div className="mt-3 flex items-baseline gap-1">
                        <span className={cn("font-display text-3xl font-semibold", low && "text-destructive")}>{avail}</span>
                        <span className="text-sm text-muted-foreground">available</span>
                      </div>
                      <Progress value={i.total ? (i.inUse / i.total) * 100 : 0} className="mt-3 h-2" />
                      <div className="mt-1.5 flex justify-between text-xs text-muted-foreground">
                        <span>{i.inUse} in use</span>
                        <span>{i.total} {i.unit} total</span>
                      </div>
                      <Button size="sm" variant="outline" className="mt-3 w-full" onClick={() => { setItem(i); setQty("10"); setErr(""); }}>
                        <PackagePlus className="h-4 w-4" /> Restock
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        </section>
      ))}

      <Dialog open={!!item} onOpenChange={(o) => !o && setItem(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Restock {item?.name}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="qty">Quantity to add ({item?.unit})</Label>
            <Input id="qty" type="number" min={1} value={qty} onChange={(e) => { setQty(e.target.value); setErr(""); }} />
            {err && <p className="text-xs text-destructive">{err}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItem(null)}>Cancel</Button>
            <Button onClick={submit}>Restock</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
