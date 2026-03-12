"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Calendar,
    BarChart3,
    Settings,
    Zap,
    ChevronLeft,
    Youtube,
    Wand2,
    User,
    Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
    { href: "/dashboard",            label: "Dashboard",   icon: LayoutDashboard },
    { href: "/studio",               label: "Studio",      icon: Wand2 },
    { href: "/youtube",              label: "YouTube",     icon: Youtube },
    { href: "/calendar",             label: "Calendar",    icon: Calendar },
    { href: "/analytics",            label: "Analytics",   icon: BarChart3 },
    { href: "/activity",             label: "Activity",    icon: Activity },
    { href: "/brand",                label: "Profile",     icon: User },
    { href: "/settings/connections", label: "Connections", icon: Settings },
];

interface SidebarProps {
    collapsed?: boolean;
    onToggle?: () => void;
}

export default function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
    const pathname = usePathname();
    const [linkedInStatus, setLinkedInStatus] = useState<boolean | null>(null);

    useEffect(() => {
        fetch("/api/settings/connections")
            .then(res => res.json())
            .then(data => {
                setLinkedInStatus(data?.linkedin?.status === "active");
            })
            .catch(() => {});
    }, []);

    return (
        <aside
            className={cn(
                "fixed left-0 top-0 h-screen bg-sidebar-bg border-r border-sidebar-border flex flex-col z-40 transition-all duration-300",
                collapsed ? "w-[68px]" : "w-[240px]"
            )}
        >
            {/* Logo */}
            <div className="flex items-center gap-3 px-4 h-[60px] border-b border-sidebar-border shrink-0">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
                    <Zap size={16} className="text-primary-foreground" />
                </div>
                {!collapsed && (
                    <div className="overflow-hidden">
                        <h1 className="text-sm font-semibold text-foreground leading-tight truncate">
                            AutoPilot
                        </h1>
                        <p className="text-[10px] text-muted-foreground leading-tight">AI Content Platform</p>
                    </div>
                )}
                {!collapsed && onToggle && (
                    <button
                        onClick={onToggle}
                        className="ml-auto p-1 rounded-md hover:bg-muted text-muted-foreground transition-colors"
                    >
                        <ChevronLeft size={14} />
                    </button>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-3 px-2.5 space-y-0.5 overflow-y-auto">
                {!collapsed && <p className="section-title mt-1 mb-2">Menu</p>}
                {navItems.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "sidebar-link",
                                isActive && "active",
                                collapsed && "justify-center px-2"
                            )}
                            title={collapsed ? item.label : undefined}
                        >
                            <Icon size={18} className="shrink-0" />
                            {!collapsed && <span>{item.label}</span>}
                        </Link>
                    );
                })}
            </nav>

            {/* Connection Status */}
            <div className={cn("px-4 pb-6 shrink-0", collapsed && "px-2 pb-4 flex justify-center")}>
                <div className="flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full shrink-0", linkedInStatus ? "bg-green-500" : "bg-red-400")} />
                    {!collapsed && (
                        <span className="text-xs font-medium text-muted-foreground">
                            {linkedInStatus === null ? "Checking..." : linkedInStatus ? "LinkedIn Connected" : "LinkedIn Error"}
                        </span>
                    )}
                </div>
            </div>
        </aside>
    );
}
