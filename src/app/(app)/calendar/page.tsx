"use client";

import { ChevronLeft, ChevronRight, Plus, Settings } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { EventDetailPopover } from "@/components/calendar/event-detail-popover";
import { EventFormDialog } from "@/components/calendar/event-form-dialog";
import { MonthView } from "@/components/calendar/month-view";
import type {
  CalendarEvent,
  ChildOption,
  CustodyBlock,
  HandoffRecord,
  ParentMember,
} from "@/components/calendar/types";
import {
  addMonths,
  endOfMonth,
  formatMonthLabel,
  startOfMonth,
} from "@/components/calendar/utils";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { useHousehold, useUser } from "@/lib/supabase/hooks";

export default function CalendarPage() {
  const supabase = useMemo(() => createClient(), []);
  const { user } = useUser();
  const { household, loading: householdLoading } = useHousehold();
  const householdId = household?.id ?? null;

  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [custody, setCustody] = useState<CustodyBlock[]>([]);
  const [handoffs, setHandoffs] = useState<HandoffRecord[]>([]);
  const [childrenList, setChildrenList] = useState<ChildOption[]>([]);
  const [parents, setParents] = useState<ParentMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [defaultDate, setDefaultDate] = useState<Date | null>(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailEvent, setDetailEvent] = useState<CalendarEvent | null>(null);
  const [detailAnchor, setDetailAnchor] = useState<HTMLElement | null>(null);

  const fetchAll = useCallback(async () => {
    if (!householdId) return;
    setLoading(true);
    setError(null);

    const rangeStart = startOfMonth(month);
    const rangeEnd = endOfMonth(month);
    const startISO = rangeStart.toISOString();
    const endISO = new Date(
      rangeEnd.getFullYear(),
      rangeEnd.getMonth(),
      rangeEnd.getDate(),
      23,
      59,
      59,
    ).toISOString();
    // custody_schedules use date columns; compare against ISO date strings.
    const startDate = `${rangeStart.getFullYear()}-${String(rangeStart.getMonth() + 1).padStart(2, "0")}-${String(rangeStart.getDate()).padStart(2, "0")}`;
    const endDate = `${rangeEnd.getFullYear()}-${String(rangeEnd.getMonth() + 1).padStart(2, "0")}-${String(rangeEnd.getDate()).padStart(2, "0")}`;

    const [eventsRes, custodyRes, handoffsRes, childrenRes, membersRes] =
      await Promise.all([
        supabase
          .from("events")
          .select(
            "id, household_id, created_by, title, description, start_time, end_time, event_type, child_id",
          )
          .eq("household_id", householdId)
          .gte("start_time", startISO)
          .lte("start_time", endISO)
          .order("start_time", { ascending: true }),
        supabase
          .from("custody_schedules")
          .select(
            "id, household_id, child_id, parent_id, start_date, end_date, recurrence_rule",
          )
          .eq("household_id", householdId)
          .lte("start_date", endDate)
          .gte("end_date", startDate),
        supabase
          .from("handoffs")
          .select(
            "id, custody_schedule_id, household_id, from_parent, to_parent, scheduled_at, status, notes",
          )
          .eq("household_id", householdId)
          .gte("scheduled_at", startISO)
          .lte("scheduled_at", endISO),
        supabase
          .from("children")
          .select("id, first_name, last_name")
          .eq("household_id", householdId)
          .order("first_name"),
        supabase
          .from("household_members")
          .select("user_id, role, profile:profiles(display_name)")
          .eq("household_id", householdId),
      ]);

    const firstError =
      eventsRes.error ??
      custodyRes.error ??
      handoffsRes.error ??
      childrenRes.error ??
      membersRes.error;
    if (firstError) {
      setError(firstError.message);
      setLoading(false);
      return;
    }

    setEvents((eventsRes.data ?? []) as CalendarEvent[]);
    setCustody((custodyRes.data ?? []) as CustodyBlock[]);
    setHandoffs((handoffsRes.data ?? []) as HandoffRecord[]);
    setChildrenList((childrenRes.data ?? []) as ChildOption[]);

    const memberRows = (membersRes.data ?? []) as Array<{
      user_id: string;
      role: ParentMember["role"];
      profile: { display_name: string | null } | { display_name: string | null }[] | null;
    }>;
    setParents(
      memberRows.map((row) => {
        const profile = Array.isArray(row.profile) ? row.profile[0] : row.profile;
        return {
          user_id: row.user_id,
          role: row.role,
          display_name: profile?.display_name ?? null,
        };
      }),
    );

    setLoading(false);
  }, [supabase, householdId, month]);

  useEffect(() => {
    if (householdLoading || !householdId) return;
    // Fetch-on-mount pattern: setState happens in fetchAll's async path; the
    // rule's heuristic flags any setState reachable from the effect body.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchAll();
  }, [fetchAll, householdLoading, householdId]);

  function handleSelectDay(date: Date) {
    setEditing(null);
    setDefaultDate(date);
    setFormOpen(true);
  }

  function handleSelectEvent(event: CalendarEvent, anchor: HTMLElement) {
    setDetailEvent(event);
    setDetailAnchor(anchor);
    setDetailOpen(true);
  }

  function handleEditFromDetail(event: CalendarEvent) {
    setDefaultDate(null);
    setEditing(event);
    setFormOpen(true);
  }

  if (householdLoading) {
    return (
      <div className="mx-auto max-w-6xl py-8">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!householdId || !user) {
    return null;
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
          <p className="text-sm text-muted-foreground">
            Shared schedule for {household?.name ?? "your household"}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/calendar/custody/manage">
              <Settings />
              Custody schedule
            </Link>
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setEditing(null);
              setDefaultDate(null);
              setFormOpen(true);
            }}
          >
            <Plus />
            New event
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label="Previous month"
          onClick={() => setMonth((m) => addMonths(m, -1))}
        >
          <ChevronLeft />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label="Next month"
          onClick={() => setMonth((m) => addMonths(m, 1))}
        >
          <ChevronRight />
        </Button>
        <h2 className="text-lg font-semibold">{formatMonthLabel(month)}</h2>
        <div className="flex-1" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setMonth(startOfMonth(new Date()))}
        >
          Today
        </Button>
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger"
        >
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading events…</p>
      ) : (
        <MonthView
          month={month}
          events={events}
          custody={custody}
          handoffs={handoffs}
          parents={parents}
          onSelectDay={handleSelectDay}
          onSelectEvent={handleSelectEvent}
          onHandoffsChanged={fetchAll}
        />
      )}

      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm bg-primary-soft" />
          Parent A custody
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm bg-accent-soft" />
          Parent B custody
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-accent" />
          Handoff
        </span>
      </div>

      <EventFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        householdId={householdId}
        userId={user.id}
        event={editing}
        defaultDate={defaultDate}
        childOptions={childrenList}
        onSaved={fetchAll}
      />

      <EventDetailPopover
        open={detailOpen}
        onOpenChange={setDetailOpen}
        event={detailEvent}
        anchor={detailAnchor}
        childOptions={childrenList}
        onEdit={handleEditFromDetail}
        onDeleted={fetchAll}
      />
    </div>
  );
}
