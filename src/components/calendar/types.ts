export type EventType =
  | "general"
  | "appointment"
  | "school"
  | "activity"
  | "medical"
  | "milestone"
  | "custody";

export type HandoffStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "missed";

export type CalendarEvent = {
  id: string;
  household_id: string;
  created_by: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  event_type: EventType;
  child_id: string | null;
};

export type CustodyBlock = {
  id: string;
  household_id: string;
  child_id: string;
  parent_id: string;
  start_date: string;
  end_date: string;
  recurrence_rule: string | null;
};

export type HandoffRecord = {
  id: string;
  custody_schedule_id: string;
  household_id: string;
  from_parent: string;
  to_parent: string;
  scheduled_at: string;
  status: HandoffStatus;
  notes: string | null;
};

export type ChildOption = {
  id: string;
  first_name: string;
  last_name: string | null;
};

export type ParentMember = {
  user_id: string;
  role: "co_parent_a" | "co_parent_b";
  display_name: string | null;
};

export const EVENT_TYPES: { value: EventType; label: string }[] = [
  { value: "general", label: "General" },
  { value: "appointment", label: "Appointment" },
  { value: "school", label: "School" },
  { value: "activity", label: "Activity" },
  { value: "medical", label: "Medical" },
  { value: "milestone", label: "Milestone" },
  { value: "custody", label: "Custody" },
];
