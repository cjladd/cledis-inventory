"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { isLoggedIn } from "@/lib/auth";
import BottomNav from "@/components/BottomNav";
import { Toaster } from "react-hot-toast";

const PUBLIC_PATHS = ["/login"];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [ready,  setReady]  = useState(false);
  const [authed, setAuthed] = useState(false);

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  useEffect(() => {
    const loggedIn = isLoggedIn();
    setAuthed(loggedIn);
    setReady(true);

    if (!loggedIn && !isPublic) {
      router.replace("/login");
    } else if (loggedIn && pathname === "/login") {
      router.replace("/");
    }
  }, [pathname, isPublic, router]);

  if (!ready) {
    // Tiny loading state to prevent flash of unauthenticated content
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: { borderRadius: "12px", fontWeight: 500 },
          success: { style: { background: "#10b981", color: "#fff" } },
          error:   { style: { background: "#ef4444", color: "#fff" } },
        }}
      />
      <main className={`min-h-screen ${(authed || isPublic) && !isPublic ? "pb-20" : ""}`}>
        {children}
      </main>
      {authed && !isPublic && <BottomNav />}
    </>
  );
}
