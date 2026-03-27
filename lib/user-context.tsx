// lib/user-context.tsx
"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { Profile, UserRole } from "@/lib/types";
import { ROLE_PERMISSIONS } from "@/lib/types";

interface UserContextType {
  user: User | null;
  profile: Profile | null;
  role: UserRole;
  permissions: typeof ROLE_PERMISSIONS[UserRole];
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const defaultPermissions = {
  canManageLeads: false,
  canManageTechnicians: false,
  canManageJobs: false,
  canSendMessages: false,
  canRunAgents: false,
  canViewReports: false,
  canManageUsers: false,
};

const UserContext = createContext<UserContextType>({
  user: null,
  profile: null,
  role: "viewer",
  permissions: defaultPermissions,
  isLoading: true,
  signOut: async () => { },
});

// ─── single reusable fetch ────────────────────────────────────────────────────
async function fetchProfile(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")          // select * so every field in Profile is present
    .eq("id", userId)
    .single();

  if (error) {
    console.error("[UserContext] Profile fetch error:", {
      code: error.code,
      message: error.message,
    });
    if (error.code === "42P17") {
      console.error(
        "[UserContext] CRITICAL: Infinite recursion in RLS policy. " +
        "Run the fix SQL in Supabase dashboard."
      );
    }
    return null;
  }

  return data as Profile;
}
// ─────────────────────────────────────────────────────────────────────────────

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    // Initial load
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user ?? null);

      if (user) {
        const p = await fetchProfile(supabase, user.id);
        setProfile(p);
      }

      setIsLoading(false);
    };

    init();

    // Auth state changes (login / logout / token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const sessionUser = session?.user ?? null;
        setUser(sessionUser);

        if (sessionUser) {
          const p = await fetchProfile(supabase, sessionUser.id);
          setProfile(p);
        } else {
          setProfile(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [supabase]);

  const signOut = async () => {
    await supabase.auth.signOut();
    // Clear the cached role cookie
    document.cookie = 'user-role=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    setUser(null);
    setProfile(null);
  };

  const role: UserRole = profile?.role ?? "viewer";
  const permissions = ROLE_PERMISSIONS[role] ?? ROLE_PERMISSIONS.viewer;

  useEffect(() => {
    if (!isLoading) {
      console.log("[UserContext] Resolved:", {
        userId: user?.id,
        role,
        email: profile?.email,
      });
    }
  }, [user, profile, role, isLoading]);

  return (
    <UserContext.Provider
      value={{ user, profile, role, permissions, isLoading, signOut }}
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