import { useState } from "react";
import { useLocation } from "wouter";
import { setToken } from "../lib/api";
import { Shield, Eye, EyeOff, AlertCircle } from "lucide-react";

export default function AdminLogin() {
  const [, navigate] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed");
      } else {
        setToken(data.token);
        navigate("/admin/dashboard");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1e1f22] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#5865F2] mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[#f2f3f5]">Discord Case Admin</h1>
          <p className="text-[#949ba4] text-sm mt-1">Secure admin access only</p>
        </div>

        {/* Card */}
        <div className="bg-[#2b2d31] border border-[#3f4147] rounded-xl p-8">
          <h2 className="text-lg font-semibold text-[#f2f3f5] mb-6">Sign in to Admin Panel</h2>

          {error && (
            <div className="flex items-center gap-2 bg-[#ed4245]/10 border border-[#ed4245]/30 rounded-lg px-4 py-3 mb-4 text-[#ed4245] text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#b5bac1] mb-2">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-[#1e1f22] border border-[#3f4147] rounded-[3px] px-3 py-2.5 text-[#f2f3f5] text-sm focus:outline-none focus:border-[#5865F2] transition-colors"
                placeholder="admin"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#b5bac1] mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#1e1f22] border border-[#3f4147] rounded-[3px] px-3 py-2.5 pr-10 text-[#f2f3f5] text-sm focus:outline-none focus:border-[#5865F2] transition-colors"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#949ba4] hover:text-[#b5bac1]"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white font-medium py-2.5 rounded-[3px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm mt-2"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="text-[#949ba4] text-xs text-center mt-4">
            Default: admin / admin123 (change in .env)
          </p>
        </div>
      </div>
    </div>
  );
}
