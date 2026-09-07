let clips: Record<string, string> | null = null;
let current: HTMLAudioElement | null = null;
let loading: Promise<Record<string, string>> | null = null;

export function isTtsEnabled(): boolean {
  return localStorage.getItem("aniko.tts") !== "0";
}

export function setTtsEnabled(enabled: boolean): void {
  localStorage.setItem("aniko.tts", enabled ? "1" : "0");
  if (!enabled) stopVoice();
}

function stopVoice(): void {
  if (current) {
    current.pause();
    current.src = "";
    current = null;
  }
}

function loadClips(): Promise<Record<string, string>> {
  if (clips) return Promise.resolve(clips);
  if (!loading) {
    loading = fetch("/voice/manifest.json")
      .then((res) => (res.ok ? res.json() : {}))
      .then((data) => {
        clips = data as Record<string, string>;
        return clips;
      })
      .catch(() => {
        clips = {};
        return clips;
      });
  }
  return loading;
}

function playFile(src: string): Promise<void> {
  stopVoice();
  return new Promise((resolve) => {
    const audio = new Audio(src);
    current = audio;
    audio.onended = () => resolve();
    audio.onerror = () => resolve();
    void audio.play().catch(() => resolve());
  });
}

export async function speak(text: string): Promise<void> {
  if (!isTtsEnabled()) return;
  const map = await loadClips();
  const src = map[text];
  if (!src) return;
  await playFile(src);
}

export async function setTtsEnabledRemote(enabled: boolean): Promise<void> {
  setTtsEnabled(enabled);
}

export async function enableTtsAndTest(): Promise<void> {
  await setTtsEnabledRemote(true);
  await speak("Aniko yine burada. Beni özledin mi?");
}
