/**
 * Every page in the app, defined once: its name, icon, who can open it, where it sits in the
 * navigation and which tabs it gets on phones. The sidebar, the phone tab bar, the command palette,
 * the top bar title and role access all read from here, so a page can't be called one thing in the
 * sidebar and another in the palette, and nobody is offered a page they can't open.
 */
import type React from "react";
import {
  BarChart3,
  BookOpen,
  CalendarCheck,
  CalendarDays,
  Database,
  Film,
  Flame,
  Laptop,
  Layers,
  MessageSquare,
  NotebookPen,
  Server,
  ShieldCheck,
  Users,
  Video,
  Zap,
  Award,
} from "lucide-react";
import type { UserRole } from "../types";
import type { AppPage } from "./appRoutes";

export type ViewId = AppPage;
export type Role = UserRole;
export type ViewGroup = "Class" | "Learning" | "Insights" | "Admissions" | "Operations" | "Family";

export interface ViewDef {
  id: ViewId;
  /** The page's one name, everywhere */
  label: string;
  /** Shorter name for the phone tab bar */
  short: string;
  /** One line for the command palette and page headers */
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  group: ViewGroup;
  roles: Role[];
  /** Phone tab bar position per role (1–4); views without one live behind "More" */
  tab?: Partial<Record<Role, number>>;
  /** Shows class content (video, notes, materials): copy/print protection applies */
  classContent?: boolean;
  /** Same page, different job for a role (e.g. auditors observe the live class) */
  roleLabel?: Partial<Record<Role, string>>;
}

const STAFF: Role[] = ["instructor", "auditor", "sales_rep", "admin"];

export const VIEWS: ViewDef[] = [
  {
    id: "parent_home",
    label: "My children",
    short: "Children",
    description: "Attendance, progress, notes and remarks for your children",
    icon: Users,
    group: "Family",
    roles: ["parent"],
    tab: { parent: 1 },
    classContent: true,
  },
  {
    id: "classroom",
    label: "Live class",
    short: "Class",
    description: "Join or run the live class",
    icon: Video,
    group: "Class",
    roles: ["student", ...STAFF],
    tab: { student: 1, instructor: 1, auditor: 2, sales_rep: 4, admin: 1 },
    classContent: true,
    roleLabel: { auditor: "Observe live class" },
  },
  {
    id: "recordings",
    label: "Recordings",
    short: "Recordings",
    description: "Watch finished classes with their transcripts",
    icon: Film,
    group: "Class",
    roles: STAFF,
    classContent: true,
  },
  {
    id: "notebook",
    label: "Class notes",
    short: "Notes",
    description: "AI notes from your classes; ask questions about any class",
    icon: NotebookPen,
    group: "Class",
    roles: ["student", "instructor", "admin", "parent"],
    tab: { student: 3, instructor: 4, parent: 2 },
    classContent: true,
  },
  {
    id: "attendance",
    label: "Attendance",
    short: "Attendance",
    description: "Who joined, who was late, who left early",
    icon: CalendarCheck,
    group: "Class",
    roles: ["instructor", "auditor", "admin"],
    tab: { instructor: 2, auditor: 3 },
  },
  {
    id: "facilitators",
    label: "Teaching schedule",
    short: "Schedule",
    description: "Teachers, their classes and availability",
    icon: CalendarDays,
    group: "Class",
    roles: ["instructor", "sales_rep", "admin"],
    tab: { instructor: 3 },
  },
  {
    id: "materials",
    label: "Library",
    short: "Library",
    description: "Course materials, available offline",
    icon: BookOpen,
    group: "Learning",
    roles: ["student", "instructor", "admin"],
    tab: { student: 4 },
    classContent: true,
  },
  {
    id: "social",
    label: "Campus feed",
    short: "Feed",
    description: "School news and community posts",
    icon: MessageSquare,
    group: "Learning",
    roles: ["student", "instructor", "sales_rep", "admin"],
    tab: { student: 2 },
  },
  {
    id: "blockchain",
    label: "Certificates",
    short: "Certificates",
    description: "Verifiable course certificates",
    icon: Award,
    group: "Learning",
    roles: ["student", "auditor", "admin"],
  },
  {
    id: "analytics",
    label: "Class analytics",
    short: "Analytics",
    description: "Quality, occupancy, duration and attendance by teacher, room, time, cohort and more",
    icon: BarChart3,
    group: "Insights",
    roles: ["auditor", "admin"],
    tab: { auditor: 1, admin: 2 },
  },
  {
    id: "device_audit",
    label: "Device access",
    short: "Devices",
    description: "Which devices may join classes, requests and the access log",
    icon: ShieldCheck,
    group: "Insights",
    roles: STAFF,
    tab: { auditor: 4, admin: 4 },
  },
  {
    id: "sales_hub",
    label: "Admissions hub",
    short: "Admissions",
    description: "Leads, demo bookings and follow-ups",
    icon: Zap,
    group: "Admissions",
    roles: ["sales_rep", "admin"],
    tab: { sales_rep: 1, admin: 3 },
  },
  {
    id: "room_bomber",
    label: "Pitch rooms",
    short: "Pitches",
    description: "One-to-one counselling rooms",
    icon: Flame,
    group: "Admissions",
    roles: ["sales_rep", "admin"],
    tab: { sales_rep: 2 },
  },
  {
    id: "crm",
    label: "CRM sync",
    short: "CRM",
    description: "Rooms created from CRM bookings",
    icon: Database,
    group: "Admissions",
    roles: ["sales_rep", "admin"],
    tab: { sales_rep: 3 },
  },
  {
    id: "remote_access",
    label: "Remote devices",
    short: "Remote",
    description: "Control class devices from another screen",
    icon: Laptop,
    group: "Operations",
    roles: ["instructor", "admin"],
  },
  {
    id: "admin",
    label: "Automation",
    short: "Automation",
    description: "Scheduled jobs and school-wide settings",
    icon: Layers,
    group: "Operations",
    roles: ["admin"],
  },
  {
    id: "selfhosted",
    label: "Self-hosting",
    short: "Hosting",
    description: "Run the platform on your own servers",
    icon: Server,
    group: "Operations",
    roles: ["admin"],
  },
];

