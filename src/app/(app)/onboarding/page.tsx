"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useHousehold, useUser } from "@/lib/supabase/hooks";
import { createClient } from "@/lib/supabase/client";

const INVITE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I

function generateInviteCode(length = 6) {
  let out = "";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < length; i++) {
    out += INVITE_ALPHABET[bytes[i] % INVITE_ALPHABET.length];
  }
  return out;
}

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const { user, loading: userLoading } = useUser();
  const { household, loading: householdLoading, refresh } = useHousehold();

  // If the user already has a household, they don't need this page.
  useEffect(() => {
    if (!householdLoading && household) {
      router.replace("/");
    }
  }, [household, householdLoading, router]);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!user) {
      setError("You must be signed in.");
      return;
    }
    if (!name.trim()) {
      setError("Household name is required.");
      return;
    }

    setSubmitting(true);
    const inviteCode = generateInviteCode();

    const { data: householdRow, error: insertErr } = await supabase
      .from("households")
      .insert({ name: name.trim(), invite_code: inviteCode })
      .select("id, invite_code")
      .single();

    if (insertErr || !householdRow) {
      setSubmitting(false);
      setError(insertErr?.message ?? "Failed to create household.");
      return;
    }

    const { error: memberErr } = await supabase
      .from("household_members")
      .insert({
        household_id: householdRow.id,
        user_id: user.id,
        role: "co_parent_a",
      });

    if (memberErr) {
      setSubmitting(false);
      setError(memberErr.message);
      return;
    }

    setCreatedCode(householdRow.invite_code as string);
    await refresh();
    setSubmitting(false);
  }

  async function onJoin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length === 0) {
      setError("Invite code is required.");
      return;
    }

    setSubmitting(true);
    const { error: rpcErr } = await supabase.rpc("join_household_by_code", {
      code: trimmed,
    });
    setSubmitting(false);

    if (rpcErr) {
      setError(rpcErr.message);
      return;
    }

    await refresh();
    router.replace("/");
    router.refresh();
  }

  if (userLoading || householdLoading) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col gap-4 py-8">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 py-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Set up your household
        </h1>
        <p className="text-muted-foreground">
          Create a new household or join your co-parent&apos;s with an invite
          code.
        </p>
      </div>

      {createdCode ? (
        <Card>
          <CardHeader>
            <CardTitle>Household created</CardTitle>
            <CardDescription>
              Share this code with your co-parent so they can join.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="rounded-md border bg-primary-soft px-4 py-3 text-center font-mono text-lg tracking-widest">
              {createdCode}
            </div>
            <Button onClick={() => router.replace("/")}>
              Continue to dashboard
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="create">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create">Create household</TabsTrigger>
            <TabsTrigger value="join">Join household</TabsTrigger>
          </TabsList>

          <TabsContent value="create">
            <Card>
              <CardHeader>
                <CardTitle>Create a new household</CardTitle>
                <CardDescription>
                  We&apos;ll generate an invite code you can share.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={onCreate} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="household-name">Household name</Label>
                    <Input
                      id="household-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="The Smith Family"
                      required
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

                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Creating…" : "Create household"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="join">
            <Card>
              <CardHeader>
                <CardTitle>Join an existing household</CardTitle>
                <CardDescription>
                  Paste the 6-character invite code from your co-parent.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={onJoin} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="invite-code">Invite code</Label>
                    <Input
                      id="invite-code"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      maxLength={6}
                      placeholder="ABC123"
                      autoCapitalize="characters"
                      className="font-mono uppercase tracking-widest"
                      required
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

                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Joining…" : "Join household"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
