import { useCallback, useEffect, useRef, useState } from "react";
import { CharacterScene } from "./character/CharacterScene";
import { findOptionalVrm } from "./character/vrmStub";
import {
  CHARACTERS,
  loadCharacterId,
  saveCharacterId,
  type CharacterId,
} from "./character/roster";
import { SpeechBubble } from "./dialogue/SpeechBubble";
import { hasSeenFirstRun, markFirstRun, pickScene } from "./dialogue/engine";
import { speak, setTtsEnabled, enableTtsAndTest } from "./dialogue/tts";
import type { Emotion, Line, Trigger } from "./dialogue/types";
import {
  isTauri,
  listenCharacterSwitch,
  listenTtsToggle,
  setClickThrough,
  startWindowDrag,
  updateHitRegions,
} from "./window/tauri";
import "./App.css";

const IDLE_MS = 50_000;
const DRAG_PX = 6;

export default function App() {
  const [line, setLine] = useState<Line | null>(null);
  const [emotion, setEmotion] = useState<Emotion>("neutral");
  const [bounceToken, setBounceToken] = useState(0);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [characterId, setCharacterId] = useState<CharacterId>(() =>
    typeof window === "undefined" ? "aniko" : loadCharacterId(),
  );
  const layout = CHARACTERS[characterId];
  const queue = useRef<Line[]>([]);
  const idleTimer = useRef<number | null>(null);
  const pointerDown = useRef<{ x: number; y: number } | null>(null);
  const dragging = useRef(false);
  const hitRef = useRef<HTMLDivElement>(null);
  const skipClick = useRef(false);

  const say = useCallback((trigger: Trigger) => {
    const scene = pickScene(trigger);
    if (!scene) return;
    queue.current = [...scene.lines];
    const next = queue.current.shift() ?? null;
    setLine(next);
    if (next) {
      setEmotion(next.emotion);
      speak(next.text);
    }
  }, []);

  const switchCharacter = useCallback(
    (id: string) => {
      if (id !== "aniko" && id !== "akari") return;
      saveCharacterId(id);
      setCharacterId(id);
      setBounceToken((n) => n + 1);
      const intro =
        id === "akari"
          ? { text: "Akari geldi~ Kırmızı biraz cesur, değil mi?", emotion: "happy" as const, durationMs: 3800 }
          : { text: "Aniko yine burada. Beni özledin mi?", emotion: "shy" as const, durationMs: 3600 };
      queue.current = [];
      setLine(intro);
      setEmotion(intro.emotion);
      speak(intro.text);
    },
    [],
  );

  const bumpIdle = useCallback(() => {
    if (idleTimer.current) window.clearTimeout(idleTimer.current);
    idleTimer.current = window.setTimeout(() => say("idle"), IDLE_MS);
  }, [say]);

  const onLineDone = useCallback(() => {
    const next = queue.current.shift() ?? null;
    setLine(next);
    if (next) {
      setEmotion(next.emotion);
      speak(next.text);
    } else {
      setEmotion("neutral");
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("preview-page", !isTauri());
    document.body.classList.toggle("preview-body", !isTauri());
    void findOptionalVrm().then((path) => {
      if (path) console.info("VRM bulundu, v1 2.5D kullanıyor:", path);
    });
    if (!hasSeenFirstRun()) {
      markFirstRun();
      say("first_run");
    } else {
      say("hour_bucket");
    }
    bumpIdle();
    return () => {
      if (idleTimer.current) window.clearTimeout(idleTimer.current);
    };
  }, [bumpIdle, say]);

  useEffect(() => {
    let unlisten = () => undefined as void;
    void listenTtsToggle((enabled) => {
      if (enabled === false) setTtsEnabled(false);
      else void enableTtsAndTest();
    }).then((fn) => {
      unlisten = fn;
    });
    return () => unlisten();
  }, []);

  useEffect(() => {
    let unlisten = () => undefined as void;
    void listenCharacterSwitch(switchCharacter).then((fn) => {
      unlisten = fn;
    });
    return () => unlisten();
  }, [switchCharacter]);

  useEffect(() => {
    const el = hitRef.current;
    if (!el) return;
    const char = el.getBoundingClientRect();
    const inset = layout.hitInset;
    const character = {
      x: char.width * inset.x,
      y: char.height * inset.y,
      w: char.width * inset.w,
      h: char.height * inset.h,
    };
    const bubbleEl = el.querySelector("[data-hit='bubble']");
    const bubble = bubbleEl
      ? (() => {
          const r = bubbleEl.getBoundingClientRect();
          return { x: r.left - char.left, y: r.top - char.top, w: r.width, h: r.height };
        })()
      : null;
    void updateHitRegions(character, bubble);
  }, [line, layout]);

  const inCharacter = (x: number, y: number) => {
    const el = hitRef.current;
    if (!el) return false;
    const r = el.getBoundingClientRect();
    const nx = (x - r.left) / r.width;
    const ny = (y - r.top) / r.height;
    const h = layout.hitInset;
    return nx >= h.x && nx <= h.x + h.w && ny >= h.y && ny <= h.y + h.h;
  };

  return (
    <div
      className={isTauri() ? "stage" : "stage preview"}
      ref={hitRef}
      role="button"
      tabIndex={0}
      aria-label={layout.name}
      onPointerMove={(event) => {
        const r = event.currentTarget.getBoundingClientRect();
        setPointer({
          x: ((event.clientX - r.left) / r.width) * 2 - 1,
          y: -(((event.clientY - r.top) / r.height) * 2 - 1),
        });
        const over =
          inCharacter(event.clientX, event.clientY) ||
          Boolean((event.target as HTMLElement).closest("[data-hit='bubble']"));
        void setClickThrough(!over);
        if (pointerDown.current && !dragging.current) {
          const dx = event.clientX - pointerDown.current.x;
          const dy = event.clientY - pointerDown.current.y;
          if (Math.hypot(dx, dy) > DRAG_PX) {
            dragging.current = true;
            void startWindowDrag();
          }
        }
      }}
      onPointerLeave={() => {
        setPointer({ x: 0, y: 0 });
        void setClickThrough(true);
      }}
      onPointerDown={(event) => {
        if (!inCharacter(event.clientX, event.clientY)) return;
        pointerDown.current = { x: event.clientX, y: event.clientY };
        dragging.current = false;
      }}
      onPointerUp={() => {
        skipClick.current = dragging.current;
        pointerDown.current = null;
        dragging.current = false;
      }}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        setBounceToken((n) => n + 1);
        bumpIdle();
        say("click");
      }}
      onClick={(event) => {
        if (skipClick.current || !inCharacter(event.clientX, event.clientY)) return;
        setBounceToken((n) => n + 1);
        bumpIdle();
        say("click");
      }}
    >
      <CharacterScene
        talking={Boolean(line)}
        emotion={emotion}
        bounceToken={bounceToken}
        pointer={pointer}
        layout={layout}
      />
      <div className="speech-wrap">
        <SpeechBubble line={line} onDone={onLineDone} />
      </div>
      {!isTauri() ? (
        <div className="preview-bar">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              switchCharacter("aniko");
            }}
          >
            Aniko
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              switchCharacter("akari");
            }}
          >
            Akari
          </button>
        </div>
      ) : null}
    </div>
  );
}
