import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import LogoutButton from "./logout-button";
import UpgradeButton from "./upgrade-button";
import CancelButton from "./cancel-button";
import ResumeButton from "./resume-button";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Fallback: look up by customer_email if no subscription linked to user_id
  const activeSub = subscription?.status === "active" || subscription?.status === "scheduled_cancel"
    ? subscription
    : await (async () => {
        if (!user.email) return null;
        const { data } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("customer_email", user.email)
          .in("status", ["active", "scheduled_cancel"])
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (data) {
          await supabase
            .from("subscriptions")
            .update({ user_id: user.id })
            .eq("id", data.id);
        }
        return data;
      })();

  const hasAccess = activeSub?.status === "active" || activeSub?.status === "scheduled_cancel";
  const email = user.email ?? "";
  const displayName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    email.split("@")[0];
  const avatarUrl = user.user_metadata?.avatar_url;

  const statusLabel: Record<string, { text: string; color: string }> = {
    active: { text: "Active", color: "text-green-600" },
    scheduled_cancel: { text: "Cancels at period end", color: "text-orange-500" },
    inactive: { text: "Free Tier", color: "text-warm" },
    cancelled: { text: "Cancelled", color: "text-orange-500" },
    expired: { text: "Expired", color: "text-china-red" },
    past_due: { text: "Past Due", color: "text-china-red" },
  };

  const status = statusLabel[activeSub?.status ?? "inactive"] ?? statusLabel.inactive;

  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <h1
        className="text-2xl font-bold text-ink mb-8"
        style={{ fontFamily: "Georgia, serif" }}
      >
        Your Account
      </h1>

      {/* Profile section */}
      <div className="bg-white rounded-xl border border-sand p-6 mb-6">
        <div className="flex items-center gap-4">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-china-red text-white text-lg font-medium flex items-center justify-center">
              {email.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p className="font-semibold text-ink">{displayName}</p>
            <p className="text-sm text-warm">{email}</p>
          </div>
        </div>
      </div>

      {/* Subscription section */}
      <div className="bg-white rounded-xl border border-sand p-6 mb-6">
        <h2 className="font-semibold text-ink mb-4">Subscription</h2>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-warm">Status</p>
            <p className={`font-medium ${status.color}`}>{status.text}</p>
          </div>
          {hasAccess && activeSub?.expires_at && (
            <div className="text-right">
              <p className="text-sm text-warm">
                {activeSub.status === "scheduled_cancel" ? "Access until" : "Renews"}
              </p>
              <p className="text-sm text-ink">
                {new Date(activeSub.expires_at).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>

        {activeSub?.status === "active" && <CancelButton />}
        {activeSub?.status === "scheduled_cancel" && <ResumeButton />}
        {!hasAccess && <UpgradeButton />}
      </div>

      <div className="flex items-center justify-between">
        <LogoutButton />
      </div>
    </div>
  );
}
