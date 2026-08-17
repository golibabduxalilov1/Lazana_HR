import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import { ConfirmProvider } from "./context/ConfirmContext";
import { I18nProvider } from "./context/I18nContext";
import { PrivateRoute } from "./components/PrivateRoute";
import { Layout } from "./components/Layout";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Applications from "./pages/Applications";
import ApplicationDetail from "./pages/ApplicationDetail";
import Positions from "./pages/Positions";
import Texts from "./pages/Texts";
import Admins from "./pages/Admins";
import AuditLogs from "./pages/AuditLogs";
import NotFound from "./pages/NotFound";

const ALL_ROLES = ["super_admin", "admin", "hr"];
const ADMIN_ROLES = ["super_admin", "admin"];

export default function App() {
  return (
    <I18nProvider>
      <ToastProvider>
        <ConfirmProvider>
          <BrowserRouter>
            <AuthProvider>
              <Routes>
                <Route path="/login" element={<Login />} />

                <Route element={<PrivateRoute roles={ALL_ROLES} />}>
                  <Route element={<Layout />}>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/applications" element={<Applications />} />
                    <Route path="/applications/:id" element={<ApplicationDetail />} />
                    <Route path="/positions" element={<Positions />} />
                    <Route path="/texts" element={<Texts />} />

                    {/* Xodimlar (Administratsiya) faqat admin/super_admin uchun — HR bu yerga kira
                        olmaydi. Lavozimlar/Matnlar HR uchun faqat ko'rish rejimida ochiq
                        (tahrirlash tugmalari sahifa ichida RoleGate bilan yashirilgan). */}
                    <Route element={<PrivateRoute roles={ADMIN_ROLES} />}>
                      <Route path="/admins" element={<Admins />} />
                      <Route path="/logs" element={<AuditLogs />} />
                    </Route>
                  </Route>
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
            </AuthProvider>
          </BrowserRouter>
        </ConfirmProvider>
      </ToastProvider>
    </I18nProvider>
  );
}
