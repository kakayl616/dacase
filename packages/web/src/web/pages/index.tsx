import { useLocation } from "wouter";
import { Shield, ArrowRight, Lock, Zap, MessageSquare } from "lucide-react";

export default function Index() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-[#1e1f22] flex items-center justify-center px-4">
      <div className="text-center max-w-lg">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-[#5865F2] mb-6">
          <Shield className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-[#f2f3f5] mb-3">Discord Case Platform</h1>
        <p className="text-[#949ba4] mb-8 leading-relaxed">
          Internal enforcement case management system. Admin access required to generate and manage case pages.
        </p>

        <div className="grid grid-cols-3 gap-3 mb-8 text-left">
          {[
            { icon: Lock, label: "Secure Admin", desc: "Protected panel" },
            { icon: Zap, label: "Real-time Chat", desc: "Live messaging" },
            { icon: MessageSquare, label: "Case Pages", desc: "Per-user pages" },
          ].map((f) => (
            <div key={f.label} className="bg-[#2b2d31] border border-[#3f4147] rounded-lg p-3">
              <f.icon className="w-5 h-5 text-[#5865F2] mb-2" />
              <p className="text-[#f2f3f5] text-xs font-semibold">{f.label}</p>
              <p className="text-[#949ba4] text-xs">{f.desc}</p>
            </div>
          ))}
        </div>

        <button
          onClick={() => navigate("/admin")}
          className="inline-flex items-center gap-2 bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold px-6 py-3 rounded-[3px] transition-colors"
        >
          Go to Admin Panel <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
