"use client";

import { cn } from "@/lib/utils";
import type { ParentMember } from "./types";

type Props = {
  parent: ParentMember | undefined;
  // Whether this is the first day of the custody range visible in the cell —
  // the parent's initial badge only renders on these days to keep the grid tidy.
  showLabel?: boolean;
};

export function CustodyBlock({ parent, showLabel }: Props) {
  if (!parent) return null;

  const isParentA = parent.role === "co_parent_a";
  const initial = (parent.display_name?.trim()?.[0] ?? "?").toUpperCase();

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 bottom-0 top-7 -z-0 rounded-sm",
        isParentA ? "bg-primary-soft" : "bg-accent-soft",
      )}
      aria-hidden
    >
      {showLabel ? (
        <span
          className={cn(
            "absolute bottom-1 right-1 inline-flex h-4 min-w-4 items-center justify-center rounded-sm px-1 text-[10px] font-semibold leading-none",
            isParentA
              ? "bg-primary text-primary-foreground"
              : "bg-accent text-accent-foreground",
          )}
        >
          {initial}
        </span>
      ) : null}
    </div>
  );
}
