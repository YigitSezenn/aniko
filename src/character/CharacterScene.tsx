import { useEffect, useRef } from "react";
import type { Emotion } from "../dialogue/types";
import type { CharacterLayout } from "./roster";

function Mouth({
  talking,
  emotion,
  layout,
}: {
  talking: boolean;
  emotion: Emotion;
  layout: CharacterLayout;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let frame = 0;
    let raf = 0;
    const draw = () => {
      ctx.clearRect(0, 0, 128, 128);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      const viseme = talking
        ? (["open", "smile", "wide", "open"] as const)[Math.floor(frame / 7) % 4]
        : emotion === "happy"
          ? "smile"
          : "closed";
      if (viseme === "closed") {
        ctx.strokeStyle = "#6a3344";
        ctx.lineWidth = emotion === "happy" ? 5 : 4;
        ctx.beginPath();
        if (emotion === "shy") {
          ctx.moveTo(40, 64);
          ctx.quadraticCurveTo(64, 70, 88, 64);
        } else if (emotion === "sleepy") {
          ctx.moveTo(44, 62);
          ctx.lineTo(84, 62);
        } else {
          ctx.moveTo(42, 60);
          ctx.quadraticCurveTo(64, emotion === "happy" ? 78 : 68, 86, 60);
        }
        ctx.stroke();
      } else {
        ctx.fillStyle = "#c45a6a";
        ctx.strokeStyle = "#6a3344";
        ctx.lineWidth = 4;
        ctx.beginPath();
        if (viseme === "smile") ctx.ellipse(64, 62, 22, 14, 0, 0, Math.PI * 2);
        else if (viseme === "open") ctx.ellipse(64, 66, 16, 18, 0, 0, Math.PI * 2);
        else ctx.ellipse(64, 68, 14, 22, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      frame += 1;
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [talking, emotion]);

  return (
    <canvas
      ref={canvasRef}
      className="mouth"
      width={128}
      height={128}
      style={{
        left: `${layout.mouth.x * 100}%`,
        top: `${layout.mouth.y * 100}%`,
        width: `${layout.mouth.w * 180}%`,
        height: `${layout.mouth.h * 180}%`,
        opacity: talking ? 1 : 0,
      }}
    />
  );
}

export function CharacterScene({
  talking,
  emotion,
  bounceToken,
  pointer,
  layout,
}: {
  talking: boolean;
  emotion: Emotion;
  bounceToken: number;
  pointer: { x: number; y: number };
  layout: CharacterLayout;
}) {
  const rig = useRef<HTMLDivElement>(null);
  const blink = useRef(0);
  const bounce = useRef(0);
  const nextBlink = useRef(performance.now() + 2400);
  const pointerRef = useRef(pointer);
  const emotionRef = useRef(emotion);
  pointerRef.current = pointer;
  emotionRef.current = emotion;

  useEffect(() => {
    bounce.current = 1;
  }, [bounceToken]);

  useEffect(() => {
    let raf = 0;
    const tick = (now: number) => {
      if (now > nextBlink.current) {
        nextBlink.current = now + 3000 + Math.random() * 2400;
        blink.current = 1;
      }
      blink.current += (0 - blink.current) * 0.18;
      bounce.current += (0 - bounce.current) * 0.12;
      const t = now / 1000;
      const breath = 1 + Math.sin(t * 2.15) * 0.018;
      const hair = Math.sin(t * 1.4) * 1.2;
      const tilt =
        emotionRef.current === "curious" ? 4 : emotionRef.current === "shy" ? -3.5 : 0;
      if (rig.current) {
        const p = pointerRef.current;
        rig.current.style.transform = [
          `translate(-50%, ${-bounce.current * 10}px)`,
          `rotateY(${p.x * 12}deg)`,
          `rotateX(${-p.y * 8}deg)`,
          `rotateZ(${tilt + hair}deg)`,
          `scale(${1 + bounce.current * 0.03}, ${breath + bounce.current * 0.04})`,
        ].join(" ");
        rig.current.style.setProperty("--blink", String(0.12 + blink.current * 0.9));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="character-stage">
      <div
        className="character-rig"
        ref={rig}
        style={{ aspectRatio: `${layout.aspect[0]} / ${layout.aspect[1]}` }}
      >
        <img src={layout.image} alt={layout.name} draggable={false} />
        {layout.eyes.map((eye) => (
          <div
            key={`${eye.x}-${eye.y}`}
            className="eyelid"
            style={{
              left: `${eye.x * 100}%`,
              top: `${eye.y * 100}%`,
              width: `${eye.w * 100}%`,
              height: `${eye.h * 100}%`,
              background: layout.skin,
            }}
          />
        ))}
        <Mouth talking={talking} emotion={emotion} layout={layout} />
      </div>
    </div>
  );
}
