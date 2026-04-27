import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function DashboardPlaceholder() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Phase 1 placeholder — verifying layout, palette, and typography.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Up next</CardTitle>
            <CardDescription>Today and tomorrow</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <div className="flex items-center justify-between">
              <span>Soccer practice</span>
              <Badge className="bg-primary-soft text-foreground">5pm</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Handoff to Parent B</span>
              <Badge className="bg-accent-soft text-foreground">8am</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status palette</CardTitle>
            <CardDescription>Quiet Harbor semantics</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <span className="rounded-md bg-success-soft px-3 py-1 text-success">
              Confirmed
            </span>
            <span className="rounded-md bg-warning-soft px-3 py-1 text-warning">
              Caution
            </span>
            <span className="rounded-md bg-danger-soft px-3 py-1 text-danger">
              Conflict
            </span>
            <span className="rounded-md bg-info-soft px-3 py-1 text-info">
              Info
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Typography</CardTitle>
            <CardDescription>Nunito — humanist sans</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">Muted body copy</p>
            <p className="text-sm">Default body copy</p>
            <p className="text-base font-semibold">Section heading</p>
            <Button>Primary action</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
