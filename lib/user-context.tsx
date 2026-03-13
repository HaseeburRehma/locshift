"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { Profile, UserRole, ROLE_PERMISSIONS } from "@/lib/types";

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

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        setProfile(profileData);
      }

      setIsLoading(false);
    };

    fetchUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);

      if (session?.user) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();

        setProfile(profileData);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  const role: UserRole = profile?.role ?? "viewer";

  const rolePermissions = {
    admin: {
      canManageLeads: true,
      canManageTechnicians: true,
      canManageJobs: true,
      canSendMessages: true,
      canRunAgents: true,
      canViewReports: true,
      canManageUsers: true,
    },
    manager: {
      canManageLeads: true,
      canManageTechnicians: true,
      canManageJobs: true,
      canSendMessages: true,
      canRunAgents: true,
      canViewReports: true,
      canManageUsers: true,
    },
    dispatcher: {
      canManageLeads: true,
      canManageTechnicians: true,
      canManageJobs: true,
      canSendMessages: true,
      canRunAgents: true,
      canViewReports: true,
      canManageUsers: true,
    },
    technician: {
      canManageLeads: true,
      canManageTechnicians: true,
      canManageJobs: true,
      canSendMessages: true,
      canRunAgents: true,
      canViewReports: true,
      canManageUsers: true,
    },
    viewer: {
      canManageLeads: true,
      canManageTechnicians: true,
      canManageJobs: true,
      canSendMessages: true,
      canRunAgents: true,
      canViewReports: true,
      canManageUsers: true,
    },
  };

  const permissions = rolePermissions[role];

  return (
    <UserContext.Provider value={{ user, profile, role, permissions, isLoading, signOut }}>
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
