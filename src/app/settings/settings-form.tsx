"use client";

import { useActionState } from "react";
import { Bell, Check, Globe, Target } from "lucide-react";
import { saveSettings, type SettingsState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  initial: { dailyGoal: number; timezone: string; reminderHour: number; remindersEnabled: boolean };
  timezones: string[];
};

const selectCls =
  "h-9 rounded-md border border-input bg-white/[0.03] px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring";

export function SettingsForm({ initial, timezones }: Props) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(saveSettings, {});

  return (
    <form action={action} className="divide-y divide-border/60">
      <Row icon={<Target className="h-4 w-4" />} title="Daily goal" hint="Contributions per day — commits, PRs, reviews, or issues, same as GitHub's graph.">
        <Input id="dailyGoal" name="dailyGoal" type="number" min={1} max={50} defaultValue={initial.dailyGoal} className="w-24 bg-white/[0.03]" />
      </Row>

      <Row icon={<Globe className="h-4 w-4" />} title="Timezone" hint="Only used to decide when your reminder goes out.">
        <select id="timezone" name="timezone" defaultValue={initial.timezone} className={`${selectCls} w-full max-w-xs`}>
          {timezones.map((tz) => (
            <option key={tz} value={tz}>{tz}</option>
          ))}
        </select>
      </Row>

      <Row icon={<Bell className="h-4 w-4" />} title="Reminder" hint="Sent once a day, only if you haven't hit your goal yet.">
        <div className="flex flex-wrap items-center gap-3">
          <select id="reminderHour" name="reminderHour" defaultValue={initial.reminderHour} className={`${selectCls} w-28`}>
            {Array.from({ length: 24 }, (_, h) => (
              <option key={h} value={h}>
                {h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`}
              </option>
            ))}
          </select>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              name="remindersEnabled"
              type="checkbox"
              defaultChecked={initial.remindersEnabled}
              className="h-4 w-4 rounded border-input accent-primary"
            />
            Email me
          </label>
        </div>
      </Row>

      <div className="flex items-center gap-3 pt-5">
        <Button type="submit" disabled={pending} className="gap-2">
          {pending ? "Saving" : "Save changes"}
        </Button>
        {state.ok ? (
          <span className="inline-flex items-center gap-1 text-sm text-primary"><Check className="h-4 w-4" /> Saved</span>
        ) : null}
        {state.error ? <span className="text-sm text-destructive">{state.error}</span> : null}
      </div>
    </form>
  );
}

function Row({ icon, title, hint, children }: { icon: React.ReactNode; title: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-3 py-5 first:pt-0 sm:grid-cols-[220px_1fr] sm:gap-6">
      <div>
        <Label className="flex items-center gap-2 text-sm font-semibold">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-primary">{icon}</span>
          {title}
        </Label>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{hint}</p>
      </div>
      <div className="flex items-center">{children}</div>
    </div>
  );
}
