"use client";

import { ArrowLeftRight } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

import type { HandoffRecord, HandoffStatus, ParentMember } from "./types";
import { formatDateTime } from "./utils";

const STATUS_OPTIONS: { value: HandoffStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "missed", label: "Missed" },
];

type Props = {
  handoff: HandoffRecord;
  parents: ParentMember[];
  onUpdated: () => void;
};

export function HandoffIndicator({ handoff, parents, onUpdated }: Props) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<HandoffStatus>(handoff.status);
  const [notes, setNotes] = useState(handoff.notes ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const fromParent = parents.find((p) => p.user_id === handoff.from_parent);
  const toParent = parents.find((p) => p.user_id === handoff.to_parent);

  async function handleSave() {
    setSubmitting(true);
    setError(null);
    const { error: updateError } = await supabase
      .from("handoffs")
      .update({ status, notes: notes.trim() || null })
      .eq("id", handoff.id);
    setSubmitting(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setOpen(false);
    onUpdated();
  }

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className={cn(
          "absolute right-1 top-1 z-10 inline-flex h-5 w-5 items-center justify-center rounded-full",
          "bg-accent text-accent-foreground shadow-sm transition-colors",
          "hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        )}
        aria-label="Log handoff"
        title="Log handoff"
      >
        <ArrowLeftRight className="h-3 w-3" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Handoff</DialogTitle>
            <DialogDescription>
              {fromParent?.display_name ?? "Parent"} →{" "}
              {toParent?.display_name ?? "Parent"} •{" "}
              {formatDateTime(handoff.scheduled_at)}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="handoff-status">Status</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as HandoffStatus)}
              >
                <SelectTrigger id="handoff-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="handoff-notes">Notes</Label>
              <Textarea
                id="handoff-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes about the handoff…"
              />
            </div>

            {error ? (
              <p
                role="alert"
                className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger"
              >
                {error}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={submitting}>
              {submitting ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
