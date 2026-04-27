"use client";

import Link from "next/link";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

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
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  ChildOption,
  CustodyBlock,
  ParentMember,
} from "@/components/calendar/types";
import { fromDateOnly } from "@/components/calendar/utils";
import { createClient } from "@/lib/supabase/client";
import { useHousehold } from "@/lib/supabase/hooks";

export default function ManageCustodySchedulePage() {
  const supabase = useMemo(() => createClient(), []);
  const { household, loading: householdLoading } = useHousehold();
  const householdId = household?.id ?? null;

  const [childrenList, setChildrenList] = useState<ChildOption[]>([]);
  const [parents, setParents] = useState<ParentMember[]>([]);
  const [schedules, setSchedules] = useState<CustodyBlock[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [childId, setChildId] = useState<string>("");
  const [parentId, setParentId] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [recurrenceRule, setRecurrenceRule] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!householdId) return;
    setLoading(true);

    const [childrenRes, membersRes, schedulesRes] = await Promise.all([
      supabase
        .from("children")
        .select("id, first_name, last_name")
        .eq("household_id", householdId)
        .order("first_name"),
      supabase
        .from("household_members")
        .select("user_id, role, profile:profiles(display_name)")
        .eq("household_id", householdId),
      supabase
        .from("custody_schedules")
        .select(
          "id, household_id, child_id, parent_id, start_date, end_date, recurrence_rule",
        )
        .eq("household_id", householdId)
        .order("start_date", { ascending: true }),
    ]);

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

    setSchedules((schedulesRes.data ?? []) as CustodyBlock[]);
    setLoading(false);
  }, [supabase, householdId]);

  useEffect(() => {
    if (householdLoading || !householdId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchAll();
  }, [fetchAll, householdLoading, householdId]);

  function resetForm() {
    setEditingId(null);
    setChildId("");
    setParentId("");
    setStartDate("");
    setEndDate("");
    setRecurrenceRule("");
    setFormError(null);
  }

  function startEdit(entry: CustodyBlock) {
    setEditingId(entry.id);
    setChildId(entry.child_id);
    setParentId(entry.parent_id);
    setStartDate(entry.start_date);
    setEndDate(entry.end_date);
    setRecurrenceRule(entry.recurrence_rule ?? "");
    setFormError(null);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);

    if (!householdId) return;
    if (!childId) {
      setFormError("Select a child.");
      return;
    }
    if (!parentId) {
      setFormError("Select a parent.");
      return;
    }
    if (!startDate || !endDate) {
      setFormError("Start and end dates are required.");
      return;
    }
    if (fromDateOnly(endDate) < fromDateOnly(startDate)) {
      setFormError("End date must be after start date.");
      return;
    }

    const payload = {
      household_id: householdId,
      child_id: childId,
      parent_id: parentId,
      start_date: startDate,
      end_date: endDate,
      recurrence_rule: recurrenceRule.trim() || null,
    };

    setSubmitting(true);
    if (editingId) {
      const { error } = await supabase
        .from("custody_schedules")
        .update(payload)
        .eq("id", editingId);
      setSubmitting(false);
      if (error) {
        setFormError(error.message);
        return;
      }
    } else {
      const { error } = await supabase.from("custody_schedules").insert(payload);
      setSubmitting(false);
      if (error) {
        setFormError(error.message);
        return;
      }
    }

    resetForm();
    void fetchAll();
  }

  async function confirmDelete() {
    if (!confirmDeleteId) return;
    setDeleting(true);
    const { error } = await supabase
      .from("custody_schedules")
      .delete()
      .eq("id", confirmDeleteId);
    setDeleting(false);
    if (error) {
      setFormError(error.message);
      return;
    }
    setConfirmDeleteId(null);
    if (editingId === confirmDeleteId) resetForm();
    void fetchAll();
  }

  const childrenById = useMemo(() => {
    const m = new Map<string, ChildOption>();
    for (const c of childrenList) m.set(c.id, c);
    return m;
  }, [childrenList]);

  const parentsById = useMemo(() => {
    const m = new Map<string, ParentMember>();
    for (const p of parents) m.set(p.user_id, p);
    return m;
  }, [parents]);

  if (householdLoading) {
    return (
      <div className="mx-auto max-w-3xl py-8">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!householdId) return null;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon-sm" aria-label="Back to calendar">
          <Link href="/calendar">
            <ArrowLeft />
          </Link>
        </Button>
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Custody schedule
          </h1>
          <p className="text-sm text-muted-foreground">
            Define which parent has custody for each date range.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{editingId ? "Edit entry" : "New entry"}</CardTitle>
          <CardDescription>
            {editingId
              ? "Update an existing custody assignment."
              : "Add a new custody assignment for a child."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="custody-child">Child</Label>
                <Select value={childId} onValueChange={setChildId}>
                  <SelectTrigger id="custody-child">
                    <SelectValue placeholder="Select a child" />
                  </SelectTrigger>
                  <SelectContent>
                    {childrenList.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground">
                        No children — add one first.
                      </div>
                    ) : (
                      childrenList.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {[c.first_name, c.last_name].filter(Boolean).join(" ")}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="custody-parent">Parent</Label>
                <Select value={parentId} onValueChange={setParentId}>
                  <SelectTrigger id="custody-parent">
                    <SelectValue placeholder="Select a parent" />
                  </SelectTrigger>
                  <SelectContent>
                    {parents.map((p) => (
                      <SelectItem key={p.user_id} value={p.user_id}>
                        {p.display_name ?? p.role}
                        {p.role === "co_parent_a"
                          ? " (Parent A)"
                          : " (Parent B)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="custody-start">Start date</Label>
                <Input
                  id="custody-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="custody-end">End date</Label>
                <Input
                  id="custody-end"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="custody-recurrence">
                Recurrence (optional, free text)
              </Label>
              <Input
                id="custody-recurrence"
                value={recurrenceRule}
                onChange={(e) => setRecurrenceRule(e.target.value)}
                placeholder="Every other week, Mon–Fri…"
              />
            </div>

            {formError ? (
              <p
                role="alert"
                className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger"
              >
                {formError}
              </p>
            ) : null}

            <div className="flex gap-2">
              <Button type="submit" disabled={submitting}>
                {submitting
                  ? editingId
                    ? "Saving…"
                    : "Adding…"
                  : editingId
                    ? "Save changes"
                    : "Add entry"}
              </Button>
              {editingId ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                  disabled={submitting}
                >
                  Cancel
                </Button>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Existing entries</h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : schedules.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No custody entries yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {schedules.map((s) => {
              const child = childrenById.get(s.child_id);
              const parent = parentsById.get(s.parent_id);
              return (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-3 rounded-md border bg-card p-3 text-sm"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium">
                      {child
                        ? [child.first_name, child.last_name]
                            .filter(Boolean)
                            .join(" ")
                        : "Unknown child"}
                      <span className="text-muted-foreground"> · </span>
                      <span className="text-muted-foreground">
                        {parent?.display_name ?? "Unknown parent"}
                        {parent?.role === "co_parent_a"
                          ? " (A)"
                          : parent?.role === "co_parent_b"
                            ? " (B)"
                            : ""}
                      </span>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {s.start_date} → {s.end_date}
                      {s.recurrence_rule ? ` · ${s.recurrence_rule}` : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Edit"
                      onClick={() => startEdit(s)}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Delete"
                      onClick={() => setConfirmDeleteId(s.id)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <AlertDialog
        open={!!confirmDeleteId}
        onOpenChange={(open) => !open && setConfirmDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete custody entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the custody assignment from the
              calendar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
              disabled={deleting}
              className="bg-danger text-danger-foreground hover:bg-danger/90"
            >
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
