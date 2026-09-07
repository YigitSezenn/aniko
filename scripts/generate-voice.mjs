import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, copyFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

const scripts = JSON.parse(readFileSync("src/dialogue/scripts/tr.json", "utf8"));

const EXTRA = [
  "Akari geldi~ Kırmızı biraz cesur, değil mi?",
  "Aniko yine burada. Beni özledin mi?",
  "Ses açıldı. Ben Aniko.",
];

function xmlEscape(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function voiceId(text) {
  return createHash("sha1").update(text).digest("hex").slice(0, 12);
}

const texts = [
  ...new Set([...scripts.scenes.flatMap((scene) => scene.lines.map((line) => line.text)), ...EXTRA]),
];

mkdirSync("public/voice", { recursive: true });
const scratch = join(tmpdir(), `aniko-voice-${Date.now()}`);
mkdirSync(scratch, { recursive: true });

const tts = new MsEdgeTTS();
await tts.setMetadata("tr-TR-EmelNeural", OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);

const manifest = {};
for (const text of texts) {
  const id = voiceId(text);
  const dest = `public/voice/${id}.mp3`;
  const { audioFilePath } = await tts.toFile(scratch, xmlEscape(text), {
    rate: "+12%",
    pitch: "+18Hz",
  });
  copyFileSync(audioFilePath, dest);
  manifest[text] = `/voice/${id}.mp3`;
  console.log("voice", id, text.slice(0, 42));
}

writeFileSync("public/voice/manifest.json", `${JSON.stringify(manifest, null, 2)}\n`);
rmSync(scratch, { recursive: true, force: true });
console.log("wrote", texts.length, "clips");
