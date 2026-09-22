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
      <div className="min-h-screen flex items-center justify-center bg-ground">
        <div className="w-7 h-7 border-[3px] border-rule-strong border-t-ink rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 2600,
          style: {
            borderRadius: "10px",
            fontWeight: 600,
            fontSize: "15px",
            background: "#17191c",
            color: "#fff",
            padding: "12px 16px",
          },
          success: { iconTheme: { primary: "#e08900", secondary: "#17191c" } },
          error:   { iconTheme: { primary: "#c3362c", secondary: "#17191c" } },
        }}
      />
      <main
        className={`min-h-screen w-full max-w-[480px] mx-auto bg-ground
                    sm:border-x sm:border-rule
                    ${isAuthed && !isPublic ? "pb-24" : ""}`}
      >
        {children}
      </main>
      {isAuthed && !isPublic && <BottomNav />}
    </>
  );
}
