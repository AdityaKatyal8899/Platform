"use client"

import React, { useState, useEffect, useRef } from "react"
import { Play, RotateCcw, Copy, Check, Terminal } from "lucide-react"

type TabType = "json" | "js" | "python" | "curl"

const CODE_TEMPLATES = {
  json: `{
  "storage": {
    "provider": "s3",
    "bucket": "private-video-storage",
    "region": "us-east-1"
  },
  "cdn": {
    "provider": "cloudflare",
    "zone": "cowatch.media"
  },
  "transcode": {
    "abr_profiles": ["1080p", "720p", "360p"],
    "segment_duration": 4,
    "watermark": "https://cowatch.media/logo.png"
  }
}`,
  js: `import { CoWatchPipeline } from 'cowatch-sdk';

const pipeline = new CoWatchPipeline({
  config: './cowatch.json'
});

// Start private background transcode task
const result = await pipeline.transcode({
  input: 's3://temp-uploads/raw_clip.mp4',
  videoId: 'vid-8eb6d4b4'
});

console.log(\`Manifest available at: \${result.masterPlaylistUrl}\`);`,
  python: `from cowatch_sdk import CoWatchPipeline

pipeline = CoWatchPipeline(config_path="./cowatch.json")

# Process and deploy multi-bitrate HLS
result = pipeline.transcode(
    input_uri="s3://temp-uploads/raw_clip.mp4",
    video_id="vid-8eb6d4b4"
)

print(f"Master manifest: {result.master_playlist_url}")`,
  curl: `curl -X POST "https://api.cowatch.io/v1/transcode" \\
  -H "Authorization: Bearer $COWATCH_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "video_id": "vid-8eb6d4b4",
    "input_uri": "s3://temp-uploads/raw_clip.mp4",
    "profiles": ["1080p", "720p", "360p"]
  }'`
}

