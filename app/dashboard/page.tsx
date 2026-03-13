"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Dashboard } from "@/components/dashboard/dashboard";
import { useUser } from "@/lib/user-context";
import { Spinner } from "@/components/ui/spinner";
import { Zap } from "lucide-react";

export default function Home() {
  const { user, isLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary animate-pulse">
          <Zap className="h-5 w-5 text-primary-foreground" />
        </div>
        <Spinner className="h-6 w-6 text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return <Dashboard />;
}
