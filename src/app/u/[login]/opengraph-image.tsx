import { ImageResponse } from "next/og";
import { getCardStats } from "@/lib/public-profile";

export const alt = "GitSpark profile card";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BG = "#111111";
const FG = "#eeeeee";
const MUTED = "#8a8a8a";
const GREEN = "#4ade80";
const LINE = "#2a2a2a";

/**
 * The card people see when they paste their profile link into Slack, X or
 * LinkedIn.
 *
 * Satori rules that bite here: flexbox only (no grid, no CSS variables), any
 * element with more than one child needs an explicit display, and every text
 * child must be a string. A bare number child throws "expected <div> to have
 * explicit display", so numbers are wrapped in String().
 */
export default async function Image({ params }: { params: Promise<{ login: string }> }) {
  const { login } = await params;
  const s = await getCardStats(login);

  if (!s) {
    return new ImageResponse(
      (
        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: BG, color: MUTED, fontSize: 40 }}>
          GitSpark
        </div>
      ),
      size,
    );
  }

  const peak = Math.max(1, ...s.recent);

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: BG, color: FG, padding: 56 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          {s.avatar ? (
            <img src={s.avatar} alt="" width={88} height={88} style={{ borderRadius: 88 }} />
          ) : null}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 46, fontWeight: 600, letterSpacing: -1 }}>{s.name ?? s.login}</div>
            <div style={{ fontSize: 28, color: MUTED, marginTop: 4 }}>{`@${s.login}`}</div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 22, height: 22, background: GREEN, borderRadius: 4, transform: "rotate(45deg)" }} />
            <div style={{ fontSize: 28, color: MUTED }}>GitSpark</div>
          </div>
        </div>

        {/* Headline number */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: 18, marginTop: 40 }}>
          <div style={{ fontSize: 150, fontWeight: 700, lineHeight: 1, color: GREEN, letterSpacing: -5 }}>{String(s.currentStreak)}</div>
          <div style={{ fontSize: 36, color: MUTED, paddingBottom: 18 }}>day streak</div>
        </div>

        {/* Activity strip: last 26 weeks, one bar per day */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 76, marginTop: 32 }}>
          {s.recent.map((n, i) => (
            <div
              key={i}
              style={{
                width: 4,
                height: Math.max(3, Math.round((n / peak) * 76)),
                background: n === 0 ? LINE : GREEN,
                opacity: n === 0 ? 1 : 0.35 + Math.min(0.65, (n / peak) * 0.65),
                borderRadius: 2,
              }}
            />
          ))}
        </div>

        {/* Stat row */}
        <div style={{ display: "flex", gap: 64, marginTop: "auto", borderTop: `1px solid ${LINE}`, paddingTop: 26 }}>
          <Stat label="Longest streak" value={`${s.longestStreak}`} />
          <Stat label="Level" value={`${s.level}`} />
          <Stat label="XP" value={s.xp.toLocaleString()} />
          <Stat label="Active days" value={`${s.activeDays365}`} />
          {s.grade ? <Stat label="Repo grade" value={s.grade.letter} accent /> : null}
        </div>
      </div>
    ),
    size,
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ fontSize: 22, color: MUTED }}>{label}</div>
      <div style={{ fontSize: 46, fontWeight: 600, marginTop: 4, color: accent ? GREEN : FG }}>{value}</div>
    </div>
  );
}