export function DeveloperTerminal() {
  const [activeTab, setActiveTab] = useState<TabType>("json")
  const [isRunning, setIsRunning] = useState(false)
  const [copied, setCopied] = useState(false)
  const [logs, setLogs] = useState<string[]>([
    "// Click 'Run Pipeline' to simulate private transcode stack execution...",
    "$"
  ])
  
  const terminalEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [logs])

  const copyToClipboard = () => {
    navigator.clipboard.writeText(CODE_TEMPLATES[activeTab])
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const runSimulation = () => {
    if (isRunning) return
    setIsRunning(true)
    setLogs(["$ yarn run cowatch-pipeline --input ./raw_clip.mp4"])

    const simulationSteps = [
      { delay: 800, text: "[INFO] Initializing private container instances on S3 storage hooks..." },
      { delay: 1500, text: "[INFO] Ingesting file. Duration: 120s, Resolution: 1920x1080, Codec: h264" },
      { delay: 2300, text: "[INFO] Running multi-bitrate scaling HLS variant tasks..." },
      { delay: 2800, text: "   └─ [360p profile]: Compiling segments (800kbps)  -  [100%]" },
      { delay: 3300, text: "   └─ [720p profile]: Compiling segments (2200kbps) -  [100%]" },
      { delay: 3800, text: "   └─ [1080p profile]: Compiling segments (4500kbps) - [100%]" },
      { delay: 4400, text: "[INFO] Staging chunks and segment manifests directly to S3 / Cloudflare R2..." },
      { delay: 4900, text: "[INFO] Warming up Cloudflare edge cache routers..." },
      { delay: 5400, text: "[SUCCESS] Master HLS manifest live: https://cdn.cowatch.media/vid-8eb6d4b4/master.m3u8" },
      { delay: 5800, text: "[SUCCESS] Compute Costs: $0.0031  |  SaaS Markups Bypassed: 98.4%" },
      { delay: 6200, text: "$" }
    ]

    simulationSteps.forEach((step) => {
      setTimeout(() => {
        setLogs((prev) => [...prev, step.text])
        if (step.text === "$") {
          setIsRunning(false)
        }
      }, step.delay)
    })
  }

  return (
    <div 
      className="glass-panel" 
      style={{
        maxWidth: "1120px",
        margin: "60px auto 0",
        padding: 0,
        overflow: "hidden",
        border: "1px solid var(--border)",
        boxShadow: "0 20px 50px rgba(33,53,40,0.04)",
        borderRadius: "16px",
        background: "rgba(255,255,255,0.7)",
        backdropFilter: "blur(12px)"
      }}
    >
      {/* Header controls bar */}
      <div 
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 20px",
          borderBottom: "1px solid var(--border)",
          background: "rgba(0,0,0,0.02)"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ display: "inline-block", width: "10px", height: "10px", borderRadius: "50%", background: "#ff5f56" }} />
          <span style={{ display: "inline-block", width: "10px", height: "10px", borderRadius: "50%", background: "#ffbd2e" }} />
          <span style={{ display: "inline-block", width: "10px", height: "10px", borderRadius: "50%", background: "#27c93f" }} />
          <span 
            style={{ 
              marginLeft: "12px", 
              fontSize: "11px", 
              color: "var(--muted-foreground)", 
              fontFamily: "var(--font-mono)",
              fontWeight: 500
            }}
          >
            co-watch-pipeline // interactive CLI sandbox
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            onClick={copyToClipboard}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 12px",
              background: "transparent",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              color: "var(--foreground)",
              fontSize: "11px",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s"
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(0,0,0,0.03)" }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent" }}
          >
            {copied ? <Check size={11} style={{ color: "#3d9b65" }} /> : <Copy size={11} />}
            <span>{copied ? "Copied!" : "Copy Code"}</span>
          </button>
          
          <button
            onClick={runSimulation}
            disabled={isRunning}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 12px",
              background: isRunning ? "rgba(40,88,63,0.1)" : "#28583f",
              border: 0,
              borderRadius: "6px",
              color: isRunning ? "#28583f" : "#ffffff",
              fontSize: "11px",
              fontWeight: 600,
              cursor: isRunning ? "not-allowed" : "pointer",
              transition: "all 0.2s"
            }}
            onMouseEnter={(e) => { if (!isRunning) e.currentTarget.style.background = "#1d4932" }}
            onMouseLeave={(e) => { if (!isRunning) e.currentTarget.style.background = "#28583f" }}
          >
            {isRunning ? (
              <span className="spinner" style={{ borderColor: "rgba(40,88,63,0.2)", borderTopColor: "#28583f", margin: 0, width: "10px", height: "10px" }} />
            ) : (
              <Play size={11} fill="currentColor" />
            )}
            <span>{isRunning ? "Running..." : "Run Pipeline"}</span>
          </button>
        </div>
      </div>

      {/* Editor Main body Grid */}
      <div 
        style={{ 
          display: "grid", 
          gridTemplateColumns: "1.1fr 0.9fr",
          minHeight: "340px",
          background: "#121815" 
        }}
        className="calculator" /* falls back on responsive grid sizing in CSS */
      >
        {/* Left Side: Code Editor block */}
        <div style={{ borderRight: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column" }} className="calculator-inputs">
          <div 
            style={{ 
              display: "flex", 
              background: "rgba(0,0,0,0.2)", 
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              padding: "0 10px"
            }}
          >
            {(["json", "js", "python", "curl"] as TabType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: "10px 16px",
                  background: activeTab === tab ? "rgba(255,255,255,0.05)" : "transparent",
                  border: 0,
                  borderBottom: activeTab === tab ? "2px solid #3d9b65" : "2px solid transparent",
                  color: activeTab === tab ? "#ffffff" : "#697a70",
                  fontSize: "11px",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "var(--font-mono)",
                  textTransform: "uppercase"
                }}
              >
                {tab === "json" ? "cowatch.json" : tab === "js" ? "index.js" : tab === "python" ? "pipeline.py" : "cURL"}
              </button>
            ))}
          </div>
          
          <pre 
            style={{ 
              margin: 0,
              padding: "20px 24px",
              color: "#c2d1c7",
              fontFamily: "var(--font-mono)",
              fontSize: "12px",
              lineHeight: 1.75,
              overflow: "auto",
              flex: 1
            }}
          >
            <code>{CODE_TEMPLATES[activeTab]}</code>
          </pre>
        </div>

        {/* Right Side: Simulated Command Line Terminal Console */}
        <div 
          style={{ 
            background: "#080c09",
            padding: "20px 24px",
            fontFamily: "var(--font-mono)",
            fontSize: "12px",
            lineHeight: 1.8,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            maxHeight: "380px"
          }}
          className="savings-result"
        >
          <div style={{ flex: 1 }}>
            {logs.map((log, index) => (
              <div 
                key={index} 
                style={{ 
                  color: log.startsWith("[SUCCESS]") 
                    ? "#5ebd85" 
                    : log.startsWith("[INFO]") 
                    ? "#94a99d" 
                    : log.startsWith("   └─") 
                    ? "#788f80" 
                    : log.startsWith("$") 
                    ? "#3d9b65" 
                    : "#617066",
                  fontWeight: log.startsWith("[SUCCESS]") || log.startsWith("$") ? 600 : 400
                }}
              >
                {log}
              </div>
            ))}
            {isRunning && (
              <div style={{ display: "inline-block", width: "8px", height: "14px", background: "#3d9b65", marginLeft: "4px", verticalAlign: "middle", animation: "spin 1s step-end infinite" }} />
            )}
            <div ref={terminalEndRef} />
          </div>
        </div>
      </div>
    </div>
  )
}
