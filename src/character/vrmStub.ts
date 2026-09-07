export async function findOptionalVrm(): Promise<string | null> {
  try {
    const res = await fetch("/models/character.vrm", { method: "HEAD" });
    if (res.ok) return "/models/character.vrm";
  } catch {
    // v1 ships 2.5D; drop a VRM here later
  }
  return null;
}
