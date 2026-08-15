import { createContext, useContext, useMemo, useState, useCallback } from "react";
import { login as loginRequest } from "../services/auth";

const AuthContext = createContext(null);

// Decodes the JWT payload client-side purely for UI decisions (e.g. "is this my own row?").
// The server never trusts this — it re-derives identity from the verified token on every request.
function decodeAdminId(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload.sub != null ? String(payload.sub) : null;
  } catch {
    return null;
  }
}

function readStoredAuth() {
  const token = localStorage.getItem("lazana_token");
  const role = localStorage.getItem("lazana_role");
  const fullName = localStorage.getItem("lazana_full_name");
  const isEnvAdmin = localStorage.getItem("lazana_is_env_admin") === "true";
  if (!token || !role) return null;
  return { token, role, fullName, isEnvAdmin, adminId: decodeAdminId(token) };
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(readStoredAuth);

  const login = useCallback(async (phone, password) => {
    const data = await loginRequest(phone, password);
    localStorage.setItem("lazana_token", data.access_token);
    localStorage.setItem("lazana_role", data.role);
    localStorage.setItem("lazana_full_name", data.full_name || "");
    localStorage.setItem("lazana_is_env_admin", data.is_env_admin ? "true" : "false");
    setAuth({
      token: data.access_token,
      role: data.role,
      fullName: data.full_name,
      isEnvAdmin: !!data.is_env_admin,
      adminId: decodeAdminId(data.access_token),
    });
    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("lazana_token");
    localStorage.removeItem("lazana_role");
    localStorage.removeItem("lazana_full_name");
    localStorage.removeItem("lazana_is_env_admin");
    setAuth(null);
  }, []);

  const value = useMemo(
    () => ({
      isAuthenticated: !!auth,
      role: auth?.role || null,
      fullName: auth?.fullName || "",
      isSuperAdmin: auth?.role === "super_admin",
      isEnvSuperAdmin: !!auth?.isEnvAdmin,
      adminId: auth?.adminId || null,
      login,
      logout,
    }),
    [auth, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
