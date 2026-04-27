"use client";

import type { User } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createElement } from "react";

import { createClient } from "@/lib/supabase/client";

export type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  email: string | null;
};

export type Household = {
  id: string;
  name: string;
  invite_code: string | null;
};

export type HouseholdRole = "co_parent_a" | "co_parent_b";

export type HouseholdMembership = {
  household: Household;
  role: HouseholdRole;
};

type AuthContextValue = {
  user: User | null;
  profile: Profile | null;
  membership: HouseholdMembership | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [membership, setMembership] = useState<HouseholdMembership | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(
    async (authedUser: User | null) => {
      if (!authedUser) {
        setProfile(null);
        setMembership(null);
        return;
      }

      const [profileRes, memberRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, display_name, avatar_url, email")
          .eq("id", authedUser.id)
          .maybeSingle(),
        supabase
          .from("household_members")
          .select(
            "role, household:households(id, name, invite_code)",
          )
          .eq("user_id", authedUser.id)
          .maybeSingle(),
      ]);

      setProfile((profileRes.data as Profile | null) ?? null);

      const memberRow = memberRes.data as
        | { role: HouseholdRole; household: Household | Household[] | null }
        | null;
      if (memberRow && memberRow.household) {
        const household = Array.isArray(memberRow.household)
          ? memberRow.household[0]
          : memberRow.household;
        setMembership(
          household ? { household, role: memberRow.role } : null,
        );
      } else {
        setMembership(null);
      }
    },
    [supabase],
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    const {
      data: { user: nextUser },
    } = await supabase.auth.getUser();
    setUser(nextUser ?? null);
    await loadAll(nextUser ?? null);
    setLoading(false);
  }, [supabase, loadAll]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const {
        data: { user: nextUser },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      setUser(nextUser ?? null);
      await loadAll(nextUser ?? null);
      if (!cancelled) setLoading(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      void loadAll(nextUser);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [supabase, loadAll]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, profile, membership, loading, refresh }),
    [user, profile, membership, loading, refresh],
  );

  return createElement(AuthContext.Provider, { value }, children);
}

function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useUser/useHousehold must be used inside <AuthProvider>");
  }
  return ctx;
}

export function useUser() {
  const { user, profile, loading, refresh } = useAuthContext();
  return { user, profile, loading, refresh };
}

export function useHousehold() {
  const { membership, loading, refresh } = useAuthContext();
  return {
    household: membership?.household ?? null,
    role: membership?.role ?? null,
    loading,
    refresh,
  };
}
