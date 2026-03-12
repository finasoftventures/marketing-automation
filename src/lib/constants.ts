export const APP_NAME = "InvestorRaise AutoPilot";
export const APP_DESCRIPTION = "AI-Powered Social Media Manager";

export const INDUSTRIES = [
    "SaaS",
    "Fintech",
    "E-commerce",
    "Healthcare",
    "Education",
    "AI/ML",
    "Marketing",
    "Real Estate",
    "Marketplace",
    "Other",
] as const;

export const AUDIENCE_OPTIONS = [
    { id: "startup_founders", label: "Startup Founders" },
    { id: "entrepreneurs", label: "Entrepreneurs" },
    { id: "investors_vcs", label: "Investors / VCs" },
    { id: "tech_community", label: "Tech Community" },
    { id: "small_business", label: "Small Business Owners" },
    { id: "corporate", label: "Corporate Executives" },
    { id: "developers", label: "Developers" },
    { id: "general", label: "General Public" },
] as const;

export const DEFAULT_PILLARS = [
    { id: "tips", name: "tips_howto", label: "Tips & How-To's", description: "Practical advice for your audience", weight: 25, enabled: true },
    { id: "trends", name: "industry_trends", label: "Industry Trends & Data", description: "Market news, statistics, analysis", weight: 20, enabled: true },
    { id: "stories", name: "success_stories", label: "Success Stories", description: "Customer wins, case studies", weight: 25, enabled: true },
    { id: "product", name: "product_updates", label: "Product Updates", description: "New features, launches, improvements", weight: 15, enabled: true },
    { id: "behind", name: "behind_scenes", label: "Behind the Scenes", description: "Team, culture, process", weight: 0, enabled: false },
    { id: "hottakes", name: "hot_takes", label: "Hot Takes & Opinions", description: "Bold perspectives on industry", weight: 15, enabled: true },
    { id: "education", name: "educational", label: "Educational Content", description: "Deep dives, explainers, tutorials", weight: 0, enabled: false },
] as const;

export const DEFAULT_GUARDRAILS = [
    "Never mention competitor names directly",
    "Never make financial promises or guarantees",
    "Always include a call-to-action",
    "Don't discuss politics, religion, or controversy",
    "Stay factually accurate - don't invent statistics",
] as const;

export const AUTOMATION_MODES = [
    { value: "full_auto", label: "Full AutoPilot", description: "AI creates and publishes without asking. You get notified after publishing.", color: "success" },
    { value: "semi_auto", label: "Semi-AutoPilot", description: "AI creates everything but waits for your approval before publishing.", color: "warning" },
    { value: "manual", label: "Manual Mode", description: "AI only suggests topics and drafts. You write and publish manually.", color: "danger" },
] as const;

export const POSTING_FREQUENCIES = [
    { value: "3", label: "3 posts/week", days: ["monday", "wednesday", "friday"] },
    { value: "5", label: "5 posts/week (Recommended)", days: ["monday", "tuesday", "wednesday", "thursday", "friday"] },
    { value: "7", label: "7 posts/week", days: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] },
] as const;

export const KNOWLEDGE_TYPES = [
    "Product Update",
    "Feature",
    "Testimonial",
    "Blog Post",
    "Press Mention",
    "Company News",
    "Website Scan",
    "Other",
] as const;

export const NAV_ITEMS = [
    { href: "/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
    { href: "/calendar", label: "Calendar", icon: "Calendar" },
    { href: "/brand", label: "Brand", icon: "Palette" },
    { href: "/knowledge", label: "Knowledge", icon: "BookOpen" },
    { href: "/analytics", label: "Analytics", icon: "BarChart3" },
    { href: "/activity", label: "Activity", icon: "Activity" },
    { href: "/settings", label: "Settings", icon: "Settings" },
] as const;
