"use client";

import { useActionState } from "react";
import { saveSettings, type SettingsState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  initial: { dailyGoal: number; timezone: string; reminderHour: number; remindersEnabled: boolean };
  timezones: string[];
};

export function SettingsForm({ initial, timezones }: Props) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(saveSettings, {});

  return (
    <form action={action} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="dailyGoal">Daily goal (contributions per day)</Label>
        <Input id="dailyGoal" name="dailyGoal" type="number" min={1} max={50} defaultValue={initial.dailyGoal} className="max-w-32" />
        <p className="text-xs text-muted-foreground">
          A contribution is a commit, PR, review, or issue — same as GitHub&apos;s graph.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="timezone">Timezone (for reminder timing)</Label>
        <select
          id="timezone"
          name="timezone"
          defaultValue={initial.timezone}
          className="h-9 w-full max-w-sm rounded-md border bg-background px-3 text-sm"
        >
          {timezones.map((tz) => (
            <option key={tz} value={tz}>{tz}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="reminderHour">Remind me at</Label>
        <select
          id="reminderHour"
          name="reminderHour"
          defaultValue={initial.reminderHour}
          className="h-9 w-32 rounded-md border bg-background px-3 text-sm"
        >
          {Array.from({ length: 24 }, (_, h) => (
            <option key={h} value={h}>
              {h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          Only sent if you haven&apos;t hit your goal yet that day.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <input
          id="remindersEnabled"
          name="remindersEnabled"
          type="checkbox"
          defaultChecked={initial.remindersEnabled}
          className="h-4 w-4 accent-primary"
        />
        <Label htmlFor="remindersEnabled">Email me when my streak is at risk</Label>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
        {state.ok ? <span className="text-sm text-primary">Saved</span> : null}
        {state.error ? <span className="text-sm text-destructive">{state.error}</span> : null}
      </div>
    </form>
  );
}
