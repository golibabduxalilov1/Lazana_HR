import { useAuth } from "../context/AuthContext";

export function RoleGate({ roles, children, fallback = null }) {
  const { role } = useAuth();
  if (!roles.includes(role)) return fallback;
  return children;
}
