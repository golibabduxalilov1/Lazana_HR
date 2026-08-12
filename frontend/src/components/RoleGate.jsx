import { useAuth } from "../context/AuthContext";

export function RoleGate({ roles, children }) {
  const { role } = useAuth();
  if (!roles.includes(role)) return null;
  return children;
}