const BY_ID = new Map(VIEWS.map((v) => [v.id, v]));
const GROUP_ORDER: ViewGroup[] = ["Family", "Insights", "Class", "Learning", "Admissions", "Operations"];

export const viewDef = (id: string) => BY_ID.get(id as ViewId);

/** The name of a page for this role. */
export function viewLabel(id: string, role: string) {
  const v = viewDef(id);
  return v ? v.roleLabel?.[role as Role] || v.label : id;
}

export function canOpen(role: string, id: string) {
  return Boolean(viewDef(id)?.roles.includes(role as Role));
}

export function viewsFor(role: string) {
  return VIEWS.filter((v) => v.roles.includes(role as Role));
}

/** Where a role lands after sign-in (and when they open a page they can't use). */
export function homeView(role: string): ViewId {
  if (role === "parent") return "parent_home";
  if (role === "sales_rep") return "sales_hub";
  if (role === "auditor") return "analytics";
  return "classroom";
}

/** Navigation sections for a role, in a fixed order. */
export function navSections(role: string) {
  const views = viewsFor(role);
  // A role's main work comes first: admissions staff see Admissions, auditors and admins Insights, everyone else Class
  const order: ViewGroup[] =
    role === "sales_rep"
      ? ["Admissions", "Class", "Insights", "Learning", "Operations"]
      : role === "auditor" || role === "admin"
      ? GROUP_ORDER
      : ["Family", "Class", "Learning", "Insights", "Admissions", "Operations"];
  return order.map((group) => ({ group, views: views.filter((v) => v.group === group) })).filter((s) => s.views.length);
}

/** Up to four phone tabs for a role; everything else is under "More". */
export function phoneTabs(role: string) {
  return viewsFor(role)
    .filter((v) => v.tab?.[role as Role])
    .sort((a, b) => a.tab![role as Role]! - b.tab![role as Role]!)
    .slice(0, 4);
}

export const isClassContent = (id: string) => Boolean(viewDef(id)?.classContent);
