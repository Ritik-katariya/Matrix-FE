import { useRef, useCallback, useEffect } from "react";

const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000/ws/voice2";
const SAMPLE_RATE = 16000;
const SILENCE_THRESHOLD = 0.0016;
const BARGE_IN_THRESHOLD = 0.0045;
const SILENCE_DURATION_MS = 1100;
const SPEECH_HANGOVER_MS = 520;
const MIN_SPEECH_START_MS = 60;
const TURN_DONE_TIMEOUT_MS = 30000;
const PRE_ROLL_MS = 420;
const NOISE_FLOOR_ALPHA = 0.03;
const NOISE_FLOOR_MULTIPLIER = 2.4;
const BARGE_IN_NOISE_MULTIPLIER = 5.5;
const DEBUG_VOICE = true;
const LOG_EVERY_FRAMES = 25;

export function useVoiceSocket(
  onToken: (t: string) => void,
  onAudioChunk: (b64: string) => void,
  onTtsSentenceStart?: (text: string) => void,
  onTtsSentenceEnd?: (info: { text: string; chunks: number }) => void,
  onTranscript?: (t: string) => void,
  onDone?: () => void,
  onTurnProcessing?: () => void,
  onBargeInRequested?: () => void,
  onBargeInAck?: () => void,
) {
  const wsRef = useRef<WebSocket | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const nativeSampleRateRef = useRef<number>(SAMPLE_RATE);
  const workletRef = useRef<AudioWorkletNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sinkGainRef = useRef<GainNode | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const turnDoneTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const turnDoneResolverRef = useRef<(() => void) | null>(null);
  const isSpeakingRef = useRef(false);
  const isConnectedRef = useRef(false);
  const isConnectingRef = useRef(false);
  const waitingForTurnDoneRef = useRef(false);
  const assistantSpeakingRef = useRef(false);
  const bargeInSentRef = useRef(false);
  const lastSpeechAtRef = useRef<number>(0);
  const speechStartCandidateAtRef = useRef<number | null>(null);
  const noiseFloorRef = useRef<number>(SILENCE_THRESHOLD * 0.6);
  const hpLastXRef = useRef<number>(0);
  const hpLastYRef = useRef<number>(0);
  const preRollFramesRef = useRef<Int16Array[]>([]);
  const preRollSamplesRef = useRef<number>(0);
  const speechSendingRef = useRef<boolean>(false);
  const frameCountRef = useRef(0);
  const sentChunkCountRef = useRef(0);

  const debug = useCallback((message: string, data?: unknown) => {
    if (!DEBUG_VOICE) return;
    if (data === undefined) {
      console.log(`[voice-debug] ${message}`);
      return;
    }
    console.log(`[voice-debug] ${message}`, data);
  }, []);

  const clearTurnDoneTimeout = useCallback(() => {
    if (turnDoneTimeoutRef.current) {
      clearTimeout(turnDoneTimeoutRef.current);
      turnDoneTimeoutRef.current = null;
    }
  }, []);

  const resolveTurnDone = useCallback(() => {
    waitingForTurnDoneRef.current = false;
    clearTurnDoneTimeout();
    const resolver = turnDoneResolverRef.current;
    turnDoneResolverRef.current = null;
    if (resolver) {
      resolver();
    }
  }, [clearTurnDoneTimeout]);

  const computeHighpassRms = useCallback((pcm: Float32Array) => {
    // 1st-order high-pass filter (~120Hz) to reduce low-frequency rumble.
    // y[n] = a * (y[n-1] + x[n] - x[n-1])
    const cutoffHz = 120;
    const dt = 1 / SAMPLE_RATE;
    const rc = 1 / (2 * Math.PI * cutoffHz);
    const a = rc / (rc + dt);

    let lastX = hpLastXRef.current;
    let lastY = hpLastYRef.current;

    let sumSquares = 0;
    for (let i = 0; i < pcm.length; i++) {
      const x = pcm[i];
      const y = a * (lastY + x - lastX);
      lastX = x;
      lastY = y;
      sumSquares += y * y;
    }

    hpLastXRef.current = lastX;
    hpLastYRef.current = lastY;

    return Math.sqrt(sumSquares / pcm.length);
  }, []);

  const downsampleTo16k = useCallback(
    (input: Float32Array, fromRate: number) => {
      if (!input.length || fromRate === SAMPLE_RATE) {
        return input;
      }

      // Linear interpolation resampling.
      // This is noticeably more accurate than nearest-neighbor for speech.
      const ratio = fromRate / SAMPLE_RATE;
      const outLen = Math.max(1, Math.floor(input.length / ratio));
      const out = new Float32Array(outLen);

      for (let i = 0; i < outLen; i++) {
        const t = i * ratio;
        const idx = Math.floor(t);
        const frac = t - idx;

        const s0 = input[idx] ?? 0;
        const s1 = input[Math.min(idx + 1, input.length - 1)] ?? s0;
        out[i] = s0 + (s1 - s0) * frac;
      }

      return out;
    },
    [],
  );

  const pushPreRoll = useCallback((frame: Int16Array) => {
    const maxSamples = Math.floor((SAMPLE_RATE * PRE_ROLL_MS) / 1000);
    preRollFramesRef.current.push(frame);
    preRollSamplesRef.current += frame.length;
    while (
      preRollSamplesRef.current > maxSamples &&
      preRollFramesRef.current.length
    ) {
      const dropped = preRollFramesRef.current.shift();
      if (dropped) {
        preRollSamplesRef.current -= dropped.length;
      }
    }
  }, []);

  const flushPreRoll = useCallback((ws: WebSocket) => {
    for (const frame of preRollFramesRef.current) {
      try {
        const buf = frame.buffer.slice(
          frame.byteOffset,
          frame.byteOffset + frame.byteLength,
        ) as ArrayBuffer;
        ws.send(buf);
        sentChunkCountRef.current += 1;
      } catch {
        break;
      }
    }
    preRollFramesRef.current = [];
    preRollSamplesRef.current = 0;
  }, []);

  const endTurn = useCallback(
    async (waitForDone: boolean) => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }

      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        return;
      }

      if (waitingForTurnDoneRef.current) {
        debug("endTurn skipped: already waiting for done");
        return;
      }

      debug("sending end_of_speech");
      waitingForTurnDoneRef.current = true;
      if (onTurnProcessing) {
        onTurnProcessing();
      }

      clearTurnDoneTimeout();
      turnDoneTimeoutRef.current = setTimeout(() => {
        debug("turn done timeout reached; resuming capture");
        resolveTurnDone();
      }, TURN_DONE_TIMEOUT_MS);

      let donePromise: Promise<void> | null = null;
      if (waitForDone) {
        donePromise = new Promise<void>((resolve) => {
          turnDoneResolverRef.current = resolve;
        });
      }

      ws.send(JSON.stringify({ type: "end_of_speech" }));

      if (!donePromise) {
        return;
      }

      await donePromise;
    },
    [clearTurnDoneTimeout, debug, onTurnProcessing, resolveTurnDone],
  );

  const cleanupSession = useCallback((closeSocket: boolean) => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    clearTurnDoneTimeout();

    isSpeakingRef.current = false;
    isConnectedRef.current = false;
    waitingForTurnDoneRef.current = false;
    assistantSpeakingRef.current = false;
    bargeInSentRef.current = false;
    speechStartCandidateAtRef.current = null;
    turnDoneResolverRef.current = null;

    sourceRef.current?.disconnect();
    sourceRef.current = null;

    workletRef.current?.disconnect();
    workletRef.current = null;

    sinkGainRef.current?.disconnect();
    sinkGainRef.current = null;

    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }

    if (contextRef.current && contextRef.current.state !== "closed") {
      contextRef.current.close();
    }
    contextRef.current = null;

    if (closeSocket && wsRef.current) {
      wsRef.current.onmessage = null;
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const connect = useCallback(async () => {
    if (isConnectingRef.current) {
      debug("connect skipped: already connecting");
      return;
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      debug("connect skipped: websocket already open");
      return;
    }

    isConnectingRef.current = true;
    debug("connect() requested", { wsUrl: WS_URL });

    // Always fully clean stale audio graph/socket before creating a new session.
    cleanupSession(true);
    frameCountRef.current = 0;
    sentChunkCountRef.current = 0;

    try {
      // Setup WebSocket
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;
      ws.binaryType = "arraybuffer";

      await new Promise<void>((resolve, reject) => {
        const openTimeout = setTimeout(() => {
          reject(new Error("WebSocket open timeout"));
        }, 10000);

        ws.onopen = () => {
          clearTimeout(openTimeout);
          isConnectedRef.current = true;
          console.log("[ws.onopen] OPEN", { readyState: ws.readyState });
          debug("websocket connected");
          resolve();
        };
        ws.onerror = () => {
          clearTimeout(openTimeout);
          console.error("[ws.onerror] Error", { readyState: ws.readyState });
          reject(new Error("WebSocket connection failed"));
        };
        ws.onclose = (event) => {
          clearTimeout(openTimeout);
          if (wsRef.current === ws) {
            isConnectedRef.current = false;
          }
          console.log("[ws.onclose] CLOSED", {
            code: event.code,
            wasClean: event.wasClean,
          });
          debug("websocket closed", {
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean,
          });
        };
      });

      ws.onmessage = (e) => {
        console.log("[ws.onmessage] Received frame, attempting parse", {
          dataType: typeof e.data,
          dataLength: e.data?.length,
          isBinary: e.data instanceof ArrayBuffer,
          wsReady: ws.readyState === WebSocket.OPEN,
        });
        try {
          const msg = JSON.parse(e.data);
          console.log("[ws.onmessage]", msg.type, msg);

          if (DEBUG_VOICE && msg?.type !== "token") {
            debug("server message", msg);
          }

          if (msg.type === "token") {
            if (bargeInSentRef.current) {
              debug("ignoring token after barge-in request");
              return;
            }
            console.log("[ws] invoking onToken");
            onToken(msg.data);
          }
          if (msg.type === "tts_sentence_start" && onTtsSentenceStart) {
            if (bargeInSentRef.current) {
              debug("ignoring tts_sentence_start after barge-in request");
              return;
            }
            assistantSpeakingRef.current = true;
            console.log("[ws] invoking onTtsSentenceStart");
            onTtsSentenceStart(String(msg.data?.text ?? ""));
          }
          if (msg.type === "tts_sentence_end" && onTtsSentenceEnd) {
            if (bargeInSentRef.current) {
              debug("ignoring tts_sentence_end after barge-in request");
              return;
            }
            console.log("[ws] invoking onTtsSentenceEnd");
            onTtsSentenceEnd({
              text: String(msg.data?.text ?? ""),
              chunks: Number(msg.data?.chunks ?? 0),
            });
          }
          if (msg.type === "audio_chunk") {
            if (bargeInSentRef.current) {
              debug("ignoring audio_chunk after barge-in request");
              return;
            }
            console.log(
              "[ws] invoking onAudioChunk, length:",
              msg.data?.length,
            );
            onAudioChunk(msg.data);
          }
          if (msg.type === "stt" && onTranscript) {
            console.log("[ws] invoking onTranscript");
            onTranscript(msg.data);
          }
          if (msg.type === "done") {
            assistantSpeakingRef.current = false;
            bargeInSentRef.current = false;
            console.log("[ws] invoking onDone");
            resolveTurnDone();
            if (onDone) onDone();
          }
          if (msg.type === "barge_in_ack") {
            assistantSpeakingRef.current = false;
            bargeInSentRef.current = false;
            resolveTurnDone();
            if (onBargeInAck) {
              onBargeInAck();
            }
          }
          if (msg.type === "error") {
            assistantSpeakingRef.current = false;
            bargeInSentRef.current = false;
            resolveTurnDone();
            console.error("Server error:", msg.data);
          }
        } catch (err) {
          // binary frame or non-JSON — ignore
          debug("non-json websocket frame", {
            dataType: typeof e.data,
            error: String(err),
          });
        }
      };

      // Mic capture
      debug("requesting microphone permission");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: SAMPLE_RATE,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          // AGC often amplifies distant/background sounds; prefer relying on VAD thresholds.
          autoGainControl: false,
        },
      });
      streamRef.current = stream;
      const audioTrack = stream.getAudioTracks()[0];
      debug("microphone stream acquired", {
        trackState: audioTrack?.readyState,
        settings: audioTrack?.getSettings?.(),
      });

      const ctx = new AudioContext({ sampleRate: SAMPLE_RATE });
      contextRef.current = ctx;
      nativeSampleRateRef.current = ctx.sampleRate;
      debug("audio context created", {
        sampleRate: ctx.sampleRate,
        state: ctx.state,
      });

      if (ctx.sampleRate !== SAMPLE_RATE) {
        debug("audio context sampleRate mismatch; will downsample", {
          requested: SAMPLE_RATE,
          actual: ctx.sampleRate,
        });
      }

      if (ctx.state === "suspended") {
        await ctx.resume();
        debug("audio context resumed", { state: ctx.state });
      }

      const source = ctx.createMediaStreamSource(stream);
      sourceRef.current = source;

      // AudioWorklet (non-deprecated)
      await ctx.audioWorklet.addModule("/audio-processor.js");
      debug("audio worklet module loaded");
      const worklet = new AudioWorkletNode(ctx, "audio-processor");
      workletRef.current = worklet;

      worklet.port.onmessage = (ev) => {
        frameCountRef.current += 1;

        if (ws.readyState !== WebSocket.OPEN) {
          if (frameCountRef.current % LOG_EVERY_FRAMES === 0) {
            debug("worklet frame dropped: websocket not open", {
              readyState: ws.readyState,
            });
          }
          return;
        }

        const pcm = ev.data as Float32Array;
        if (!pcm || pcm.length === 0) {
          if (frameCountRef.current % LOG_EVERY_FRAMES === 0) {
            debug("empty pcm frame from worklet");
          }
          return;
        }

        const nativeRate = nativeSampleRateRef.current;
        const pcm16k =
          nativeRate === SAMPLE_RATE ? pcm : downsampleTo16k(pcm, nativeRate);
        const rms = computeHighpassRms(pcm16k);

        // Update adaptive noise floor when we appear to be in silence.
        // (Use a low alpha so it adapts slowly; avoids chasing speech.)
        if (!assistantSpeakingRef.current && !isSpeakingRef.current) {
          const nf = noiseFloorRef.current;
          noiseFloorRef.current =
            nf + NOISE_FLOOR_ALPHA * (Math.min(rms, 0.02) - nf);
        }

        const dynamicSilenceThreshold = Math.max(
          SILENCE_THRESHOLD,
          noiseFloorRef.current * NOISE_FLOOR_MULTIPLIER,
        );
        const dynamicBargeInThreshold = Math.max(
          BARGE_IN_THRESHOLD,
          noiseFloorRef.current * BARGE_IN_NOISE_MULTIPLIER,
        );

        const speakingNow = rms > dynamicSilenceThreshold;
        const bargeInSpeakingNow = rms > dynamicBargeInThreshold;
        const now = performance.now();

        if (
          bargeInSpeakingNow &&
          assistantSpeakingRef.current &&
          !bargeInSentRef.current &&
          ws.readyState === WebSocket.OPEN
        ) {
          bargeInSentRef.current = true;
          // We are explicitly cancelling the current assistant turn.
          // Release any "waiting for done" gating immediately so we can end this new user turn.
          resolveTurnDone();
          debug("sending barge_in", { rms, threshold: BARGE_IN_THRESHOLD });
          if (onBargeInRequested) {
            onBargeInRequested();
          }
          ws.send(JSON.stringify({ type: "barge_in" }));
        }

        if (speakingNow) {
          if (speechStartCandidateAtRef.current === null) {
            speechStartCandidateAtRef.current = now;
          }

          const sustainedSpeechMs = now - speechStartCandidateAtRef.current;
          if (sustainedSpeechMs >= MIN_SPEECH_START_MS) {
            lastSpeechAtRef.current = now;
          }
        } else {
          speechStartCandidateAtRef.current = null;
        }

        const speaking =
          speakingNow || now - lastSpeechAtRef.current < SPEECH_HANGOVER_MS;

        if (speaking) {
          if (!isSpeakingRef.current) {
            debug("voice activity started", {
              rms,
              threshold: SILENCE_THRESHOLD,
            });
          }
          isSpeakingRef.current = true;
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
        } else if (isSpeakingRef.current) {
          if (!silenceTimerRef.current) {
            silenceTimerRef.current = setTimeout(() => {
              isSpeakingRef.current = false;
              silenceTimerRef.current = null;
              speechSendingRef.current = false;
              preRollFramesRef.current = [];
              preRollSamplesRef.current = 0;
              void endTurn(false);
            }, SILENCE_DURATION_MS);
          }
        }

        // Stream every frame so server-side VAD can decide speech boundaries.
        const int16 = new Int16Array(pcm16k.length);
        for (let i = 0; i < pcm16k.length; i++) {
          int16[i] = Math.max(-32768, Math.min(32767, pcm16k[i] * 32768));
        }

        // Stream every frame once connected so speech is never missed by client VAD.
        // VAD still controls barge-in and end-of-turn timing, but not whether audio is sent.
        const shouldSendAudio = ws.readyState === WebSocket.OPEN;

        if (ws.readyState !== WebSocket.OPEN) {
          if (frameCountRef.current % LOG_EVERY_FRAMES === 0) {
            console.warn("[worklet] Cannot send: websocket not OPEN", {
              readyState: ws.readyState,
              state: ["CONNECTING", "OPEN", "CLOSING", "CLOSED"][ws.readyState],
              frame: frameCountRef.current,
            });
          }
          return;
        }

        try {
          if (!speechSendingRef.current) {
            flushPreRoll(ws);
            speechSendingRef.current = true;
          }
          const buf = int16.buffer.slice(
            int16.byteOffset,
            int16.byteOffset + int16.byteLength,
          ) as ArrayBuffer;
          if (shouldSendAudio) {
            ws.send(buf);
          }
        } catch (err) {
          console.error("[worklet.send] Error sending PCM frame", err, {
            readyState: ws.readyState,
          });
        }
        sentChunkCountRef.current += 1;

        if (frameCountRef.current % LOG_EVERY_FRAMES === 0) {
          debug("mic stream heartbeat", {
            frame: frameCountRef.current,
            sentChunks: sentChunkCountRef.current,
            pcmLength: pcm.length,
            rms,
            bargeInSpeakingNow,
            speakingNow,
            speaking,
            noiseFloor: noiseFloorRef.current,
            dynamicSilenceThreshold,
          });
        }
      };

      source.connect(worklet);
      const sinkGain = ctx.createGain();
      sinkGain.gain.value = 0;
      sinkGainRef.current = sinkGain;
      worklet.connect(sinkGain);
      sinkGain.connect(ctx.destination);
      debug("audio graph connected and streaming");
    } finally {
      isConnectingRef.current = false;
    }
  }, [
    clearTurnDoneTimeout,
    cleanupSession,
    debug,
    endTurn,
    onToken,
    onAudioChunk,
    onTtsSentenceStart,
    onTtsSentenceEnd,
    onTranscript,
    onDone,
    onTurnProcessing,
    onBargeInRequested,
    onBargeInAck,
    resolveTurnDone,
  ]);

  const disconnect = useCallback(() => {
    debug("disconnect() requested");
    console.log("[disconnect] Closing websocket", {
      wsReadyState: wsRef.current?.readyState,
      isConnected: isConnectedRef.current,
    });

    cleanupSession(true);
    isConnectingRef.current = false;
    debug("disconnect complete");
  }, [cleanupSession, debug]);

  // Auto-cleanup on unmount
  useEffect(() => () => disconnect(), [disconnect]);

  return { connect, disconnect, endTurn, isConnected: isConnectedRef };
}
