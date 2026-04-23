"use client";
import { useState, useCallback, useRef } from "react";
import { useVoiceSocket } from "@/hooks/useVoiceSocket";
import { useAudioQueue } from "@/hooks/useAudioQueue";

type Status = "idle" | "listening" | "thinking" | "speaking";

function decodeBase64ToBytes(base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export default function VoiceChat() {
  const [isActive, setIsActive] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [debugLines, setDebugLines] = useState<string[]>([]);
  const [receivedAudioChunks, setReceivedAudioChunks] = useState(0);
  const [playedSentences, setPlayedSentences] = useState(0);
  const pendingAudioChunksRef = useRef<Uint8Array[]>([]);
  const isTogglingRef = useRef(false);

  const { enqueueBytes, reset, unlock } = useAudioQueue();

  const pushDebug = useCallback((line: string) => {
    setDebugLines((prev) => [line, ...prev].slice(0, 8));
  }, []);

  const handleToken = useCallback(
    (t: string) => {
      console.log("[VoiceChat] handleToken called", t.slice(0, 40));
      setStatus("thinking");
      setResponse((prev) => prev + t);
      pushDebug(`token: ${t.trim() || "[space]"}`);
    },
    [pushDebug],
  );

  const handleAudioChunk = useCallback(
    (b64: string) => {
      console.log("[VoiceChat] handleAudioChunk called, length:", b64.length);
      pendingAudioChunksRef.current.push(decodeBase64ToBytes(b64));
      setReceivedAudioChunks((count) => count + 1);
      pushDebug(`audio chunk received: ${b64.length} chars`);
    },
    [pushDebug],
  );

  const handleTtsSentenceStart = useCallback(
    (text: string) => {
      console.log(
        "[VoiceChat] handleTtsSentenceStart called",
        text.slice(0, 40),
      );
      pendingAudioChunksRef.current = [];
      setStatus("speaking");
      pushDebug(`tts start: ${text.slice(0, 60)}`);
    },
    [pushDebug],
  );

  const handleTtsSentenceEnd = useCallback(
    async (info: { text: string; chunks: number }) => {
      console.log("[VoiceChat] handleTtsSentenceEnd called", info);
      const totalLength = pendingAudioChunksRef.current.reduce(
        (sum, chunk) => sum + chunk.byteLength,
        0,
      );
      const merged = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of pendingAudioChunksRef.current) {
        merged.set(chunk, offset);
        offset += chunk.byteLength;
      }
      pendingAudioChunksRef.current = [];
      pushDebug(`tts end: ${info.chunks} chunks / ${totalLength} bytes`);

      if (totalLength === 0) {
        pushDebug("tts end: no audio payload");
        return;
      }

      console.log("[VoiceChat] playing merged audio, bytes:", totalLength);
      const played = await enqueueBytes(merged);
      if (played) {
        setPlayedSentences((count) => count + 1);
        setStatus("listening");
        pushDebug(`audio played: ${info.text.slice(0, 60)}`);
      } else {
        pushDebug(`audio decode failed: ${info.text.slice(0, 60)}`);
      }
    },
    [enqueueBytes, pushDebug],
  );

  const handleTranscript = useCallback(
    (t: string) => {
      console.log("[VoiceChat] handleTranscript called", t);
      setTranscript(t);
      setStatus("thinking");
      setResponse("");
      pushDebug(`stt: ${t}`);
    },
    [pushDebug],
  );

  const handleDone = useCallback(() => {
    console.log("[VoiceChat] handleDone called");
    setStatus("listening");
    pushDebug("turn done");
  }, [pushDebug]);

  const { connect, disconnect, endTurn } = useVoiceSocket(
    handleToken,
    handleAudioChunk,
    handleTtsSentenceStart,
    handleTtsSentenceEnd,
    handleTranscript,
    handleDone,
  );

  const toggle = async () => {
    if (isTogglingRef.current) {
      return;
    }

    isTogglingRef.current = true;
    try {
      if (isActive) {
        setIsActive(false);
        setStatus("thinking");

        try {
          await endTurn(true);
        } catch (err) {
          console.error("Failed to finish turn:", err);
        }

        disconnect();
        reset();
        setStatus("idle");
      } else {
        setIsActive(true);
        setTranscript("");
        setResponse("");
        setDebugLines([]);
        setReceivedAudioChunks(0);
        setPlayedSentences(0);
        pendingAudioChunksRef.current = [];

        // CRITICAL: unlock AudioContext from inside user gesture
        await unlock();

        setStatus("listening");
        try {
          await connect();
        } catch (err) {
          console.error("Failed to connect:", err);
          setIsActive(false);
          setStatus("idle");
        }
      }
    } finally {
      isTogglingRef.current = false;
    }
  };

  const statusLabel: Record<Status, string> = {
    idle: "Press to talk",
    listening: "Listening...",
    thinking: "Thinking...",
    speaking: "Speaking...",
  };

  const statusColor: Record<Status, string> = {
    idle: "#555",
    listening: "#2ecc71",
    thinking: "#f39c12",
    speaking: "#3498db",
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif", maxWidth: 600 }}>
      <h2>Matrix Voice</h2>

      <button
        onClick={toggle}
        style={{
          padding: "0.75rem 2rem",
          fontSize: "1rem",
          borderRadius: 8,
          border: "none",
          cursor: "pointer",
          background: isActive ? "#c0392b" : "#2c3e50",
          color: "#fff",
          marginBottom: "1rem",
          transition: "background 0.2s",
        }}
      >
        {isActive ? "Stop" : "Start"}
      </button>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: "1rem",
          color: statusColor[status],
          fontSize: "0.9rem",
          fontWeight: 500,
        }}
      >
        <span
          style={{
            padding: "0.15rem 0.5rem",
            borderRadius: 999,
            background: statusColor[status],
            color: "#fff",
            fontSize: "0.75rem",
            letterSpacing: "0.02em",
            textTransform: "uppercase",
          }}
        >
          {status}
        </span>
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: statusColor[status],
            display: "inline-block",
            // Pulse animation when active
            animation:
              status !== "idle" ? "pulse 1.2s ease-in-out infinite" : "none",
          }}
        />
        {statusLabel[status]}

        <div
          style={{
            marginBottom: "1rem",
            padding: "0.75rem",
            borderRadius: 10,
            background: "rgba(255,255,255,0.06)",
            color: "#cbd5e1",
            fontSize: "0.85rem",
            lineHeight: 1.6,
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div>ws/audio chunks received: {receivedAudioChunks}</div>
          <div>sentences played: {playedSentences}</div>
          <div>
            voice output:{" "}
            {status === "speaking"
              ? "Speaking"
              : status === "thinking"
                ? "Thinking"
                : status === "listening"
                  ? "Listening"
                  : "Idle"}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.8); }
        }
      `}</style>

      {transcript && (
        <div
          style={{
            marginBottom: "1rem",
            padding: "0.75rem",
            background: "#f8f9fa",
            borderRadius: 8,
            borderLeft: "3px solid #2ecc71",
          }}
        >
          <strong style={{ color: "#27ae60" }}>You:</strong>{" "}
          <span style={{ color: "#333" }}>{transcript}</span>
        </div>
      )}

      {response && (
        <div
          style={{
            padding: "0.75rem",
            background: "#f0f4ff",
            borderRadius: 8,
            borderLeft: "3px solid #3498db",
            lineHeight: 1.6,
          }}
        >
          <strong style={{ color: "#2980b9" }}>Matrix:</strong>{" "}
          <span style={{ color: "#333" }}>{response}</span>
          {status === "thinking" && (
            <span style={{ color: "#999", marginLeft: 4 }}>▋</span>
          )}
        </div>
      )}

      <div
        style={{
          marginTop: "1rem",
          padding: "0.75rem",
          borderRadius: 8,
          background: "rgba(255,255,255,0.04)",
          color: "#9ca3af",
          fontSize: "0.8rem",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div style={{ marginBottom: 6, color: "#e5e7eb", fontWeight: 600 }}>
          Debug
        </div>
        {debugLines.length === 0 ? (
          <div>No frontend debug events yet.</div>
        ) : (
          debugLines.map((line, index) => (
            <div key={`${index}-${line}`}>{line}</div>
          ))
        )}
      </div>
    </div>
  );
}
