import { createContext, useContext, useMemo, useState, useCallback } from "react";
import { login as loginRequest } from "../services/auth";

const AuthContext = createContext(null);

function readStoredAuth() {
  const token = localStorage.getItem("lazana_token");
  const role = localStorage.getItem("lazana_role");
  const fullName = localStorage.getItem("lazana_full_name");
  if (!token || !role) return null;
  return { token, role, fullName };
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(readStoredAuth);

  const login = useCallback(async (phone, password) => {
    const data = await loginRequest(phone, password);
    localStorage.setItem("lazana_token", data.access_token);
    localStorage.setItem("lazana_role", data.role);
    localStorage.setItem("lazana_full_name", data.full_name || "");
    setAuth({ token: data.access_token, role: data.role, fullName: data.full_name });
    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("lazana_token");
    localStorage.removeItem("lazana_role");
    localStorage.removeItem("lazana_full_name");
    setAuth(null);
  }, []);

  const value = useMemo(
    () => ({
      isAuthenticated: !!auth,
      role: auth?.role || null,
      fullName: auth?.fullName || "",
      isSuperAdmin: auth?.role === "super_admin",
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
