import React, { useState, useEffect } from "react";
import { useClassroom } from "../../context/ClassroomContext";
import { buildMeetingUrl, buildShortMeetingUrl } from "../../services/domainService";
import {
  Users,
  Send,
  Heart,
  MessageSquare,
  Share2,
  Sparkles,
  Calendar,
  Clock,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  GraduationCap,
  Award,
  Video,
  Code,
  Image as ImageIcon,
  Check,
  Copy,
  AlertTriangle,
  Flame,
  Globe,
  Radio,
  Bookmark,
  TrendingUp,
  Tag,
  Filter,
} from "lucide-react";
import { CampusPost, CampusComment, UpcomingClassSchedule } from "../../types";
import { inspectContentSafety } from "../../services/contentSafetyService";

export const CampusCommunityFeed: React.FC = () => {
  const {
    currentUser,
    currentRole,
    authenticatedUser,
    setActiveView,
    setRoomId,
    setRoomTitle,
    setIsDocsModalOpen,
  } = useClassroom();

  // Upcoming Schedule State
  const [upcomingClasses, setUpcomingClasses] = useState<UpcomingClassSchedule[]>([
    {
      id: "sch-1",
      title: "Quantum Mechanics & Superconducting Transmons",
      subject: "Quantum Physics",
      subjectCode: "phy",
      gradeLevel: 10,
      curriculum: "British Curriculum (BC)",
      teacherName: "Dr. Evelyn Vance",
      teacherAvatar: "#003872",
      roomSlug: "in-21kos-gr10-bc-phy-vance",
      shortUrl: buildShortMeetingUrl("8xN2pQ"),
      dayDate: "Today, Thursday Oct 9, 2026",
      timeSlot: "10:00 AM - 11:30 AM IST (UTC+5:30)",
      startsInSeconds: 840, // 14 mins
      category: "Live Lecture",
    },
    {
      id: "sch-2",
      title: "Inverse Kinematics & Closed-Loop Actuators",
      subject: "Applied Robotics",
      subjectCode: "rb",
      gradeLevel: 8,
      curriculum: "Learning Floww (21KLF)",
      teacherName: "Prof. Arjun Sharma",
      teacherAvatar: "#0082FF",
      roomSlug: "sg-21klf-gr8-rb-secA-sharma",
      shortUrl: buildShortMeetingUrl("3mK9sR"),
      dayDate: "Today, Thursday Oct 9, 2026",
      timeSlot: "12:00 PM - 01:30 PM SGT (UTC+8:00)",
      startsInSeconds: 4920, // 1h 22m
      category: "STEM Lab",
    },
    {
      id: "sch-3",
      title: "1:1 Cambridge IGCSE Admissions Counseling & Assessment",
      subject: "Admissions & Scholarship",
      subjectCode: "adm",
      gradeLevel: 10,
      curriculum: "Admissions Pitch (Room Bomber)",
      teacherName: "Director Vikram Malhotra",
      teacherAvatar: "#DC2626",
      roomSlug: "in-21kos-gr10-bc-sales-bomber",
      shortUrl: buildShortMeetingUrl("9pL4wE"),
      dayDate: "Today, Thursday Oct 9, 2026",
      timeSlot: "02:30 PM - 03:15 PM IST (UTC+5:30)",
      startsInSeconds: 12600, // 3h 30m
      category: "Admissions Counseling",
    },
  ]);

  // Real-Time Countdown Timer for Upcoming Schedule
  useEffect(() => {
    const timer = setInterval(() => {
      setUpcomingClasses((prev) =>
        prev.map((c) => ({
          ...c,
          startsInSeconds: Math.max(0, c.startsInSeconds - 1),
        }))
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatCountdown = (totalSeconds: number) => {
    if (totalSeconds <= 0) return "Class In Progress (Live Now)";
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hours > 0) {
      return `Starts in ${hours}h ${mins.toString().padStart(2, "0")}m ${secs.toString().padStart(2, "0")}s`;
    }
    return `Starts in ${mins.toString().padStart(2, "0")}m ${secs.toString().padStart(2, "0")}s`;
  };

  // Social Posts Feed State
  const [posts, setPosts] = useState<CampusPost[]>([
    {
      id: "post-1",
      authorId: "tch-vance",
      authorName: "Dr. Evelyn Vance",
      authorRole: "instructor",
      authorAvatar: "#003872",
      content:
        "Congratulations to Grade 10-A scholars for finishing Lab 04 on Two-Qubit Superconducting Entanglement! The live 3D Bloch sphere projections showed an astounding 99.8% fidelity. Problem sets are due Friday midnight.",
      category: "Academic Question",
      likes: 24,
      likedByMe: false,
      comments: [
        {
          id: "c-1",
          authorName: "Sophia Chen",
          text: "The z-axis dephasing visualization cleared up all my doubts, thank you Dr. Vance!",
          timestamp: "1 hour ago",
        },
        {
          id: "c-2",
          authorName: "Marcus Vance",
          text: "Calculated Hamiltonian eigenvalues match perfectly with the remote Python terminal.",
          timestamp: "45 mins ago",
        },
      ],
      safetyStatus: "approved",
      timestamp: "2 hours ago",
    },
    {
      id: "post-2",
      authorId: "stu-1",
      authorName: "Sophia Chen",
      authorRole: "student",
      authorAvatar: "#0082FF",
      content:
        "Excited to showcase my project for the 21K School Global Robotics Hackathon! Built an inverse kinematics closed-loop controller in Python with remote tablet stylus annotations. Check out the snippet below!",
      codeSnippet: "def inverse_kinematics(x, y, l1=1.0, l2=1.0):\n    cos_theta2 = (x**2 + y**2 - l1**2 - l2**2) / (2 * l1 * l2)\n    theta2 = np.arccos(cos_theta2)\n    theta1 = np.arctan2(y, x) - np.arctan2(l2*np.sin(theta2), l1 + l2*np.cos(theta2))\n    return theta1, theta2",
      category: "STEM Project",
      likes: 38,
      likedByMe: true,
      comments: [
        {
          id: "c-3",
          authorName: "Prof. Arjun Sharma",
          text: "Brilliant implementation Sophia, make sure to document the Jacobian singularity boundary!",
          timestamp: "30 mins ago",
        },
      ],
      safetyStatus: "approved",
      timestamp: "3 hours ago",
    },
    {
      id: "post-3",
      authorId: "admin-1",
      authorName: "Director Vikram Malhotra",
      authorRole: "admin",
      authorAvatar: "#DC2626",
      content:
        "Campus Advisory: 1:1 Room Bomber counseling breakouts are now active for upcoming Cambridge IGCSE and IB Diploma cohorts. Check the upcoming schedule above and click 'Join Class' to enter your session directly.",
      category: "Campus Announcement",
      likes: 19,
      likedByMe: false,
      comments: [],
      safetyStatus: "approved",
      timestamp: "5 hours ago",
    },
  ]);

  // Post Creator Form State
  const [postContent, setPostContent] = useState("");
  const [postCategory, setPostCategory] = useState<CampusPost["category"]>("STEM Project");
  const [postCode, setPostCode] = useState("");
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>("All");

  // Content Safety Alert State
  const [safetyViolation, setSafetyViolation] = useState<{
    show: boolean;
    reason: string;
    flaggedCategory: string;
  } | null>(null);

  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({ "post-1": true });

  // Fetch server posts on mount
  useEffect(() => {
    fetch("/api/social/posts")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setPosts(data);
        }
      })
      .catch(() => {});
  }, []);

  // Handle Post Creation with Content Safety Verification
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postContent.trim()) return;

    // 1. Client-Side Youth Content Safety Guard
    const inspection = inspectContentSafety(postContent);
    if (!inspection.isSafe) {
      setSafetyViolation({
        show: true,
        reason:
          inspection.violationReason ||
          "Content violates 21K School campus safety guidelines (18+, NSFW, adult, or harassment).",
        flaggedCategory: inspection.flaggedCategory || "adult_nsfw",
      });
      return;
    }

    const authorName = authenticatedUser?.name || currentUser.name || "Campus Scholar";
    const authorRole = authenticatedUser?.role || currentRole || "student";
    const authorAvatar = authenticatedUser?.avatarColor || "#0082FF";

    const newPost: CampusPost = {
      id: `post-${Date.now()}`,
      authorId: authenticatedUser?.id || "usr-current",
      authorName,
      authorRole,
      authorAvatar,
      content: inspection.sanitizedText || postContent.trim(),
      codeSnippet: postCode.trim() ? postCode.trim() : undefined,
      category: postCategory,
      likes: 0,
      likedByMe: false,
      comments: [],
      safetyStatus: "approved",
      timestamp: "Just now",
    };

    // Optimistically update
    setPosts((prev) => [newPost, ...prev]);
    setPostContent("");
    setPostCode("");
    setShowCodeInput(false);

    // Sync with backend
    try {
      const res = await fetch("/api/social/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorId: newPost.authorId,
          authorName: newPost.authorName,
          authorRole: newPost.authorRole,
          authorAvatar: newPost.authorAvatar,
          content: newPost.content,
          category: newPost.category,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        if (err.safetyFlag) {
          setSafetyViolation({
            show: true,
            reason: err.error,
            flaggedCategory: err.safetyFlag,
          });
          // Remove from local feed
          setPosts((prev) => prev.filter((p) => p.id !== newPost.id));
        }
      }
    } catch {}
  };

  // Toggle Post Like
  const handleLikePost = async (postId: string) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          const nextLiked = !p.likedByMe;
          return {
            ...p,
            likedByMe: nextLiked,
            likes: p.likes + (nextLiked ? 1 : -1),
          };
        }
        return p;
      })
    );

    try {
      await fetch(`/api/social/posts/${postId}/react`, { method: "POST" });
    } catch {}
  };

  // Add Comment with Content Safety Guard
  const handleAddComment = async (postId: string) => {
    const text = commentInputs[postId];
    if (!text || !text.trim()) return;

    // Safety check on comments
    const inspection = inspectContentSafety(text);
    if (!inspection.isSafe) {
      setSafetyViolation({
        show: true,
        reason:
          "Comment blocked: Contains adult, NSFW, or explicit wording prohibited in 21K School campus forums.",
        flaggedCategory: inspection.flaggedCategory || "adult_nsfw",
      });
      return;
    }

    const authorName = authenticatedUser?.name || currentUser.name || "Campus Scholar";
    const newComment: CampusComment = {
      id: `c-${Date.now()}`,
      authorName,
      text: inspection.sanitizedText || text.trim(),
      timestamp: "Just now",
    };

    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          return { ...p, comments: [...p.comments, newComment] };
        }
        return p;
      })
    );

    setCommentInputs((prev) => ({ ...prev, [postId]: "" }));

    try {
      await fetch(`/api/social/posts/${postId}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authorName, text: newComment.text }),
      });
    } catch {}
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(url);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const handleJoinClass = (schedule: UpcomingClassSchedule) => {
    setRoomId(schedule.roomSlug);
    setRoomTitle(schedule.title);
    setActiveView("classroom");
  };

  const filteredPosts =
    selectedFilter === "All"
      ? posts
      : posts.filter((p) => p.category === selectedFilter);

  return (
    <div className="flex-1 w-full h-full overflow-y-auto bg-canvas text-slate-100 font-sans p-3 md:p-6">
      <div className="max-w-6xl mx-auto flex flex-col gap-4 lg:gap-6">
        {/* ========================================================= */}
        {/* SECTION 1: PINNED UPCOMING SCHEDULE & INSTANT JOIN CLASS */}
        {/* ========================================================= */}
        <section className="bg-slate-900/70 rounded-2xl border border-white/10 shadow-sm p-4 md:p-5 relative overflow-hidden">
          {/* Subtle 21K Top Accent Bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-brand-navy via-brand-blue to-brand-yellow" />

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-white/5 pb-3 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-brand-navy flex items-center justify-center text-white shadow-xs">
                <Calendar className="w-5 h-5 text-brand-yellow" />
              </div>
              <div>
                <h2 className="text-base font-bold text-blue-300 flex items-center gap-2">
                  <span>Upcoming Scheduled Classes</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 text-2xs font-bold">
                    Live Sync Active
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Direct instant access to today's live lecture halls, STEM laboratories, and 1:1 admissions breakouts.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Platform Server:</span>
              <span className="px-2 py-0.5 rounded bg-white/[0.06] font-mono text-xs font-bold text-slate-200">
                21K Global Edge Mesh
              </span>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {upcomingClasses.map((item, idx) => {
              const isImminent = item.startsInSeconds <= 900; // <= 15m
              return (
                <div
                  key={item.id}
                  className={`rounded-xl border p-4 flex flex-col justify-between transition-all ${
                    idx === 0
                      ? "bg-gradient-to-b from-blue-500/15 to-slate-900 border-brand-blue/40 shadow-xs ring-1 ring-brand-blue/20"
                      : "bg-slate-900/70 border-white/10 hover:border-white/20 shadow-2xs"
                  }`}
                >
                  <div className="flex flex-col gap-2">
                    {/* Top Row: Category & Grade */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="px-2 py-0.5 rounded font-bold text-2xs uppercase tracking-wider bg-white/[0.06] text-slate-200">
                        {item.category}
                      </span>
                      <span className="font-mono text-2xs font-bold text-blue-300">
                        Grade {item.gradeLevel} · {item.curriculum.split(" ")[0]}
                      </span>
                    </div>

                    {/* Class Title */}
                    <h3 className="text-sm font-bold text-slate-100 line-clamp-2 leading-snug">
                      {item.title}
                    </h3>

                    {/* Facilitator & Date */}
                    <div className="flex items-center gap-2 text-xs text-slate-300">
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-white text-2xs font-bold shrink-0"
                        style={{ backgroundColor: item.teacherAvatar }}
                      >
                        {item.teacherName.charAt(0)}
                      </div>
                      <span className="font-medium truncate">{item.teacherName}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{item.timeSlot}</span>
                    </div>

                    {/* Live Dynamic Countdown Timer */}
                    <div
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold mt-1 ${
                        isImminent
                          ? "bg-amber-500/10 text-amber-300 border border-amber-500/30"
                          : "bg-white/[0.06] text-slate-200"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                        <span>Timer:</span>
                      </div>
                      <span className={isImminent ? "text-amber-200 font-extrabold" : ""}>
                        {formatCountdown(item.startsInSeconds)}
                      </span>
                    </div>
                  </div>

                  {/* Action Bar */}
                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/5">
                    <button
                      onClick={() => handleJoinClass(item)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-brand-navy hover:bg-brand-navy-ink text-white text-xs font-bold shadow-xs transition-colors cursor-pointer group"
                    >
                      <Video className="w-3.5 h-3.5 text-brand-yellow" />
                      <span>Join Class Now</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </button>

                    <button
                      onClick={() => handleCopyLink(item.shortUrl)}
                      className="p-2 rounded-xl border border-white/10 hover:bg-white/[0.05] text-slate-300 text-xs transition-colors cursor-pointer shrink-0"
                      title={`Copy Shortlink: ${item.shortUrl}`}
                    >
                      {copiedLink === item.shortUrl ? (
                        <Check className="w-3.5 h-3.5 text-emerald-300" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 2: MAIN SOCIAL FEED & SIDEBAR (LINKEDIN/FB STYLE) */}
        {/* ========================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT 2 COLUMNS: POST CREATOR & FEED STREAM */}
          <div className="lg:col-span-2 flex flex-col gap-5">
            {/* Post Creator Box */}
            <div className="bg-slate-900/70 rounded-2xl border border-white/10 shadow-sm p-4 md:p-5">
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-xs"
                  style={{
                    backgroundColor:
                      authenticatedUser?.avatarColor ||
                      (currentRole === "instructor" ? "#003872" : "#0082FF"),
                  }}
                >
                  {(authenticatedUser?.name || currentUser.name).charAt(0)}
                </div>

                <div className="flex-1 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-sm text-blue-300">
                        {authenticatedUser?.name || currentUser.name}
                      </span>
                      <span className="ml-2 px-2 py-0.5 rounded text-2xs font-bold uppercase tracking-wider bg-white/[0.06] text-slate-300">
                        {authenticatedUser?.role || currentRole}
                      </span>
                    </div>

                    {/* Safety Badge */}
                    <div
                      className="hidden sm:flex items-center gap-1 text-2xs font-medium text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30"
                      title="Youth protection guard: Strictly blocks 18+, adult, NSFW, explicit or abusive content."
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Safety Guard Active</span>
                    </div>
                  </div>

                  {/* Input Textarea */}
                  <textarea
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                    rows={3}
                    placeholder="Share an academic breakthrough, ask a STEM question, showcase a project..."
                    className="w-full text-sm text-slate-100 placeholder-slate-500 bg-white/[0.03] border border-white/10 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:bg-white transition-all resize-none"
                  />

                  {/* Optional Code Input */}
                  {showCodeInput && (
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                        <span>Python / LaTeX / Algorithm Snippet:</span>
                        <button
                          type="button"
                          onClick={() => setShowCodeInput(false)}
                          className="text-slate-400 hover:text-white"
                        >
                          Cancel
                        </button>
                      </div>
                      <textarea
                        value={postCode}
                        onChange={(e) => setPostCode(e.target.value)}
                        rows={3}
                        placeholder="# Paste code snippet or LaTeX formulas here..."
                        className="w-full font-mono text-xs text-slate-100 bg-slate-900 text-slate-100 rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-brand-blue resize-none"
                      />
                    </div>
                  )}

                  {/* Bottom Toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/5">
                    <div className="flex items-center gap-2">
                      {/* Category Selector */}
                      <select
                        value={postCategory}
                        onChange={(e) =>
                          setPostCategory(e.target.value as CampusPost["category"])
                        }
                        className="text-xs font-semibold bg-white/[0.06] text-slate-200 border border-white/10 rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer"
                      >
                        <option value="STEM Project">STEM Project</option>
                        <option value="Academic Question">Academic Question</option>
                        <option value="Campus Announcement">Campus Announcement</option>
                        <option value="Peer Study Group">Peer Study Group</option>
                        <option value="Research Paper">Research Paper</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => setShowCodeInput(!showCodeInput)}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                          showCodeInput
                            ? "bg-slate-800 text-white"
                            : "bg-white/[0.06] text-slate-300 hover:bg-white/10"
                        }`}
                      >
                        <Code className="w-3.5 h-3.5" />
                        <span>Code</span>
                      </button>
                    </div>

                    <button
                      onClick={handleCreatePost}
                      disabled={!postContent.trim()}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-blue hover:bg-brand-blue-strong disabled:opacity-40 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Post Update</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
              {["All", "STEM Project", "Academic Question", "Campus Announcement"].map(
                (filter) => (
                  <button
                    key={filter}
                    onClick={() => setSelectedFilter(filter)}
                    className={`px-3 py-1.5 rounded-full font-bold transition-colors cursor-pointer shrink-0 ${
                      selectedFilter === filter
                        ? "bg-brand-navy text-white shadow-xs"
                        : "bg-slate-900/70 text-slate-300 border border-white/10 hover:bg-white/[0.08]"
                    }`}
                  >
                    {filter}
                  </button>
                )
              )}
            </div>

            {/* Posts Stream */}
            <div className="flex flex-col gap-4">
              {filteredPosts.map((post) => (
                <article
                  key={post.id}
                  className="bg-slate-900/70 rounded-2xl border border-white/10 shadow-sm p-5 flex flex-col gap-3 hover:border-white/20 transition-colors"
                >
                  {/* Post Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-xs shrink-0"
                        style={{ backgroundColor: post.authorAvatar }}
                      >
                        {post.authorName.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-slate-100">
                            {post.authorName}
                          </h4>
                          <span
                            className={`px-2 py-0.5 rounded text-2xs font-bold uppercase tracking-wider ${
                              post.authorRole === "instructor"
                                ? "bg-brand-navy text-white"
                                : post.authorRole === "admin"
                                ? "bg-rose-500/10 text-rose-300"
                                : "bg-sky-500/10 text-sky-300"
                            }`}
                          >
                            {post.authorRole}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <span>{post.timestamp}</span>
                          <span>•</span>
                          <span className="text-brand-blue font-medium">
                            #{post.category.replace(/\s+/g, "")}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-slate-400">
                      <Bookmark className="w-4 h-4 hover:text-blue-300 cursor-pointer" />
                    </div>
                  </div>

                  {/* Post Text Content */}
                  <p className="text-sm text-slate-100 leading-relaxed whitespace-pre-line">
                    {post.content}
                  </p>

                  {/* Code Snippet Box */}
                  {post.codeSnippet && (
                    <div className="rounded-xl bg-slate-950 p-3.5 border border-slate-800 font-mono text-xs text-emerald-400 overflow-x-auto">
                      <pre>{post.codeSnippet}</pre>
                    </div>
                  )}

                  {/* Post Interaction Bar (LinkedIn Style) */}
                  <div className="flex items-center justify-between pt-3 border-t border-white/5 text-xs text-slate-300">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleLikePost(post.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                          post.likedByMe
                            ? "bg-rose-500/10 text-rose-300 font-bold"
                            : "hover:bg-white/[0.08]"
                        }`}
                      >
                        <Heart
                          className={`w-4 h-4 ${
                            post.likedByMe ? "fill-current text-rose-300" : ""
                          }`}
                        />
                        <span>{post.likes}</span>
                      </button>

                      <button
                        onClick={() =>
                          setOpenComments((prev) => ({
                            ...prev,
                            [post.id]: !prev[post.id],
                          }))
                        }
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/[0.08] transition-colors cursor-pointer"
                      >
                        <MessageSquare className="w-4 h-4 text-slate-400" />
                        <span>{post.comments.length} Comments</span>
                      </button>
                    </div>

                    <button
                      onClick={() => handleCopyLink(buildMeetingUrl(`post/${post.id}`))}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/[0.08] text-slate-400 transition-colors cursor-pointer"
                    >
                      {copiedLink === buildMeetingUrl(`post/${post.id}`) ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-300" />
                          <span className="text-emerald-300 font-bold">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Share2 className="w-4 h-4" />
                          <span>Share</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Expandable Comments Section */}
                  {openComments[post.id] && (
                    <div className="mt-2 pt-3 border-t border-white/5 flex flex-col gap-2.5 bg-slate-50/70 p-3 rounded-xl">
                      {/* Comments List */}
                      {post.comments.map((comm) => (
                        <div key={comm.id} className="flex items-start gap-2.5 text-xs">
                          <div className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center text-2xs font-bold text-slate-200 shrink-0">
                            {comm.authorName.charAt(0)}
                          </div>
                          <div className="flex-1 bg-slate-900/70 p-2.5 rounded-xl border border-white/10">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="font-bold text-slate-100">
                                {comm.authorName}
                              </span>
                              <span className="text-2xs text-slate-400">
                                {comm.timestamp}
                              </span>
                            </div>
                            <p className="text-slate-200">{comm.text}</p>
                          </div>
                        </div>
                      ))}

                      {/* Add Comment Input */}
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="text"
                          value={commentInputs[post.id] || ""}
                          onChange={(e) =>
                            setCommentInputs((prev) => ({
                              ...prev,
                              [post.id]: e.target.value,
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleAddComment(post.id);
                          }}
                          placeholder="Write a thoughtful comment..."
                          className="flex-1 text-xs bg-slate-900/70 border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand-blue"
                        />
                        <button
                          onClick={() => handleAddComment(post.id)}
                          disabled={!commentInputs[post.id]?.trim()}
                          className="px-3 py-2 rounded-lg bg-brand-navy hover:bg-brand-navy-ink disabled:opacity-40 text-white text-xs font-bold transition-colors cursor-pointer"
                        >
                          Send
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </div>

          {/* RIGHT 1 COLUMN: SIDEBAR WIDGETS (TRENDING, FACULTY, PORTAL QUICK JUMP) */}
          <div className="flex flex-col gap-5">
            {/* Widget 1: Campus Trending Topics */}
            <div className="bg-slate-900/70 rounded-2xl border border-white/10 p-4 shadow-sm flex flex-col gap-3">
              <h3 className="font-bold text-sm text-blue-300 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-brand-blue" />
                <span>Trending Academic Topics</span>
              </h3>
              <div className="flex flex-col gap-2 text-xs">
                {[
                  { tag: "#BlochSphereRotation", count: "142 discussions", category: "Quantum Physics" },
                  { tag: "#CambridgeIGCSE2026", count: "98 discussions", category: "Curriculum" },
                  { tag: "#GlobalRoboticsHackathon", count: "76 discussions", category: "STEM" },
                  { tag: "#RoomBomberAdmissions", count: "54 discussions", category: "Counseling" },
                  { tag: "#SurfaceCodeStabilizers", count: "39 discussions", category: "MIT Lab" },
                ].map((item) => (
                  <div
                    key={item.tag}
                    className="p-2 rounded-xl hover:bg-white/[0.05] transition-colors cursor-pointer border border-transparent hover:border-white/15"
                  >
                    <span className="font-bold text-slate-100 block">{item.tag}</span>
                    <span className="text-2xs text-slate-400">
                      {item.count} • {item.category}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Widget 2: Faculty On Duty Roster */}
            <div className="bg-slate-900/70 rounded-2xl border border-white/10 p-4 shadow-sm flex flex-col gap-3">
              <h3 className="font-bold text-sm text-blue-300 flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-brand-yellow" />
                <span>Faculty On Duty Today</span>
              </h3>
              <div className="flex flex-col gap-2.5 text-xs">
                {[
                  {
                    name: "Dr. Evelyn Vance",
                    subject: "Lead STEM Facilitator",
                    status: "in_class",
                    statusText: "Teaching Hall A",
                    color: "bg-emerald-500",
                  },
                  {
                    name: "Prof. Arjun Sharma",
                    subject: "Robotics & AI Lead",
                    status: "available",
                    statusText: "Ready for Substitute",
                    color: "bg-sky-500",
                  },
                  {
                    name: "Dr. Ananya Iyer",
                    subject: "Bio-Sciences & Math",
                    status: "available",
                    statusText: "Office Hours Active",
                    color: "bg-sky-500",
                  },
                  {
                    name: "Director Vikram Malhotra",
                    subject: "Admissions & Counseling",
                    status: "in_bomber",
                    statusText: "Room Bomber 1:1",
                    color: "bg-rose-500",
                  },
                ].map((f) => (
                  <div key={f.name} className="flex items-center justify-between p-2 rounded-xl bg-white/[0.03]">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${f.color}`} />
                      <div>
                        <span className="font-bold text-slate-100 block">{f.name}</span>
                        <span className="text-2xs text-slate-400">{f.subject}</span>
                      </div>
                    </div>
                    <span className="text-2xs font-mono font-bold text-slate-400 bg-slate-900/70 px-2 py-0.5 rounded border border-white/10">
                      {f.statusText}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Widget 3: Campus Child Safety & Youth Protection Charter */}
            <div className="bg-gradient-to-br from-brand-navy-deep to-brand-navy text-white rounded-2xl p-4 shadow-md flex flex-col gap-2.5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-brand-yellow" />
                <h4 className="font-bold text-sm">21K Campus Safety Guard</h4>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed">
                Zero-tolerance moderation strictly audits all text, images, code snippets, and comments against adult, NSFW, or 18+ content. Certified ISO-21001 & COPPA compliant.
              </p>
              <div className="flex items-center gap-2 pt-2 border-t border-white/10 text-2xs font-mono text-cyan-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Automated 24/7 Heuristic Inspection</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Safety Violation Modal Popup */}
      {safetyViolation?.show && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900/70 rounded-2xl max-w-md w-full border border-rose-500/30 shadow-2xl p-5 flex flex-col gap-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-300">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-6 h-6 text-rose-300" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-100">
                  Content Blocked by Campus Safety
                </h3>
                <span className="text-xs text-rose-300 font-mono font-bold uppercase">
                  Flag: {safetyViolation.flaggedCategory}
                </span>
              </div>
            </div>

            <div className="p-3 bg-rose-500/10 rounded-xl border border-rose-500/30 text-xs text-slate-200 leading-relaxed">
              {safetyViolation.reason}
            </div>

            <p className="text-2xs text-slate-400">
              21K School is an accredited global educational institution for grades K-12. Explicit, adult, NSFW, or inappropriate material is prohibited under the Student Honor Code.
            </p>

            <button
              onClick={() => setSafetyViolation(null)}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors cursor-pointer"
            >
              I Understand & Acknowledge
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
