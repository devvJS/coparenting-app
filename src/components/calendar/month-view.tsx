"use client";

import { useMemo } from "react";

import { cn } from "@/lib/utils";

import { CustodyBlock } from "./custody-block";
import { HandoffIndicator } from "./handoff-indicator";
import type {
  CalendarEvent,
  CustodyBlock as CustodyBlockType,
  HandoffRecord,
  ParentMember,
} from "./types";
import {
  buildMonthGrid,
  fromDateOnly,
  isSameDay,
  isSameMonth,
  toLocalDateKey,
} from "./utils";

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type Props = {
  month: Date;
  events: CalendarEvent[];
  custody: CustodyBlockType[];
  handoffs: HandoffRecord[];
  parents: ParentMember[];
  onSelectDay?: (date: Date) => void;
  onSelectEvent?: (event: CalendarEvent, anchor: HTMLElement) => void;
  onHandoffsChanged?: () => void;
};

type DayBucket = {
  events: CalendarEvent[];
  custody: { parent: ParentMember | undefined; isStart: boolean } | null;
  handoff: HandoffRecord | null;
};

export function MonthView({
  month,
  events,
  custody,
  handoffs,
  parents,
  onSelectDay,
  onSelectEvent,
  onHandoffsChanged,
}: Props) {
  const cells = useMemo(() => buildMonthGrid(month), [month]);

  const dayBuckets = useMemo(() => {
    const map = new Map<string, DayBucket>();
    for (const cell of cells) {
      map.set(toLocalDateKey(cell), { events: [], custody: null, handoff: null });
    }

    for (const event of events) {
      const key = toLocalDateKey(event.start_time);
      const bucket = map.get(key);
      if (bucket) bucket.events.push(event);
    }

    // For overlapping custody ranges across the same day, the most recently
    // created entry wins — a simple, predictable resolution that lets users
    // override an earlier schedule by adding a new one.
    const sortedCustody = [...custody].sort((a, b) =>
      a.start_date.localeCompare(b.start_date),
    );
    for (const block of sortedCustody) {
      const start = fromDateOnly(block.start_date);
      const end = fromDateOnly(block.end_date);
      const parent = parents.find((p) => p.user_id === block.parent_id);
      for (const cell of cells) {
        if (cell >= start && cell <= end) {
          const bucket = map.get(toLocalDateKey(cell));
          if (bucket) {
            bucket.custody = {
              parent,
              isStart: isSameDay(cell, start),
            };
          }
        }
      }
    }

    for (const handoff of handoffs) {
      const key = toLocalDateKey(handoff.scheduled_at);
      const bucket = map.get(key);
      if (bucket) bucket.handoff = handoff;
    }

    return map;
  }, [cells, events, custody, handoffs, parents]);

  const today = new Date();

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="grid grid-cols-7 border-b bg-muted/40 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {WEEK_DAYS.map((day) => (
          <div key={day} className="px-2 py-2 text-center">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 grid-rows-6">
        {cells.map((cell) => {
          const key = toLocalDateKey(cell);
          const bucket = dayBuckets.get(key)!;
          const inMonth = isSameMonth(cell, month);
          const isToday = isSameDay(cell, today);

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDay?.(cell)}
              className={cn(
                "relative flex min-h-24 flex-col gap-1 border-b border-r p-1 text-left text-sm transition-colors",
                "last:border-r-0",
                "hover:bg-muted/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                !inMonth && "bg-muted/20 text-muted-foreground",
              )}
            >
              <div className="relative z-10 flex items-center justify-between">
                <span
                  className={cn(
                    "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                    isToday && "bg-primary text-primary-foreground",
                    !isToday && !inMonth && "text-muted-foreground",
                  )}
                >
                  {cell.getDate()}
                </span>
              </div>

              {bucket.custody?.parent ? (
                <CustodyBlock
                  parent={bucket.custody.parent}
                  showLabel={bucket.custody.isStart}
                />
              ) : null}

              {bucket.handoff ? (
                <HandoffIndicator
                  handoff={bucket.handoff}
                  parents={parents}
                  onUpdated={() => onHandoffsChanged?.()}
                />
              ) : null}

              <div className="relative z-10 flex flex-1 flex-col gap-0.5 overflow-hidden">
                {bucket.events.slice(0, 3).map((event) => (
                  <span
                    key={event.id}
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectEvent?.(event, e.currentTarget as HTMLElement);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        onSelectEvent?.(
                          event,
                          e.currentTarget as HTMLElement,
                        );
                      }
                    }}
                    className={cn(
                      "block truncate rounded-sm bg-primary px-1.5 py-0.5 text-[11px] font-medium text-primary-foreground",
                      "hover:bg-primary-hover focus:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                    )}
                    title={event.title}
                  >
                    {event.title}
                  </span>
                ))}
                {bucket.events.length > 3 ? (
                  <span className="px-1 text-[10px] text-muted-foreground">
                    +{bucket.events.length - 3} more
                  </span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
