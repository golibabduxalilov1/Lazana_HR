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
import NotFound from "./pages/NotFound";

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

                <Route element={<PrivateRoute roles={ADMIN_ROLES} />}>
                  <Route element={<Layout />}>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/applications" element={<Applications />} />
                    <Route path="/applications/:id" element={<ApplicationDetail />} />
                    <Route path="/positions" element={<Positions />} />
                    <Route path="/texts" element={<Texts />} />
                    <Route path="/admins" element={<Admins />} />
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
