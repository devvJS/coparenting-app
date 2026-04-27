"use client";

import { useEffect, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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

import type { CalendarEvent, ChildOption, EventType } from "./types";
import { EVENT_TYPES } from "./types";
import {
  fromDateTimeLocalInput,
  toDateTimeLocalInput,
} from "./utils";

const NO_CHILD = "__none__";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  householdId: string;
  userId: string;
  event?: CalendarEvent | null;
  defaultDate?: Date | null;
  childOptions: ChildOption[];
  onSaved: () => void;
};

export function EventFormDialog({
  open,
  onOpenChange,
  householdId,
  userId,
  event,
  defaultDate,
  childOptions,
  onSaved,
}: Props) {
  const supabase = createClient();
  const editing = !!event;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [eventType, setEventType] = useState<EventType>("general");
  const [childId, setChildId] = useState<string>(NO_CHILD);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    // Resetting form fields when the dialog opens is the canonical use of an
    // effect to sync controlled inputs with the incoming event prop.
    /* eslint-disable react-hooks/set-state-in-effect */
    if (event) {
      setTitle(event.title);
      setDescription(event.description ?? "");
      setStart(toDateTimeLocalInput(event.start_time));
      setEnd(event.end_time ? toDateTimeLocalInput(event.end_time) : "");
      setEventType(event.event_type);
      setChildId(event.child_id ?? NO_CHILD);
    } else {
      const seedDate = defaultDate ?? new Date();
      const seed = new Date(seedDate);
      // Default new events to 9am on the chosen day for a saner pre-fill.
      seed.setHours(9, 0, 0, 0);
      setTitle("");
      setDescription("");
      setStart(toDateTimeLocalInput(seed));
      setEnd("");
      setEventType("general");
      setChildId(NO_CHILD);
    }
    setError(null);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open, event, defaultDate]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!start) {
      setError("Start time is required.");
      return;
    }

    let startISO: string;
    let endISO: string | null = null;
    try {
      startISO = fromDateTimeLocalInput(start);
      if (end) endISO = fromDateTimeLocalInput(end);
    } catch {
      setError("Invalid date/time.");
      return;
    }

    if (endISO && new Date(endISO) < new Date(startISO)) {
      setError("End time must be after start time.");
      return;
    }

    const payload = {
      household_id: householdId,
      title: title.trim(),
      description: description.trim() || null,
      start_time: startISO,
      end_time: endISO,
      event_type: eventType,
      child_id: childId === NO_CHILD ? null : childId,
    };

    setSubmitting(true);
    if (editing && event) {
      const { error: updateError } = await supabase
        .from("events")
        .update(payload)
        .eq("id", event.id);
      setSubmitting(false);
      if (updateError) {
        setError(updateError.message);
        return;
      }
    } else {
      const { error: insertError } = await supabase
        .from("events")
        .insert({ ...payload, created_by: userId });
      setSubmitting(false);
      if (insertError) {
        setError(insertError.message);
        return;
      }
    }

    onOpenChange(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit event" : "New event"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Update the details for this event."
              : "Add an event to the shared calendar."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="event-title">Title</Label>
            <Input
              id="event-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Soccer practice"
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="event-description">Description</Label>
            <Textarea
              id="event-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional notes…"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="event-start">Start</Label>
              <Input
                id="event-start"
                type="datetime-local"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="event-end">End</Label>
              <Input
                id="event-end"
                type="datetime-local"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="event-type">Type</Label>
              <Select
                value={eventType}
                onValueChange={(v) => setEventType(v as EventType)}
              >
                <SelectTrigger id="event-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="event-child">Child (optional)</Label>
              <Select value={childId} onValueChange={setChildId}>
                <SelectTrigger id="event-child">
                  <SelectValue placeholder="No child" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_CHILD}>No child</SelectItem>
                  {childOptions.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {[c.first_name, c.last_name].filter(Boolean).join(" ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {error ? (
            <p
              role="alert"
              className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger"
            >
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting
                ? editing
                  ? "Saving…"
                  : "Creating…"
                : editing
                  ? "Save"
                  : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
