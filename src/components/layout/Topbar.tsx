"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Bell, Menu, LogOut, User, ChevronDown, Settings } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

function getInitials(name: string): string {
  return name.split(" ").map(p => p[0]).join("").toUpperCase().slice(0, 2);
}

interface TopbarProps {
  onMenuClick?: () => void;
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser({
          name: data.user.user_metadata?.full_name ?? data.user.email?.split("@")[0] ?? "User",
          email: data.user.email ?? "",
        });
      }
    });
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <header className="h-[60px] bg-card border-b border-border flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="lg:hidden btn-ghost p-2">
          <Menu size={18} />
        </button>
      </div>

      <div className="flex items-center gap-2">
        {/* User Menu */}
        <div className="relative" ref={userRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 btn-ghost pl-2 pr-2"
          >
            <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
              <span className="text-xs font-medium text-foreground">
                {user ? getInitials(user.name) : "?"}
              </span>
            </div>
            <span className="text-sm font-medium text-foreground hidden sm:block">
              {user?.name?.split(" ")[0] ?? ""}
            </span>
            <ChevronDown size={14} className="text-muted-foreground hidden sm:block" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-card border border-border rounded-xl shadow-lg animate-fade-in overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                  {user?.name}
                </p>
                <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                  {user?.email}
                </p>
              </div>
              <div className="py-1">
                <Link
                  href="/settings/connections"
                  className="flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                  onClick={() => setShowUserMenu(false)}
                >
                  <Settings size={14} /> Connections
                </Link>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 px-4 py-2 text-sm w-full text-left hover:bg-muted transition-colors"
                  style={{ color: "#DC2626" }}
                >
                  <LogOut size={14} /> Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
