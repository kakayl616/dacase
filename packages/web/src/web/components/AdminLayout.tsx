import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocation, Link } from "wouter";
import { getToken, clearToken, authHeaders } from "../lib/api";
import { LayoutDashboard, MessageSquare, LogOut, Shield, Menu, X, ChevronRight } from "lucide-react";

// Secret admin entrance — must match ADMIN_GATE in app.tsx.
// Login redirects (logout, expired session) send you here, not /admin.
const ADMIN_GATE = "bagadang";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [, navigate] = useLocation();
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // ── Scroll preservation ──────────────────────────────────────────────────
  // Inbox/dashboard auto-refresh every 5s. Each refresh re-renders the list
  // and the browser can lose the scroll position of <main>, yanking you away
  // from what you were reading. We remember the scroll position on every
  // scroll event and silently restore it after each re-render.
  const mainRef = useRef<HTMLElement>(null);
  const savedScroll = useRef(0);

  useLayoutEffect(() => {
    const el = mainRef.current;
    if (el && el.scrollTop !== savedScroll.current) {
      el.scrollTop = savedScroll.current;
    }
  });

  useEffect(() => {
    const token = getToken();
    if (!token) {
      navigate(`/${ADMIN_GATE}`);
      return;
    }
    // Verify token
    fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } }).then((res) => {
      if (!res.ok) {
        clearToken();
        navigate(`/${ADMIN_GATE}`);
      }
    });
  }, []);

  useEffect(() => {
    const fetchUnread = async () => {
      const res = await fetch("/api/inbox", { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        const total = (data.inbox || []).reduce((sum: number, item: any) => sum + item.unread, 0);
        setUnreadCount(total);
      }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    clearToken();
    navigate(`/${ADMIN_GATE}`);
  };

  const navItems = [
    { path: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { path: "/admin/inbox", label: "Inbox", icon: MessageSquare, badge: unreadCount },
  ];

  return (
    <div className="min-h-screen bg-[#1e1f22] flex">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-60 bg-[#2b2d31] border-r border-[#3f4147] flex flex-col transition-transform duration-300 lg:relative lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-[#3f4147]">
          <div className="w-8 h-8 rounded-lg bg-[#5865F2] flex items-center justify-center flex-shrink-0">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-[#f2f3f5] text-sm">Case Admin</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const active = location === item.path;
            return (
              <Link key={item.path} to={item.path}>
                <span
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-[3px] cursor-pointer transition-colors text-sm font-medium ${
                    active
                      ? "bg-[#5865F2]/20 text-[#5865F2]"
                      : "text-[#b5bac1] hover:bg-[#313338] hover:text-[#f2f3f5]"
                  }`}
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  {item.label}
                  {item.badge != null && item.badge > 0 && (
                    <span className="ml-auto bg-[#ed4245] text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {item.badge > 9 ? "9+" : item.badge}
                    </span>
                  )}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-[#3f4147]">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 rounded-[3px] w-full text-[#949ba4] hover:bg-[#ed4245]/10 hover:text-[#ed4245] transition-colors text-sm"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar mobile */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-4 bg-[#2b2d31] border-b border-[#3f4147]">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-[#b5bac1]">
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="w-6 h-6 rounded bg-[#5865F2] flex items-center justify-center">
            <Shield className="w-3 h-3 text-white" />
          </div>
          <span className="font-bold text-[#f2f3f5] text-sm">Case Admin</span>
        </div>

        {/* onScroll keeps savedScroll current; useLayoutEffect above restores
            it whenever a re-render (the 5s auto-refresh) makes the browser
            lose the position */}
        <main
          ref={mainRef}
          onScroll={(e) => { savedScroll.current = e.currentTarget.scrollTop; }}
          className="flex-1 overflow-auto"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
