import { Route, Switch } from "wouter";
import AdminLogin from "./pages/admin-login";
import AdminDashboard from "./pages/admin-dashboard";
import AdminChat from "./pages/admin-chat";
import AdminInbox from "./pages/admin-inbox";
import CasePage from "./pages/case-page";
import { Provider } from "./components/provider";
import { AgentFeedback } from "@runablehq/website-runtime";

// Shared plain 404 — used for unknown URLs AND for the root page,
// so visitors hitting the bare domain see no site and no login link.
const notFound = (
  <div className="min-h-screen bg-[#1e1f22] flex items-center justify-center text-[#949ba4]">
    <div className="text-center">
      <p className="text-4xl font-bold text-[#f2f3f5] mb-2">404</p>
      <p>Page not found</p>
    </div>
  </div>
);

// Secret admin entrance — change this word to anything only you know.
// Your login page will live at bagadang.com/<this word>
const ADMIN_GATE = "bagadang";

function App() {
  return (
    <Provider>
      <Switch>
        {/* Root shows 404 — no homepage, no hint that admin exists */}
        <Route path="/">{notFound}</Route>

        {/* Public case pages — unchanged */}
        <Route path="/case/:slug" component={CasePage} />

        {/* Admin area — login only at the secret address */}
        <Route path={`/${ADMIN_GATE}`} component={AdminLogin} />
        <Route path="/admin/dashboard" component={AdminDashboard} />
        <Route path="/admin/inbox" component={AdminInbox} />
        <Route path="/admin/chat/:id" component={AdminChat} />

        {/* Everything else (including plain /admin) — 404 */}
        <Route>{notFound}</Route>
      </Switch>
      {import.meta.env.DEV && <AgentFeedback />}
    </Provider>
  );
}

export default App;