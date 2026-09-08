import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const AuthUserContext = createContext<User | null>(null);

// Mirrors the `_authenticated` route's `beforeLoad` guard: resolve the
// current Supabase user client-side and redirect to /auth when absent,
// otherwise make the user available to nested pages via context.
export function useAuthUser(): User {
  const user = useContext(AuthUserContext);
  if (!user) {
    throw new Error("useAuthUser must be used within a RequireAuth boundary");
  }
  return user;
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [state, setState] = useState<{ status: "loading" | "authed" | "anon"; user: User | null }>({
    status: "loading",
    user: null,
  });

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data, error }) => {
      if (cancelled) return;
      if (error || !data.user) {
        setState({ status: "anon", user: null });
      } else {
        setState({ status: "authed", user: data.user });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  if (state.status === "loading") return null;
  if (state.status === "anon") return <Navigate to="/auth" replace />;

  return <AuthUserContext.Provider value={state.user}>{children}</AuthUserContext.Provider>;
}
