import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import AdminLayout from "../components/AdminLayout";
import { authHeaders } from "../lib/api";
import { getAvatarUrl, getDisplayName } from "../lib/discord";
import { MessageSquare, Loader2, Circle } from "lucide-react";

export default function AdminInbox() {
  const [, navigate] = useLocation();

  const { data, isLoading } = useQuery({
    queryKey: ["inbox"],
    queryFn: async () => {
      const res = await fetch("/api/inbox", { headers: authHeaders() });
      return res.json();
    },
    refetchInterval: 5000,
  });

  const inbox = data?.inbox || [];

  return (
    <AdminLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#f2f3f5]">Inbox</h1>
          <p className="text-[#949ba4] text-sm mt-0.5">All active case conversations</p>
        </div>

        <div className="bg-[#2b2d31] border border-[#3f4147] rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-[#5865F2] animate-spin" />
            </div>
          ) : inbox.length === 0 ? (
            <div className="text-center py-16 text-[#949ba4]">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No conversations yet</p>
              <p className="text-sm mt-1">Messages from case pages will appear here</p>
            </div>
          ) : (
            <div className="divide-y divide-[#3f4147]">
              {inbox.map((item: any) => {
                const user = JSON.parse(item.case.discordData || "{}");
                const last = item.lastMessage;
                return (
                  <button
                    key={item.case.id}
                    onClick={() => navigate(`/admin/chat/${item.case.id}`)}
                    className="w-full flex items-center gap-4 px-5 py-4 hover:bg-[#313338] transition-colors text-left"
                  >
                    <div className="relative flex-shrink-0">
                      <img src={getAvatarUrl(user)} alt="" className="w-11 h-11 rounded-full" />
                      {item.unread > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#ed4245] text-white text-xs font-bold rounded-full flex items-center justify-center">
                          {item.unread > 9 ? "9+" : item.unread}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className={`text-sm font-semibold truncate ${item.unread > 0 ? "text-[#f2f3f5]" : "text-[#b5bac1]"}`}>
                          {getDisplayName(user)}
                        </p>
                        <span className="text-xs text-[#949ba4] flex-shrink-0">
                          {last ? new Date(last.createdAt * 1000).toLocaleDateString() : ""}
                        </span>
                      </div>
                      <p className="text-xs text-[#949ba4] mt-0.5 font-mono">{item.case.caseNumber}</p>
                      {last && (
                        <p className={`text-sm truncate mt-1 ${item.unread > 0 ? "text-[#b5bac1] font-medium" : "text-[#949ba4]"}`}>
                          {last.sender === "admin" ? "You: " : ""}{last.content || (last.fileUrl ? "📎 Attachment" : "")}
                        </p>
                      )}
                    </div>
                    {item.unread > 0 && <Circle className="w-2.5 h-2.5 text-[#5865F2] fill-[#5865F2] flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
