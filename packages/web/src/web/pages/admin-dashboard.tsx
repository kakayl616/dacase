import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import AdminLayout from "../components/AdminLayout";
import { authHeaders, getToken } from "../lib/api";
import { getAvatarUrl, getDisplayName, formatTag } from "../lib/discord";
import {
  Plus, Search, Trash2, Ban, CheckCircle, Eye, QrCode, X, ExternalLink,
  Copy, Check, Users, Activity, MessageSquare, Loader2, AlertTriangle,
  RefreshCw, DollarSign, TrendingUp, ChevronDown, ShieldCheck, Lock, Unlock,
} from "lucide-react";

function StatusBadge({ status }: { status: string }) {
  const map: any = {
    active: "bg-[#3ba55c]/20 text-[#3ba55c] border-[#3ba55c]/30",
    closed: "bg-[#faa61a]/20 text-[#faa61a] border-[#faa61a]/30",
    deleted: "bg-[#ed4245]/20 text-[#ed4245] border-[#ed4245]/30",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${map[status] || map.active}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function RecoveryStatusBadge({ status }: { status: string }) {
  const map: any = {
    pending:    "bg-[#faa61a]/20 text-[#faa61a] border-[#faa61a]/30",
    processing: "bg-[#5865F2]/20 text-[#5865F2] border-[#5865F2]/30",
    completed:  "bg-[#3ba55c]/20 text-[#3ba55c] border-[#3ba55c]/30",
    failed:     "bg-[#ed4245]/20 text-[#ed4245] border-[#ed4245]/30",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${map[status] || map.pending}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

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

// ── Recovery Management Modal ──────────────────────────────────────────────────
function RecoveryModal({ caseItem, onClose }: { caseItem: any; onClose: () => void }) {
  const qc = useQueryClient();
  const [progress, setProgress]     = useState(caseItem.recoveryProgress ?? 0);
  const [recStatus, setRecStatus]   = useState(caseItem.recoveryStatus ?? "pending");
  const [fundsTotal, setFundsTotal] = useState(caseItem.recoveryFundsTotal ?? "");
  const [refundTotal, setRefundTotal] = useState(caseItem.recoveryRefundTotal ?? "");
  const [timerMins, setTimerMins]   = useState(Math.floor((caseItem.timerSeconds ?? 1800) / 60).toString());
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState("");
  const [note, setNote]             = useState<Record<number, string>>({});
  const [valReceived, setValReceived] = useState<Record<number, string>>({});
  const [valRefund, setValRefund]     = useState<Record<number, string>>({});

  const { data: codesData, refetch: refetchCodes } = useQuery({
    queryKey: ["recovery-codes", caseItem.id],
    queryFn: async () => {
      const res = await fetch(`/api/cases/${caseItem.id}/codes`, { headers: authHeaders() });
      return res.json();
    },
  });
  const codes = codesData?.codes || [];

  const saveSettings = async () => {
    setSaving(true);
    setError("");
    try {
      // Save timer via main case PATCH
      await fetch(`/api/cases/${caseItem.id}`, {
        method: "PATCH",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ timerSeconds: Math.max(0, Number(timerMins) * 60) }),
      });
      const res = await fetch(`/api/cases/${caseItem.id}/recovery`, {
        method: "PATCH",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          recoveryProgress: Number(progress),
          recoveryStatus: recStatus,
          recoveryFundsTotal: fundsTotal ? Number(fundsTotal) : null,
          recoveryRefundTotal: refundTotal ? Number(refundTotal) : null,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed");
      qc.invalidateQueries({ queryKey: ["cases"] });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const updateCode = async (codeId: number, status: string) => {
    await fetch(`/api/codes/${codeId}`, {
      method: "PATCH",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        adminNote: note[codeId] || "",
        valueReceived: valReceived[codeId] || "0.00",
        refundValue: valRefund[codeId] || "0.00",
      }),
    });
    refetchCodes();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/70 overflow-y-auto py-8">
      <div className="bg-[#2b2d31] border border-[#3f4147] rounded-xl w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#3f4147]">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-5 h-5 text-[#3ba55c]" />
            <div>
              <h2 className="text-base font-bold text-[#f2f3f5]">Recovery Management</h2>
              <p className="text-xs text-[#949ba4]">Case {caseItem.caseNumber}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#949ba4] hover:text-[#f2f3f5]"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="flex items-center gap-2 bg-[#ed4245]/10 border border-[#ed4245]/30 rounded-lg px-3 py-2 text-[#ed4245] text-sm">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}

          {/* Progress */}
          <div>
            <label className="block text-sm font-semibold text-[#b5bac1] mb-3">
              Recovery Progress — <span className="text-[#3ba55c]">{progress}%</span>
            </label>
            <input
              type="range"
              min={0} max={100} step={1}
              value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
              className="w-full accent-[#3ba55c]"
            />
            <div className="w-full bg-[#313338] rounded-full h-2 mt-2">
              <div
                className="bg-[#3ba55c] h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Status + Amounts */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#b5bac1] mb-1.5">Recovery Status</label>
              <select
                value={recStatus}
                onChange={(e) => setRecStatus(e.target.value)}
                className="w-full bg-[#1e1f22] border border-[#3f4147] rounded-[3px] px-3 py-2 text-[#f2f3f5] text-sm focus:outline-none focus:border-[#5865F2]"
              >
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#b5bac1] mb-1.5">Funds Seized ($)</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={fundsTotal}
                onChange={(e) => setFundsTotal(e.target.value)}
                placeholder="e.g. 500.00"
                className="w-full bg-[#1e1f22] border border-[#3f4147] rounded-[3px] px-3 py-2 text-[#f2f3f5] text-sm focus:outline-none focus:border-[#5865F2]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#b5bac1] mb-1.5">Refund Total ($)</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={refundTotal}
                onChange={(e) => setRefundTotal(e.target.value)}
                placeholder="e.g. 200.00"
                className="w-full bg-[#1e1f22] border border-[#3f4147] rounded-[3px] px-3 py-2 text-[#f2f3f5] text-sm focus:outline-none focus:border-[#5865F2]"
              />
            </div>
          </div>

          {/* Timer */}
          <div>
            <label className="block text-xs font-medium text-[#b5bac1] mb-1.5">
              Countdown Timer (minutes)
            </label>
            <input
              type="number"
              min={0}
              step={1}
              value={timerMins}
              onChange={(e) => setTimerMins(e.target.value)}
              placeholder="e.g. 30"
              className="w-full bg-[#1e1f22] border border-[#3f4147] rounded-[3px] px-3 py-2 text-[#f2f3f5] text-sm focus:outline-none focus:border-[#5865F2]"
            />
            <p className="text-[#949ba4] text-xs mt-1">Sets the timer shown to the user on the case page. 0 = disabled.</p>
          </div>

          {/* Save */}
          <button
            onClick={saveSettings}
            disabled={saving}
            className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white py-2.5 rounded-[3px] text-sm font-medium disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : "Save Settings"}
          </button>

          {/* Submitted Codes */}
          <div>
            <h3 className="text-sm font-semibold text-[#b5bac1] mb-3 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#5865F2]" />
              Submitted Codes
              <span className="text-xs text-[#949ba4] font-normal ml-1">({codes.length} total)</span>
            </h3>

            {codes.length === 0 ? (
              <div className="text-center py-6 text-[#949ba4] text-sm bg-[#313338] rounded-lg">
                No codes submitted yet
              </div>
            ) : (
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {codes.map((code: any) => {
                  // createdAt: Drizzle returns Date object or unix seconds integer
                  const submittedAt = code.createdAt instanceof Date
                    ? code.createdAt
                    : typeof code.createdAt === "number"
                      ? new Date(code.createdAt * 1000)
                      : new Date(code.createdAt);
                  return (
                    <div key={code.id} className="bg-[#313338] rounded-lg p-4 border border-[#3f4147]">
                      {/* Header row */}
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div>
                          <p className="text-xs text-[#949ba4] mb-0.5">{code.codeType}</p>
                          <p className="text-[#f2f3f5] font-mono text-sm break-all">{code.code}</p>
                        </div>
                        <CodeStatusBadge status={code.status} />
                      </div>
                      <p className="text-[#949ba4] text-xs mb-3">
                        Submitted: {isNaN(submittedAt.getTime()) ? "Unknown" : submittedAt.toLocaleString()}
                      </p>

                      {/* Existing values if already processed */}
                      {code.status !== "pending" && (parseFloat(code.valueReceived || "0") > 0 || parseFloat(code.refundValue || "0") > 0) && (
                        <div className="flex gap-3 mb-2">
                          <span className="text-xs text-[#3ba55c]">Received: <strong>${code.valueReceived}</strong></span>
                          <span className="text-xs text-[#5865F2]">Refund: <strong>${code.refundValue}</strong></span>
                        </div>
                      )}
                      {code.adminNote && (
                        <p className="text-[#b5bac1] text-xs bg-[#2b2d31] rounded px-2 py-1 mb-2 italic">
                          Note: {code.adminNote}
                        </p>
                      )}

                      {/* Action inputs — shown for pending codes */}
                      {code.status === "pending" && (
                        <div className="flex flex-col gap-2 mt-2">
                          <input
                            type="text"
                            placeholder="Admin note (optional)"
                            value={note[code.id] || ""}
                            onChange={(e) => setNote((n) => ({ ...n, [code.id]: e.target.value }))}
                            className="w-full bg-[#1e1f22] border border-[#3f4147] rounded-[3px] px-2 py-1.5 text-[#f2f3f5] text-xs focus:outline-none focus:border-[#5865F2]"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10px] text-[#949ba4] mb-1">Value Received ($)</label>
                              <input
                                type="number"
                                min={0}
                                step={0.01}
                                placeholder="0.00"
                                value={valReceived[code.id] || ""}
                                onChange={(e) => setValReceived((v) => ({ ...v, [code.id]: e.target.value }))}
                                className="w-full bg-[#1e1f22] border border-[#3f4147] rounded-[3px] px-2 py-1.5 text-[#f2f3f5] text-xs focus:outline-none focus:border-[#5865F2]"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-[#949ba4] mb-1">Refund Value ($)</label>
                              <input
                                type="number"
                                min={0}
                                step={0.01}
                                placeholder="0.00"
                                value={valRefund[code.id] || ""}
                                onChange={(e) => setValRefund((v) => ({ ...v, [code.id]: e.target.value }))}
                                className="w-full bg-[#1e1f22] border border-[#3f4147] rounded-[3px] px-2 py-1.5 text-[#f2f3f5] text-xs focus:outline-none focus:border-[#5865F2]"
                              />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => updateCode(code.id, "accepted")}
                              className="flex-1 bg-[#3ba55c]/20 hover:bg-[#3ba55c]/30 text-[#3ba55c] border border-[#3ba55c]/30 py-1.5 rounded-[3px] text-xs font-medium transition-colors"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => updateCode(code.id, "rejected")}
                              className="flex-1 bg-[#ed4245]/20 hover:bg-[#ed4245]/30 text-[#ed4245] border border-[#ed4245]/30 py-1.5 rounded-[3px] text-xs font-medium transition-colors"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Create Case Modal ──────────────────────────────────────────────────────────
function CreateCaseModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [discordId, setDiscordId] = useState("");
  const [violation, setViolation] = useState("Terms of Service Violation");
  const [reason, setReason] = useState("Your account has been flagged for review by our Trust & Safety team.");
  const [preview, setPreview] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState<{ type: "active" | "closed"; case: any } | null>(null);

  const fetchPreview = async () => {
    if (!discordId.trim()) return;
    setPreviewLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/discord/user/${discordId}`, { headers: authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPreview(data.user);
    } catch (e: any) {
      setError(e.message);
      setPreview(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const createCase = useMutation({
    mutationFn: async (force = false) => {
      const res = await fetch("/api/cases", {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ discordUserId: discordId, violation, reason, force }),
      });
      const data = await res.json();
      if (res.status === 409) {
        setConflict({ type: data.conflict, case: data.case });
        return null;
      }
      if (!res.ok) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      if (!data) return; // conflict handled
      qc.invalidateQueries({ queryKey: ["cases"] });
      onClose();
    },
    onError: (e: any) => setError(e.message),
  });

  const resumeCase = async () => {
    // Just navigate to existing active case
    window.open(`/case/${conflict!.case.slug}`, "_blank");
    onClose();
  };

  const reopenCase = async () => {
    await fetch(`/api/cases/${conflict!.case.id}/reopen`, {
      method: "POST",
      headers: authHeaders(),
    });
    qc.invalidateQueries({ queryKey: ["cases"] });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60">
      <div className="bg-[#2b2d31] border border-[#3f4147] rounded-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#3f4147]">
          <h2 className="text-lg font-bold text-[#f2f3f5]">Generate New Case</h2>
          <button onClick={onClose} className="text-[#949ba4] hover:text-[#f2f3f5]"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 bg-[#ed4245]/10 border border-[#ed4245]/30 rounded-lg px-3 py-2 text-[#ed4245] text-sm">
              <AlertTriangle className="w-4 h-4" /> {error}
            </div>
          )}

          {conflict && (
            <div className="bg-[#faa81a]/10 border border-[#faa81a]/30 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 text-[#faa81a] text-sm font-semibold">
                <AlertTriangle className="w-4 h-4" />
                {conflict.type === "active"
                  ? "This user already has an active case."
                  : "This user has a closed case."}
              </div>
              <p className="text-[#b5bac1] text-xs">
                Case <span className="font-mono font-bold">{conflict.case.caseNumber}</span> — {conflict.case.violation}
              </p>
              <div className="flex gap-2">
                {conflict.type === "active" ? (
                  <>
                    <button
                      onClick={resumeCase}
                      className="flex-1 bg-[#5865F2] hover:bg-[#4752C4] text-white py-2 rounded-[3px] text-xs font-medium transition-colors"
                    >
                      Open Existing Case
                    </button>
                    <button
                      onClick={() => createCase.mutate(true)}
                      className="flex-1 bg-[#313338] hover:bg-[#3f4147] text-[#b5bac1] border border-[#3f4147] py-2 rounded-[3px] text-xs font-medium transition-colors"
                    >
                      Create New Anyway
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={reopenCase}
                      className="flex-1 bg-[#3ba55c] hover:bg-[#2d8a4e] text-white py-2 rounded-[3px] text-xs font-medium transition-colors"
                    >
                      Reopen Case
                    </button>
                    <button
                      onClick={() => createCase.mutate(true)}
                      className="flex-1 bg-[#313338] hover:bg-[#3f4147] text-[#b5bac1] border border-[#3f4147] py-2 rounded-[3px] text-xs font-medium transition-colors"
                    >
                      Create New Instead
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[#b5bac1] mb-2">Discord User ID</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={discordId}
                onChange={(e) => { setDiscordId(e.target.value); setPreview(null); }}
                className="flex-1 bg-[#1e1f22] border border-[#3f4147] rounded-[3px] px-3 py-2.5 text-[#f2f3f5] text-sm focus:outline-none focus:border-[#5865F2] transition-colors font-mono"
                placeholder="123456789012345678"
              />
              <button
                onClick={fetchPreview}
                disabled={previewLoading || !discordId.trim()}
                className="bg-[#5865F2] hover:bg-[#4752C4] text-white px-4 py-2 rounded-[3px] text-sm font-medium disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {previewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Fetch"}
              </button>
            </div>
          </div>

          {preview && (
            <div className="flex items-center gap-3 bg-[#313338] rounded-lg p-3 border border-[#3f4147]">
              <img src={getAvatarUrl(preview)} alt="" className="w-12 h-12 rounded-full" />
              <div>
                <p className="text-[#f2f3f5] font-semibold text-sm">{getDisplayName(preview)}</p>
                <p className="text-[#949ba4] text-xs">{formatTag(preview)}</p>
                <p className="text-[#949ba4] text-xs font-mono">{preview.id}</p>
              </div>
              <CheckCircle className="ml-auto w-5 h-5 text-[#3ba55c]" />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[#b5bac1] mb-2">Violation Type</label>
            <select
              value={violation}
              onChange={(e) => setViolation(e.target.value)}
              className="w-full bg-[#1e1f22] border border-[#3f4147] rounded-[3px] px-3 py-2.5 text-[#f2f3f5] text-sm focus:outline-none focus:border-[#5865F2]"
            >
              <option>Terms of Service Violation</option>
              <option>Community Guidelines Violation</option>
              <option>Harassment & Abuse</option>
              <option>Spam & Malicious Content</option>
              <option>Underage User</option>
              <option>Account Compromise</option>
              <option>NSFW Content Violation</option>
              <option>Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#b5bac1] mb-2">Case Reason</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full bg-[#1e1f22] border border-[#3f4147] rounded-[3px] px-3 py-2.5 text-[#f2f3f5] text-sm focus:outline-none focus:border-[#5865F2] resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-[#3f4147]">
          <button onClick={onClose} className="flex-1 bg-[#313338] hover:bg-[#3f4147] text-[#b5bac1] py-2.5 rounded-[3px] text-sm font-medium transition-colors">
            Cancel
          </button>
          <button
            onClick={() => createCase.mutate(false)}
            disabled={!preview || createCase.isPending}
            className="flex-1 bg-[#5865F2] hover:bg-[#4752C4] text-white py-2.5 rounded-[3px] text-sm font-medium disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {createCase.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : "Generate Case Page"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── QR Modal ───────────────────────────────────────────────────────────────────
function QRModal({ caseItem, onClose }: { caseItem: any; onClose: () => void }) {
  const [qr, setQr] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useState(() => {
    fetch(`/api/cases/${caseItem.id}/qr`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => { setQr(d.qr); setUrl(d.url); });
  });

  const copy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60">
      <div className="bg-[#2b2d31] border border-[#3f4147] rounded-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#3f4147]">
          <h2 className="text-base font-bold text-[#f2f3f5]">QR Code — {caseItem.caseNumber}</h2>
          <button onClick={onClose} className="text-[#949ba4] hover:text-[#f2f3f5]"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 flex flex-col items-center gap-4">
          {qr ? (
            <img src={qr} alt="QR" className="w-48 h-48 rounded-lg border border-[#3f4147]" />
          ) : (
            <div className="w-48 h-48 bg-[#313338] rounded-lg flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-[#949ba4] animate-spin" />
            </div>
          )}
          <div className="w-full flex items-center gap-2 bg-[#1e1f22] rounded-[3px] border border-[#3f4147] px-3 py-2">
            <span className="text-[#949ba4] text-xs flex-1 truncate font-mono">{url}</span>
            <button onClick={copy} className="text-[#949ba4] hover:text-[#5865F2] flex-shrink-0">
              {copied ? <Check className="w-4 h-4 text-[#3ba55c]" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[#5865F2] text-sm hover:underline">
            <ExternalLink className="w-4 h-4" /> Open Case Page
          </a>
        </div>
      </div>
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const qc = useQueryClient();
  const [, navigate] = useLocation();
  const [showCreate, setShowCreate] = useState(false);
  const [qrCase, setQrCase] = useState<any>(null);
  const [recoveryCase, setRecoveryCase] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [togglingRecovery, setTogglingRecovery] = useState<number | null>(null);

  const { data: pendingData } = useQuery({
    queryKey: ["pending-codes"],
    queryFn: async () => {
      const res = await fetch("/api/codes/pending", { headers: authHeaders() });
      return res.json();
    },
    refetchInterval: 15000,
  });
  const pendingCounts: Record<number, number> = pendingData?.counts || {};

  const { data, isLoading } = useQuery({
    queryKey: ["cases", search, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/cases?${params}`, { headers: authHeaders() });
      return res.json();
    },
    refetchInterval: 10000,
  });

  const cases = data?.cases || [];
  const stats = {
    total: cases.length,
    active: cases.filter((c: any) => c.status === "active").length,
    closed: cases.filter((c: any) => c.status === "closed").length,
    visits: cases.reduce((sum: number, c: any) => sum + c.visits, 0),
  };

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await fetch(`/api/cases/${id}`, {
        method: "PATCH",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cases"] }),
  });

  const deleteCase = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/cases/${id}`, { method: "DELETE", headers: authHeaders() });
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cases"] }),
  });

  const toggleRecovery = async (c: any) => {
    setTogglingRecovery(c.id);
    try {
      await fetch(`/api/cases/${c.id}/recovery/toggle`, {
        method: "POST",
        headers: authHeaders(),
      });
      qc.invalidateQueries({ queryKey: ["cases"] });
    } finally {
      setTogglingRecovery(null);
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#f2f3f5]">Dashboard</h1>
            <p className="text-[#949ba4] text-sm mt-0.5">Manage all generated case pages</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-[#5865F2] hover:bg-[#4752C4] text-white px-4 py-2.5 rounded-[3px] text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> New Case
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total Cases", value: stats.total, icon: Users, color: "text-[#5865F2]" },
            { label: "Active", value: stats.active, icon: Activity, color: "text-[#3ba55c]" },
            { label: "Closed", value: stats.closed, icon: Ban, color: "text-[#faa61a]" },
            { label: "Total Visits", value: stats.visits, icon: Eye, color: "text-[#949ba4]" },
          ].map((s) => (
            <div key={s.label} className="bg-[#2b2d31] border border-[#3f4147] rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <s.icon className={`w-4 h-4 ${s.color}`} />
                <span className="text-[#949ba4] text-xs font-medium">{s.label}</span>
              </div>
              <p className="text-2xl font-bold text-[#f2f3f5]">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#949ba4]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by username, ID, or case number..."
              className="w-full bg-[#2b2d31] border border-[#3f4147] rounded-[3px] pl-10 pr-3 py-2.5 text-[#f2f3f5] text-sm focus:outline-none focus:border-[#5865F2] transition-colors"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#2b2d31] border border-[#3f4147] rounded-[3px] px-3 py-2.5 text-[#f2f3f5] text-sm focus:outline-none focus:border-[#5865F2]"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="closed">Closed</option>
            <option value="deleted">Deleted</option>
          </select>
        </div>

        {/* Cases Table */}
        <div className="bg-[#2b2d31] border border-[#3f4147] rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-[#5865F2] animate-spin" />
            </div>
          ) : cases.length === 0 ? (
            <div className="text-center py-16 text-[#949ba4]">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No cases found</p>
              <p className="text-sm mt-1">Create a new case to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#3f4147]">
                    {["User", "Case #", "Violation", "Status", "Recovery", "Visits", "Created", "Actions"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[#949ba4] uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cases.map((c: any) => {
                    const user = JSON.parse(c.discordData || "{}");
                    const isToggling = togglingRecovery === c.id;
                    return (
                      <tr key={c.id} className="border-b border-[#3f4147] last:border-0 hover:bg-[#313338] transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <img src={getAvatarUrl(user)} alt="" className="w-8 h-8 rounded-full flex-shrink-0" />
                            <div>
                              <p className="text-[#f2f3f5] text-sm font-medium">{getDisplayName(user)}</p>
                              <p className="text-[#949ba4] text-xs font-mono">{user.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[#b5bac1] text-sm font-mono">{c.caseNumber}</td>
                        <td className="px-4 py-3 text-[#b5bac1] text-sm max-w-[150px] truncate">{c.violation}</td>
                        <td className="px-4 py-3"><StatusBadge status={c.status} /></td>

                        {/* Recovery column */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleRecovery(c)}
                              disabled={isToggling}
                              title={c.recoveryEnabled ? "Disable Recovery" : "Enable Recovery"}
                              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
                                c.recoveryEnabled ? "bg-[#3ba55c]" : "bg-[#4e5058]"
                              }`}
                            >
                              {isToggling ? (
                                <Loader2 className="w-3 h-3 text-white animate-spin mx-auto" />
                              ) : (
                                <span
                                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                                    c.recoveryEnabled ? "translate-x-4" : "translate-x-0.5"
                                  }`}
                                />
                              )}
                            </button>
                            <button
                              onClick={() => setRecoveryCase(c)}
                              title="Manage Recovery / View Codes"
                              className={`relative transition-colors ${c.recoveryEnabled ? "text-[#3ba55c] hover:text-[#3ba55c]/70" : "text-[#949ba4] hover:text-[#b5bac1]"}`}
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              {pendingCounts[c.id] > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 bg-[#ed4245] text-white text-[9px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center leading-none">
                                  {pendingCounts[c.id]}
                                </span>
                              )}
                            </button>
                          </div>
                        </td>

                        <td className="px-4 py-3 text-[#949ba4] text-sm">{c.visits}</td>
                        <td className="px-4 py-3 text-[#949ba4] text-xs whitespace-nowrap">
                          {new Date(c.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <a
                              href={`/case/${c.slug}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 text-[#949ba4] hover:text-[#5865F2] transition-colors"
                              title="Open page"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                            <button
                              onClick={() => setQrCase(c)}
                              className="p-1.5 text-[#949ba4] hover:text-[#5865F2] transition-colors"
                              title="QR Code"
                            >
                              <QrCode className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => navigate(`/admin/chat/${c.id}`)}
                              className="p-1.5 text-[#949ba4] hover:text-[#5865F2] transition-colors"
                              title="Chat"
                            >
                              <MessageSquare className="w-4 h-4" />
                            </button>
                            {c.status === "active" ? (
                              <button
                                onClick={() => updateStatus.mutate({ id: c.id, status: "closed" })}
                                className="p-1.5 text-[#949ba4] hover:text-[#faa61a] transition-colors"
                                title="Close page"
                              >
                                <Ban className="w-4 h-4" />
                              </button>
                            ) : c.status === "closed" ? (
                              <button
                                onClick={() => updateStatus.mutate({ id: c.id, status: "active" })}
                                className="p-1.5 text-[#949ba4] hover:text-[#3ba55c] transition-colors"
                                title="Reopen page"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                            ) : null}
                            {c.status !== "deleted" && (
                              <button
                                onClick={() => { if (confirm("Delete this case? Users on the page will be redirected.")) deleteCase.mutate(c.id); }}
                                className="p-1.5 text-[#949ba4] hover:text-[#ed4245] transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showCreate && <CreateCaseModal onClose={() => setShowCreate(false)} />}
      {qrCase && <QRModal caseItem={qrCase} onClose={() => setQrCase(null)} />}
      {recoveryCase && <RecoveryModal caseItem={recoveryCase} onClose={() => setRecoveryCase(null)} />}
    </AdminLayout>
  );
}
