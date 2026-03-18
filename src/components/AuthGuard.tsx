"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import { Toaster } from "react-hot-toast";

const PUBLIC_PATHS = ["/login"];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const { status } = useSession();

  const isPublic    = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const isLoading   = status === "loading";
  const isAuthed    = status === "authenticated";

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthed && !isPublic) {
      router.replace("/login");
    } else if (isAuthed && pathname === "/login") {
      router.replace("/");
    }
  }, [isLoading, isAuthed, isPublic, pathname, router]);

  if (isLoading) {
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
      <main className={`min-h-screen ${isAuthed && !isPublic ? "pb-20" : ""}`}>
        {children}
      </main>
      {isAuthed && !isPublic && <BottomNav />}
    </>
  );
}
