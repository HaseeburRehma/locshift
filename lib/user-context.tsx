// lib/user-context.tsx
"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import type { Profile, UserRole } from "@/lib/types";
import { resolveSpesenRates, type SpesenRates } from "@/lib/spesen";
import { resolveSurchargeRules, type SurchargeRules } from "@/lib/time/zuschlag";

export interface OrganizationSettings {
  id: string;
  name: string | null;
  timezone: string | null;
  settings: Record<string, unknown> | null;
  spesen_rate_partial: number | null;
  spesen_rate_full: number | null;
}

interface UserContextType {
  user: User | null;
  profile: Profile | null;
  role: UserRole;
  isAdmin: boolean;
  isDispatcher: boolean;
  isEmployee: boolean;
  isLoading: boolean;
  organization: OrganizationSettings | null;
  spesenRates: SpesenRates;
  surchargeRules: SurchargeRules;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

// ─── single reusable fetch with retry ───────────────────────────────────────
async function fetchProfile(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  attempt = 1
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    // 1. Silent ignore common/expected error cases
    if (error.code === "PGRST116") return null; // No profile yet
    
    // 2. Handle AbortError / Canceled requests (often logged as "Lock broken by another request")
    if (error.message?.includes('AbortError') || error.message?.includes('broken')) {
      return null;
    }
    
    // 3. Retry on 500/406 (DB startup or recursion)
    if ((error as any).status === 500 || (error as any).status === 406) {
      if (attempt < 3) {
        await new Promise(r => setTimeout(r, 1200 * attempt));
        return fetchProfile(supabase, userId, attempt + 1);
      }
      return null;
    }
    
    // 4. Log only real, persistent errors
    console.warn("[UserContext] Profile fetch warning:", error.message || error);
    return null;
  }

  return data as Profile;
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [organization, setOrganization] = useState<OrganizationSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    let mounted = true;

    const handleUserAndProfile = async (sessionUser: User | null) => {
      if (!mounted) return;
      
      setUser(sessionUser);
      if (sessionUser) {
        // Fetch profile if not already loaded or if user changed
        const p = await fetchProfile(supabase, sessionUser.id);
        if (mounted) setProfile(p);
        if (p?.organization_id) {
          const { data: org } = await supabase
            .from("organizations")
            .select("id, name, timezone, settings, spesen_rate_partial, spesen_rate_full")
            .eq("id", p.organization_id)
            .maybeSingle();
          if (mounted) setOrganization((org as OrganizationSettings) ?? null);
        }
      } else {
        if (mounted) {
          setProfile(null);
          setOrganization(null);
        }
      }
      if (mounted) setIsLoading(false);
    };

    // 1. Initial Load
    supabase.auth.getUser().then(({ data: { user: sessionUser } }: { data: { user: User | null } }) => {
      handleUserAndProfile(sessionUser);
    }).catch((err: Error) => {
       if (mounted) setIsLoading(false);
    });

    // 2. Auth State Sync
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: string, session: Session | null) => {
        if (event === 'SIGNED_OUT') {
           handleUserAndProfile(null);
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
           handleUserAndProfile(session?.user ?? null);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setOrganization(null);
  };

  const refreshUser = async () => {
    if (user) {
      const p = await fetchProfile(supabase, user.id);
      setProfile(p);
    }
  };

  // Priority Mapping: Always prefer DB Profile role as the Source of Truth
  // Sync logic with middleware.ts
  const rawRole = (profile?.role || "technician").toLowerCase();
  let role: UserRole = "technician";

  if (rawRole === "administrator" || rawRole === "admin") role = "admin";
  else if (rawRole === "dispatcher" || rawRole === "disponent") role = "dispatcher";
  else if (rawRole === "technician") role = "technician";
  else if (rawRole === "manager") role = "manager";
  else if (rawRole === "viewer") role = "viewer";
  else role = "technician"; // Fallback to technician for unknown roles

  const isAdmin = role === "admin";
  const isDispatcher = role === "dispatcher";
  const isEmployee = role === "technician";
  const spesenRates = useMemo(() => resolveSpesenRates(organization), [organization]);
  const surchargeRules = useMemo(() => resolveSurchargeRules(organization?.settings ?? null), [organization]);

  return (
    <UserContext.Provider
      value={{ 
        user, 
        profile, 
        role, 
        isAdmin, 
        isDispatcher, 
        isEmployee, 
        isLoading, 
        organization,
        spesenRates,
        surchargeRules,
        signOut,
        refreshUser 
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}