import { useRef, useCallback } from "react";

export function useAudioQueue() {
  const ctxRef = useRef<AudioContext | null>(null);
  const nextStartRef = useRef(0);

  const unlock = useCallback(async () => {
    // Must be called from a user gesture (button click)
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext();
    }
    if (ctxRef.current.state === "suspended") {
      await ctxRef.current.resume();
    }
    // Play 1ms silence to fully unlock the context
    const buf = ctxRef.current.createBuffer(1, 1, 22050);
    const src = ctxRef.current.createBufferSource();
    src.buffer = buf;
    src.connect(ctxRef.current.destination);
    src.start(0);
    console.log("[audio] context unlocked, state:", ctxRef.current.state);
  }, []);

  const ensureContext = useCallback(async () => {
    if (!ctxRef.current || ctxRef.current.state === "closed") {
      ctxRef.current = new AudioContext();
      nextStartRef.current = 0;
    }

    const ctx = ctxRef.current;

    if (ctx.state === "suspended") {
      await ctx.resume();
      console.log("[audio] resumed suspended context");
    }

    return ctx;
  }, []);

  const enqueueBytes = useCallback(
    async (audioBytes: Uint8Array | ArrayBuffer) => {
      const ctx = await ensureContext();
      const bytes =
        audioBytes instanceof Uint8Array
          ? audioBytes
          : new Uint8Array(audioBytes);

      try {
        // Create a fresh ArrayBuffer to ensure compatibility with decodeAudioData
        const cleanBuffer = new ArrayBuffer(bytes.byteLength);
        new Uint8Array(cleanBuffer).set(bytes);
        const audioBuffer = await ctx.decodeAudioData(cleanBuffer);
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);

        const startAt = Math.max(ctx.currentTime, nextStartRef.current);
        nextStartRef.current = startAt + audioBuffer.duration;
        console.log(
          "[audio] chunk queued, duration:",
          audioBuffer.duration.toFixed(2),
          "s",
        );

        await new Promise<void>((resolve) => {
          source.onended = () => resolve();
          source.start(startAt);
        });

        return true;
      } catch (e) {
        console.warn("[audio] decode failed", e);
        return false;
      }
    },
    [ensureContext],
  );

  const enqueue = useCallback(
    async (base64mp3: string) => {
      const binary = atob(base64mp3);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return enqueueBytes(bytes);
    },
    [enqueueBytes],
  );

  const reset = useCallback(() => {
    nextStartRef.current = 0;
    if (ctxRef.current && ctxRef.current.state !== "closed") {
      ctxRef.current.close();
    }
    ctxRef.current = null;
  }, []);

  return { enqueue, enqueueBytes, reset, unlock };
}
