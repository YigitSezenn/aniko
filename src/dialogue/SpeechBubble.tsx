import { useEffect, useState } from "react";
import type { Line } from "./types";

export function SpeechBubble({
  line,
  onDone,
}: {
  line: Line | null;
  onDone: () => void;
}) {
  const [shown, setShown] = useState("");

  useEffect(() => {
    if (!line) {
      setShown("");
      return;
    }
    setShown("");
    let i = 0;
    const typeTimer = window.setInterval(() => {
      i += 1;
      setShown(line.text.slice(0, i));
      if (i >= line.text.length) window.clearInterval(typeTimer);
    }, 28);
    const hideTimer = window.setTimeout(onDone, Math.max(line.durationMs, line.text.length * 40 + 1200));
    return () => {
      window.clearInterval(typeTimer);
      window.clearTimeout(hideTimer);
    };
  }, [line, onDone]);

  if (!line) return null;

  return (
    <div className="speech-bubble" data-hit="bubble">
      <p>{shown}</p>
    </div>
  );
}
