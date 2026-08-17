import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function Layout() {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Topbar />
        <main className="app-content">
          <Outlet />
        </main>
        <footer className="app-footer">
          <a href="https://www.silknode.uz/" target="_blank" rel="noopener noreferrer">
            Powered by Silknode
          </a>
        </footer>
      </div>
    </div>
  );
}
