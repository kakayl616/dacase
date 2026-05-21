import { Route, Switch } from "wouter";
import Index from "./pages/index";
import AdminLogin from "./pages/admin-login";
import AdminDashboard from "./pages/admin-dashboard";
import AdminChat from "./pages/admin-chat";
import AdminInbox from "./pages/admin-inbox";
import CasePage from "./pages/case-page";
import { Provider } from "./components/provider";
import { AgentFeedback } from "@runablehq/website-runtime";

function App() {
  return (
    <Provider>
      <Switch>
        <Route path="/" component={Index} />
        <Route path="/admin" component={AdminLogin} />
        <Route path="/admin/dashboard" component={AdminDashboard} />
        <Route path="/admin/inbox" component={AdminInbox} />
        <Route path="/admin/chat/:id" component={AdminChat} />
        <Route path="/case/:slug" component={CasePage} />
        <Route>
          <div className="min-h-screen bg-[#1e1f22] flex items-center justify-center text-[#949ba4]">
            <div className="text-center">
              <p className="text-4xl font-bold text-[#f2f3f5] mb-2">404</p>
              <p>Page not found</p>
            </div>
          </div>
        </Route>
      </Switch>
      {import.meta.env.DEV && <AgentFeedback />}
    </Provider>
  );
}

export default App;
