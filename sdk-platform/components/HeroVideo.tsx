"use client"

import React, { useRef, useState } from "react"
import { Volume2, VolumeX, Play, Pause } from "lucide-react"

export default function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isMuted, setIsMuted] = useState(true)
  const [isPlaying, setIsPlaying] = useState(true)

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted
      setIsMuted(videoRef.current.muted)
    }
  }

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play().catch(() => {})
      }
      setIsPlaying(!isPlaying)
    }
  }

  return (
    <div 
      className="glass-panel" 
      style={{
        maxWidth: "1000px",
        margin: "0 auto",
        padding: 0,
        borderRadius: "16px",
        overflow: "hidden",
        border: "1px solid var(--border)",
        boxShadow: "0 24px 60px rgba(0,0,0,0.12)",
        position: "relative"
      }}
    >
      {/* Mock Browser Header */}
      <div 
        style={{
          display: "flex",
          alignItems: "center",
          padding: "12px 20px",
          background: "rgba(0,0,0,0.02)",
          borderBottom: "1px solid var(--border)",
          justifyContent: "space-between"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ display: "inline-block", width: "9px", height: "9px", borderRadius: "50%", background: "#ff5f56" }} />
          <span style={{ display: "inline-block", width: "9px", height: "9px", borderRadius: "50%", background: "#ffbd2e" }} />
          <span style={{ display: "inline-block", width: "9px", height: "9px", borderRadius: "50%", background: "#27c93f" }} />
        </div>
        <div 
          style={{
            fontSize: "11px",
            color: "var(--muted-foreground)",
            fontFamily: "var(--font-mono)",
            fontWeight: 500,
            background: "rgba(0,0,0,0.04)",
            padding: "3px 20px",
            borderRadius: "6px"
          }}
        >
          platform-walkthrough.mp4
        </div>
        <div style={{ width: "42px" }} />
      </div>

      {/* Video Viewport */}
      <div 
        onClick={togglePlay} 
        style={{ 
          position: "relative", 
          cursor: "pointer", 
          background: "#000",
          aspectRatio: "16/9",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        <video
          ref={videoRef}
          src="/hero_trimmed.mp4"
          loop
          muted={isMuted}
          autoPlay
          playsInline
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover"
          }}
        />

        {/* Play/Pause Overlay Indicator when paused */}
        {!isPlaying && (
          <div 
            style={{ 
              position: "absolute", 
              inset: 0, 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center", 
              backgroundColor: "rgba(0,0,0,0.4)" 
            }}
          >
            <div 
              style={{
                display: "grid",
                placeItems: "center",
                width: "64px",
                height: "64px",
                borderRadius: "50%",
                background: "rgba(255,255,255,0.9)",
                color: "#000000",
                boxShadow: "0 8px 24px rgba(0,0,0,0.25)"
              }}
            >
              <Play size={28} fill="currentColor" style={{ marginLeft: "4px" }} />
            </div>
          </div>
        )}

        {/* Floating controls overlays */}
        <div 
          style={{
            position: "absolute",
            bottom: "16px",
            left: "16px",
            right: "16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            pointerEvents: "none"
          }}
        >
          {/* Label indicating status */}
          <div 
            style={{
              background: "rgba(0,0,0,0.7)",
              backdropFilter: "blur(6px)",
              color: "#ffffff",
              padding: "6px 14px",
              borderRadius: "8px",
              fontSize: "11px",
              fontWeight: 650,
              fontFamily: "var(--font-mono)",
              border: "1px solid rgba(255,255,255,0.1)"
            }}
          >
            {isPlaying ? "⏺ DEMO PLAYING" : "⏸ PAUSED"}
          </div>

          {/* Audio control (clickable) */}
          <button
            onClick={toggleMute}
            style={{
              background: "rgba(0,0,0,0.7)",
              backdropFilter: "blur(6px)",
              color: "#ffffff",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "8px",
              width: "36px",
              height: "36px",
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
              pointerEvents: "auto",
              transition: "transform 0.2s"
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.05)" }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)" }}
            title={isMuted ? "Unmute Audio" : "Mute Audio"}
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
        </div>
      </div>

      {/* Caption text */}
      <div 
        style={{
          padding: "16px 20px",
          borderTop: "1px solid var(--border)",
          background: "rgba(0,0,0,0.01)",
          fontSize: "13px",
          color: "var(--muted-foreground)",
          textAlign: "center",
          fontWeight: 500
        }}
      >
        <span><strong>Self-Hosted Infrastructure Spotlight:</strong> Experience the smooth, buffer-free streaming our SDK provides. Engineered with a dynamic ABR (Adaptive Bitrate) system, connection auto-switching is built directly into its core to adjust quality on the fly and eliminate buffering stutters in challenging network environments. (Walkthrough Demo Above in the Player)</span>
      </div>
    </div>
  )
}
