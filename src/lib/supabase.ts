// Compatibility adapter: authentication is handled by Cloudflare Pages Functions.
type AuthListener = (event: string, session: null) => void;
export const isSupabaseConfigured = true;
export const supabase = {
  auth: {
    onAuthStateChange: (_listener: AuthListener) => ({ data: { subscription: { unsubscribe() {} } } }),
    getSession: async () => ({ data: { session: null }, error: null }),
    updateUser: async () => ({ error: new Error("Password recovery is managed by the site owner.") }),
    signOut: async () => {
      await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
      return { error: null };
    },
    signInWithPassword: async ({ password }: { email: string; password: string }) => {
      const response = await fetch("/api/auth/login", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ password }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) return { data: { user: null }, error: new Error(result.error || "Owner login failed.") };
      return { data: { user: { email: "owner@parbati-bhandar.local" } }, error: null };
    },
  },
};
