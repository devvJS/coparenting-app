"use client";

import { useEffect, useRef, useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import { createClient } from "@/lib/supabase/client";

import type { CalendarEvent, ChildOption } from "./types";
import { EVENT_TYPES } from "./types";
import { formatDateTime, formatTimeRange } from "./utils";

type Props = {
  event: CalendarEvent | null;
  anchor: HTMLElement | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  childOptions: ChildOption[];
  onEdit: (event: CalendarEvent) => void;
  onDeleted: () => void;
};

export function EventDetailPopover({
  event,
  anchor,
  open,
  onOpenChange,
  childOptions,
  onEdit,
  onDeleted,
}: Props) {
  const supabase = createClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const anchorRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    anchorRef.current = anchor;
  }, [anchor]);

  async function handleDelete() {
    if (!event) return;
    setDeleting(true);
    setError(null);
    const { error: deleteError } = await supabase
      .from("events")
      .delete()
      .eq("id", event.id);
    setDeleting(false);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setConfirmOpen(false);
    onOpenChange(false);
    onDeleted();
  }

  const child = event?.child_id
    ? childOptions.find((c) => c.id === event.child_id)
    : null;
  const typeLabel = event
    ? (EVENT_TYPES.find((t) => t.value === event.event_type)?.label ??
      event.event_type)
    : null;

  return (
    <>
      <Popover open={open && !!event && !!anchor} onOpenChange={onOpenChange}>
        {/* radix popper allows null at runtime but the type is strict. */}
        <PopoverAnchor
          virtualRef={anchorRef as React.RefObject<HTMLElement>}
        />
        <PopoverContent align="start" sideOffset={8} className="w-80">
          {event ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-base font-semibold leading-tight">
                  {event.title}
                </h3>
                <Badge variant="secondary">{typeLabel}</Badge>
              </div>

              <div className="text-sm text-muted-foreground">
                <div>{formatDateTime(event.start_time)}</div>
                {event.end_time ? (
                  <div className="text-xs">
                    {formatTimeRange(event.start_time, event.end_time)}
                  </div>
                ) : null}
              </div>

              {child ? (
                <div className="text-sm">
                  <span className="text-muted-foreground">For: </span>
                  <span className="font-medium">
                    {[child.first_name, child.last_name]
                      .filter(Boolean)
                      .join(" ")}
                  </span>
                </div>
              ) : null}

              {event.description ? (
                <p className="whitespace-pre-wrap text-sm">
                  {event.description}
                </p>
              ) : null}

              {error ? (
                <p
                  role="alert"
                  className="rounded-md bg-danger-soft px-3 py-2 text-xs text-danger"
                >
                  {error}
                </p>
              ) : null}

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onOpenChange(false);
                    onEdit(event);
                  }}
                >
                  Edit
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => setConfirmOpen(true)}
                >
                  Delete
                </Button>
              </div>
            </div>
          ) : null}
        </PopoverContent>
      </Popover>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete event?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes &quot;{event?.title}&quot; from the
              shared calendar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleDelete();
              }}
              disabled={deleting}
              className="bg-danger text-danger-foreground hover:bg-danger/90"
            >
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
