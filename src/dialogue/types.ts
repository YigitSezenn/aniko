export type Emotion = "neutral" | "happy" | "shy" | "curious" | "sleepy";
export type Trigger = "first_run" | "click" | "idle" | "hour_bucket";
export type HourBucket = "morning" | "afternoon" | "evening" | "night";

export interface Line {
  text: string;
  emotion: Emotion;
  durationMs: number;
}

export interface Scene {
  id: string;
  trigger: Trigger;
  hour?: HourBucket;
  lines: Line[];
}

export function hourBucket(date = new Date()): HourBucket {
  const h = date.getHours();
  if (h < 6 || h >= 22) return "night";
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}
