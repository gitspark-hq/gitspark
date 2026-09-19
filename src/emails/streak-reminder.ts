type Props = {
  name: string;
  streak: number;
  hoursLeft: number;
  goal: number;
  doneToday: number;
  appUrl: string;
};

export function streakReminderSubject({ streak }: Pick<Props, "streak">) {
  return streak > 0
    ? `🔥 Your ${streak}-day streak ends tonight`
    : `Start a new GitHub streak today`;
}

export function streakReminderHtml(p: Props) {
  const remaining = Math.max(0, p.goal - p.doneToday);
  const headline =
    p.streak > 0
      ? `Your <strong>${p.streak}-day streak</strong> is at risk.`
      : `No streak yet — today's a good day to start one.`;
  return `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f6f8fa;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#1f2328">
  <div style="max-width:480px;margin:0 auto;background:#fff;border:1px solid #d0d7de;border-radius:12px;padding:32px">
    <div style="font-size:40px;line-height:1">🔥</div>
    <h1 style="font-size:22px;margin:16px 0 8px">Hey ${escapeHtml(p.name)},</h1>
    <p style="font-size:16px;line-height:1.5;margin:0 0 16px">${headline}</p>
    <p style="font-size:16px;line-height:1.5;margin:0 0 24px">
      You have about <strong>${p.hoursLeft} hour${p.hoursLeft === 1 ? "" : "s"}</strong> left
      and need <strong>${remaining} more contribution${remaining === 1 ? "" : "s"}</strong>
      (a commit, PR, review, or issue) to keep it alive.
    </p>
    <a href="${p.appUrl}/dashboard" style="display:inline-block;background:#1f883d;color:#fff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:8px">Open GitSpark</a>
    <p style="font-size:12px;color:#656d76;margin:32px 0 0">
      You're getting this because reminders are on. Turn them off in <a href="${p.appUrl}/settings" style="color:#656d76">Settings</a>.
    </p>
  </div>
</body></html>`;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
