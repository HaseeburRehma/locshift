// lib/user-context.tsx
"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import type { Profile, UserRole } from "@/lib/types";

interface UserContextType {
  user: User | null;
  profile: Profile | null;
  role: UserRole;
  isAdmin: boolean;
  isDispatcher: boolean;
  isEmployee: boolean;
  isLoading: boolean;
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
      } else {
        if (mounted) setProfile(null);
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
  };

  const refreshUser = async () => {
    if (user) {
      const p = await fetchProfile(supabase, user.id);
      setProfile(p);
    }
  };

  // Priority Mapping: Always prefer DB Profile role as the Source of Truth
  // Sync logic with middleware.ts
  const rawRole = (profile?.role || "employee").toLowerCase();
  let role: UserRole = "employee";

  if (rawRole === "administrator" || rawRole === "admin") role = "admin";
  else if (rawRole === "dispatcher" || rawRole === "disponent") role = "dispatcher";
  else role = "employee";

  const isAdmin = role === "admin";
  const isDispatcher = role === "dispatcher";
  const isEmployee = role === "employee";

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