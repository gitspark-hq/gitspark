"use client";

import { useActionState } from "react";
import { saveSettings, type SettingsState } from "./actions";

type Props = {
  initial: { dailyGoal: number; timezone: string; reminderHour: number; remindersEnabled: boolean };
  timezones: string[];
};

const field =
  "h-8 rounded-md border border-input bg-background px-2.5 text-[13px] outline-none focus-visible:border-ring";

export function SettingsForm({ initial, timezones }: Props) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(saveSettings, {});

  return (
    <form action={action} className="divide-y divide-border">
      <Row label="Daily goal" hint="Contributions per day. Commits, PRs, reviews and issues all count, same as GitHub.">
        <input id="dailyGoal" name="dailyGoal" type="number" min={1} max={50} defaultValue={initial.dailyGoal} className={`${field} w-20`} />
      </Row>

      <Row label="Timezone" hint="Used only to time the reminder email.">
        <select id="timezone" name="timezone" defaultValue={initial.timezone} className={`${field} w-full max-w-xs`}>
          {timezones.map((tz) => (
            <option key={tz} value={tz}>{tz}</option>
          ))}
        </select>
      </Row>

      <Row label="Reminder" hint="One email, only on days your goal isn't met yet.">
        <div className="flex flex-wrap items-center gap-4">
          <select id="reminderHour" name="reminderHour" defaultValue={initial.reminderHour} className={`${field} w-24`}>
            {Array.from({ length: 24 }, (_, h) => (
              <option key={h} value={h}>
                {h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`}
              </option>
            ))}
          </select>
          <label className="flex cursor-pointer items-center gap-2 text-[13px]">
            <input name="remindersEnabled" type="checkbox" defaultChecked={initial.remindersEnabled} className="h-3.5 w-3.5 accent-foreground" />
            Enabled
          </label>
        </div>
      </Row>

      <div className="flex items-center gap-3 py-4">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-8 items-center rounded-md bg-foreground px-3 text-[13px] font-medium text-background hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Saving" : "Save"}
        </button>
        {state.ok ? <span className="text-[13px] text-success">Saved</span> : null}
        {state.error ? <span className="text-[13px] text-destructive">{state.error}</span> : null}
      </div>
    </form>
  );
}

function Row({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2 py-4 sm:grid-cols-[200px_1fr] sm:gap-6">
      <div>
        <label className="text-[13px] font-medium">{label}</label>
        <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">{hint}</p>
      </div>
      <div className="flex items-center">{children}</div>
    </div>
  );
}
