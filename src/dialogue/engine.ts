import type { HourBucket, Scene, Trigger } from "./types";
import { hourBucket } from "./types";
import scripts from "./scripts/tr.json";

const scenes = (scripts as { scenes: Scene[] }).scenes;
const lastByKey = new Map<string, string>();

function poolFor(trigger: Trigger, hour?: HourBucket): Scene[] {
  return scenes.filter((scene) => {
    if (scene.trigger !== trigger) return false;
    if (scene.hour && scene.hour !== hour) return false;
    return true;
  });
}

export function pickScene(trigger: Trigger): Scene | null {
  const hour = hourBucket();
  const pool = poolFor(trigger, hour);
  if (pool.length === 0) return null;
  const key = trigger === "hour_bucket" ? `${trigger}:${hour}` : trigger;
  const last = lastByKey.get(key);
  const choices = pool.length > 1 ? pool.filter((s) => s.id !== last) : pool;
  const scene = choices[Math.floor(Math.random() * choices.length)];
  lastByKey.set(key, scene.id);
  return scene;
}

export function hasSeenFirstRun(): boolean {
  return localStorage.getItem("aniko.first_run") === "1";
}

export function markFirstRun(): void {
  localStorage.setItem("aniko.first_run", "1");
}
