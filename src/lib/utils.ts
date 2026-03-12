import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toString();
}

export function formatPercentage(value: number, showSign = true): string {
  const sign = showSign && value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}

export function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function getDayName(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "long" });
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    published: "bg-success text-accent-foreground",
    approved: "bg-info text-[#2C4A6B]",
    ready_to_post: "bg-success text-accent-foreground",
    needs_approval: "bg-warning text-[#6B5A2C]",
    generating: "bg-primary-muted text-primary",
    planned: "bg-muted text-muted-foreground",
    pending_visual: "bg-primary-muted text-primary",
    failed: "bg-danger text-[#6B2C2C]",
    skipped: "bg-muted text-muted-foreground",
  };
  return colors[status] || "bg-muted text-muted-foreground";
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    published: "Published",
    approved: "Approved",
    ready_to_post: "Ready",
    needs_approval: "Needs Approval",
    generating: "Generating",
    planned: "Planned",
    pending_visual: "Creating Visuals",
    failed: "Failed",
    skipped: "Skipped",
    content_generated: "Content Ready",
    visuals_generated: "Visuals Ready",
  };
  return labels[status] || status;
}
