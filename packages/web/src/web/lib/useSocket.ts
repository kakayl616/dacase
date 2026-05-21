import { useEffect, useRef, useState } from "react";

// Simple polling-based real-time since Socket.IO requires a separate server
// We'll use SSE (Server-Sent Events) via polling for this managed stack
export function useCaseMessages(slug: string, enabled = true) {
  const [messages, setMessages] = useState<any[]>([]);
  const [caseId, setCaseId] = useState<number | null>(null);
  const intervalRef = useRef<any>(null);

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/case/${slug}/messages`);
      if (!res.ok) return;
      const data = await res.json();
      setMessages(data.messages || []);
      setCaseId(data.caseId);
    } catch {}
  };

  useEffect(() => {
    if (!enabled || !slug) return;
    fetchMessages();
    intervalRef.current = setInterval(fetchMessages, 2000);
    return () => clearInterval(intervalRef.current);
  }, [slug, enabled]);

  return { messages, caseId, refetch: fetchMessages };
}

export function useAdminMessages(caseId: number | null, token: string) {
  const [messages, setMessages] = useState<any[]>([]);
  const intervalRef = useRef<any>(null);

  const fetchMessages = async () => {
    if (!caseId || !token) return;
    try {
      const res = await fetch(`/api/cases/${caseId}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setMessages(data.messages || []);
    } catch {}
  };

  useEffect(() => {
    if (!caseId || !token) return;
    fetchMessages();
    intervalRef.current = setInterval(fetchMessages, 2000);
    return () => clearInterval(intervalRef.current);
  }, [caseId, token]);

  return { messages, refetch: fetchMessages };
}

export function useCaseStatus(slug: string) {
  const [status, setStatus] = useState<string>("active");
  const intervalRef = useRef<any>(null);

  useEffect(() => {
    if (!slug) return;
    const check = async () => {
      try {
        const res = await fetch(`/api/case/${slug}`);
        if (res.status === 410) {
          setStatus("deleted");
          window.location.href = "https://discord.com";
        } else if (res.ok) {
          const data = await res.json();
          const s = data.case?.status;
          if (s === "deleted") {
            window.location.href = "https://discord.com";
          } else {
            setStatus(s || "active");
          }
        }
      } catch {}
    };
    check();
    intervalRef.current = setInterval(check, 5000);
    return () => clearInterval(intervalRef.current);
  }, [slug]);

  return status;
}
