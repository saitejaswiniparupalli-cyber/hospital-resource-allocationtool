import { useEffect, useState } from "react";
import { Moon, RotateCcw, Siren, Sun } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function AppHeader() {
  const { state, toggleEmergency, reset } = useStore();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const d = localStorage.getItem("mediflow-theme") === "dark";
    setDark(d);
    document.documentElement.classList.toggle("dark", d);
  }, []);

  const toggleTheme = () => {
    const d = !dark;
    setDark(d);
    document.documentElement.classList.toggle("dark", d);
    localStorage.setItem("mediflow-theme", d ? "dark" : "light");
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-background/85 px-3 backdrop-blur",
        state.emergency && "border-destructive bg-destructive/10",
      )}
    >
      <SidebarTrigger />
      {state.emergency && (
        <span className="hidden items-center gap-1.5 text-sm font-semibold text-destructive sm:flex">
          <Siren className="h-4 w-4 animate-pulse" /> EMERGENCY MODE
        </span>
      )}
      <div className="ml-auto flex items-center gap-2">
        <label className="flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm">
          <Siren className={cn("h-4 w-4", state.emergency ? "text-destructive" : "text-muted-foreground")} />
          <span className="hidden sm:inline">Emergency</span>
          <Switch checked={state.emergency} onCheckedChange={toggleEmergency} aria-label="Emergency mode" />
        </label>
        <Button variant="outline" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm">
              <RotateCcw className="h-4 w-4" />
              <span className="hidden md:inline">Reset demo data</span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset demo data?</AlertDialogTitle>
              <AlertDialogDescription>
                All patients, beds, staff assignments and inventory will return to the original sample data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={reset}>Reset</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </header>
  );
}
