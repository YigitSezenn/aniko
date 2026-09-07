export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export async function getMainWindow() {
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  return getCurrentWindow();
}

export async function startWindowDrag(): Promise<void> {
  if (!isTauri()) return;
  const window = await getMainWindow();
  await window.startDragging();
}

export async function setClickThrough(enabled: boolean): Promise<void> {
  if (!isTauri()) return;
  const { invoke } = await import("@tauri-apps/api/core");
  await invoke("set_clickthrough", { enabled });
}

export type HitRect = { x: number; y: number; w: number; h: number };

export async function updateHitRegions(
  character: HitRect | null,
  bubble: HitRect | null,
): Promise<void> {
  if (!isTauri()) return;
  const { invoke } = await import("@tauri-apps/api/core");
  await invoke("update_hit_regions", { character, bubble });
}

export async function listenTtsToggle(onToggle: (enabled?: boolean) => void): Promise<() => void> {
  if (!isTauri()) return () => undefined;
  const { listen } = await import("@tauri-apps/api/event");
  const unlisten = await listen<boolean>("aniko://tts", (event) => {
    onToggle(event.payload);
  });
  return unlisten;
}

export async function listenCharacterSwitch(
  onSwitch: (id: string) => void,
): Promise<() => void> {
  if (!isTauri()) return () => undefined;
  const { listen } = await import("@tauri-apps/api/event");
  const unlisten = await listen<string>("aniko://character", (event) => {
    onSwitch(event.payload);
  });
  return unlisten;
}
