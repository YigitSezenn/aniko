export type CharacterId = "aniko" | "akari";

export interface CharacterLayout {
  id: CharacterId;
  name: string;
  image: string;
  aspect: [number, number];
  hitInset: { x: number; y: number; w: number; h: number };
  eyes: { x: number; y: number; w: number; h: number }[];
  mouth: { x: number; y: number; w: number; h: number };
  skin: string;
}

export const CHARACTERS: Record<CharacterId, CharacterLayout> = {
  aniko: {
    id: "aniko",
    name: "Aniko",
    image: "/characters/aniko/body.png",
    aspect: [386, 1100],
    hitInset: { x: 0.12, y: 0.02, w: 0.76, h: 0.96 },
    eyes: [
      { x: 0.41, y: 0.118, w: 0.07, h: 0.018 },
      { x: 0.53, y: 0.118, w: 0.07, h: 0.018 },
    ],
    mouth: { x: 0.48, y: 0.148, w: 0.045, h: 0.02 },
    skin: "#f0c2b0",
  },
  akari: {
    id: "akari",
    name: "Akari",
    image: "/characters/akari/body.png",
    aspect: [398, 1104],
    hitInset: { x: 0.16, y: 0.02, w: 0.68, h: 0.96 },
    eyes: [
      { x: 0.4, y: 0.108, w: 0.07, h: 0.018 },
      { x: 0.53, y: 0.106, w: 0.07, h: 0.018 },
    ],
    mouth: { x: 0.48, y: 0.138, w: 0.04, h: 0.018 },
    skin: "#f4cbbc",
  },
};

const STORAGE_KEY = "aniko.character";

export function loadCharacterId(): CharacterId {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === "akari" || raw === "aniko") return raw;
  return "aniko";
}

export function saveCharacterId(id: CharacterId): void {
  localStorage.setItem(STORAGE_KEY, id);
}
