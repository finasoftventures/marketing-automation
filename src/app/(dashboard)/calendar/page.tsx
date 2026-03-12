"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Wand2, Heart, MessageCircle } from "lucide-react";
import Link from "next/link";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

interface CalPost {
  id: string;
  topic: string;
  posted_at: string;
  likes: number;
  comments: number;
}

export default function CalendarPage() {
  const today = new Date();
  const [date, setDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [posts, setPosts] = useState<CalPost[]>([]);
  const [loading, setLoading] = useState(true);

  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  useEffect(() => {
    setLoading(true);
    fetch("/api/analytics/linkedin")
      .then(r => r.json())
      .then(d => { setPosts(d.posts ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const getPostsForDate = (day: number): CalPost[] => {
    const ds = `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    return posts.filter(p => p.posted_at?.startsWith(ds));
  };

  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({length: daysInMonth}, (_, i) => i + 1)];

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }} className="animate-fade-in">
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.75rem" }}>
        <div>
          <h1 style={{ fontSize:"1.25rem", fontWeight:600, color:"var(--foreground)" }}>Content Calendar</h1>
          <p style={{ fontSize:"0.875rem", color:"var(--muted-foreground)", marginTop:"0.25rem" }}>Your published post history</p>
        </div>
        <Link href="/studio" className="btn-primary" style={{ textDecoration:"none", fontSize:"0.875rem" }}>
          <Wand2 size={14} /> New Post
        </Link>
      </div>

      {/* Month nav */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:"1rem", marginBottom:"1.25rem" }}>
        <button className="btn-ghost" style={{ padding:"0.375rem 0.625rem" }} onClick={() => setDate(new Date(year, month-1, 1))}>
          <ChevronLeft size={16} />
        </button>
        <span style={{ fontWeight:600, fontSize:"0.9375rem", color:"var(--foreground)", minWidth:160, textAlign:"center" }}>
          {MONTHS[month]} {year}
        </span>
        <button className="btn-ghost" style={{ padding:"0.375rem 0.625rem" }} onClick={() => setDate(new Date(year, month+1, 1))}>
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Grid */}
      <div className="card" style={{ padding:0, overflow:"hidden" }}>
        {/* Day headers */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", borderBottom:"1px solid var(--border)" }}>
          {DAYS.map(d => (
            <div key={d} style={{ padding:"0.625rem", textAlign:"center", fontSize:"0.6875rem", fontWeight:600, color:"var(--muted-foreground)", textTransform:"uppercase", letterSpacing:"0.05em" }}>
              {d}
            </div>
          ))}
        </div>
        {/* Day cells */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)" }}>
          {cells.map((day, i) => {
            const dayPosts = day ? getPostsForDate(day) : [];
            const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
            return (
              <div key={i} style={{
                minHeight:90, padding:"0.5rem",
                borderRight: (i+1)%7 !== 0 ? "1px solid var(--border)" : "none",
                borderBottom: i < cells.length - 7 ? "1px solid var(--border)" : "none",
                background: !day ? "var(--muted)/20" : isToday ? "var(--sage-bg)" : "transparent",
              }}>
                {day && (
                  <>
                    <span style={{
                      display:"inline-flex", alignItems:"center", justifyContent:"center",
                      width:22, height:22, borderRadius:"50%",
                      fontSize:"0.75rem", fontWeight: isToday ? 700 : 400,
                      color: isToday ? "var(--foreground)" : "var(--muted-foreground)",
                      background: isToday ? "var(--sage)" : "transparent",
                    }}>
                      {day}
                    </span>
                    {dayPosts.map(p => (
                      <div key={p.id} style={{
                        marginTop:"0.25rem", padding:"0.25rem 0.375rem",
                        background:"var(--primary)", borderRadius:4,
                        fontSize:"0.6rem", color:"#fff", fontWeight:500,
                        overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
                      }}
                        title={p.topic}>
                        {p.topic || "Post"}
                      </div>
                    ))}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {loading && (
        <p style={{ textAlign:"center", fontSize:"0.8125rem", color:"var(--muted-foreground)", marginTop:"1rem" }}>
          Loading posts...
        </p>
      )}
    </div>
  );
}
