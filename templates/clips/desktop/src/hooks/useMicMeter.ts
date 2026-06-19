import { useEffect, useRef, type MutableRefObject } from "react";
import { emit, listen } from "@tauri-apps/api/event";

// Number of bars in the live mic level meter. The popover sends this to the
// bubble page in relay mode so both sides agree on the sample count.
export const WAVE_BARS = 18;

function levelToHeight(level: number): string {
  return `${Math.max(10, Math.min(100, level * 130))}%`;
}

function flatten(bars: (HTMLSpanElement | null)[]): void {
  for (const bar of bars) if (bar) bar.style.height = "10%";
}

function applyLevels(
  bars: (HTMLSpanElement | null)[],
  levels: number[],
): void {
  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i];
    if (bar) bar.style.height = levelToHeight(levels[i] ?? 0);
  }
}

/**
 * Drives a row of bars from live mic input so users can validate their mic.
 *
 * Two modes, because of WebKit's single-page capture-exclusion (Tauri runs
 * every webview in one WebKit process; when one page calls getUserMedia, capture
 * in OTHER pages is muted):
 *
 *  - **local** (`relay === false`): no camera bubble is live, so we can open the
 *    mic in this page and analyse it directly.
 *  - **relay** (`relay === true`): the camera bubble owns a live capture in
 *    another page. Opening a mic here would black it out, so we ask the bubble
 *    page (same page as its camera → no mute) to run the analyser and emit level
 *    samples, which we just render.
 */
export function useMicMeter({
  active,
  deviceId,
  relay,
}: {
  active: boolean;
  deviceId: string;
  relay: boolean;
}): MutableRefObject<(HTMLSpanElement | null)[]> {
  const barsRef = useRef<(HTMLSpanElement | null)[]>([]);

  // Local mode — open the mic in this page and analyse it.
  useEffect(() => {
    if (!active || relay) return;
    let stream: MediaStream | null = null;
    let audioCtx: AudioContext | null = null;
    let raf = 0;
    let cancelled = false;

    const start = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: deviceId ? { deviceId: { exact: deviceId } } : true,
          video: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          stream = null;
          return;
        }
        audioCtx = new AudioContext();
        const sourceNode = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        analyser.smoothingTimeConstant = 0.7;
        sourceNode.connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);

        const tick = () => {
          analyser.getByteFrequencyData(data);
          const usable = Math.floor(data.length * 0.7);
          const levels: number[] = [];
          for (let i = 0; i < WAVE_BARS; i++) {
            const idx = Math.min(
              usable - 1,
              Math.floor((i / WAVE_BARS) * usable),
            );
            levels.push(data[idx] / 255);
          }
          applyLevels(barsRef.current, levels);
          raf = requestAnimationFrame(tick);
        };
        tick();
      } catch {
        flatten(barsRef.current);
      }
    };

    void start();

    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
      if (audioCtx) audioCtx.close().catch(() => {});
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [active, relay, deviceId]);

  // Relay mode — the bubble page owns the mic and emits level samples.
  useEffect(() => {
    if (!active || !relay) return;
    let stopped = false;
    let levelUnlisten: (() => void) | null = null;
    let readyUnlisten: (() => void) | null = null;

    const requestStart = () => {
      emit("clips:mic-meter-start", {
        micId: deviceId || null,
        bars: WAVE_BARS,
      }).catch(() => {});
    };

    requestStart();

    listen<{ levels?: number[] }>("clips:mic-level", (event) => {
      if (stopped) return;
      const levels = event.payload?.levels;
      if (Array.isArray(levels)) applyLevels(barsRef.current, levels);
    })
      .then((u) => {
        if (stopped) {
          u();
          return;
        }
        levelUnlisten = u;
      })
      .catch(() => {});

    // The bubble webview may mount after we first asked. It re-announces with
    // `clips:bubble-ready`; re-send the start so the meter survives the race
    // (the bubble ignores repeats for the same device).
    listen("clips:bubble-ready", () => {
      if (!stopped) requestStart();
    })
      .then((u) => {
        if (stopped) {
          u();
          return;
        }
        readyUnlisten = u;
      })
      .catch(() => {});

    return () => {
      stopped = true;
      if (levelUnlisten) levelUnlisten();
      if (readyUnlisten) readyUnlisten();
      emit("clips:mic-meter-stop", {}).catch(() => {});
      flatten(barsRef.current);
    };
  }, [active, relay, deviceId]);

  return barsRef;
}
