'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Check, Sparkles, ArrowRight, Wifi, Play, ChevronDown, MonitorPlay } from 'lucide-react'
import { Button } from '@/components/ui/button'
import SectionIntro from '@/components/SectionIntro'
import ScrollReveal from '@/components/ScrollReveal'
import Link from 'next/link'

export default function PricingPage() {
  // Subscription tier toggle for the simulator: 'Basic' or 'Pro'
  const [simulatorTier, setSimulatorTier] = useState<'Basic' | 'Pro'>('Pro')
  const [network, setNetwork] = useState(6.5)
  const [resolution, setResolution] = useState('Auto')
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [isBuffering, setIsBuffering] = useState(false)
  const [videoSource, setVideoSource] = useState<'nature' | 'action'>('nature')
  const [autoDetect, setAutoDetect] = useState(false)

  const videoMp4Ref = useRef<HTMLVideoElement>(null)
  const videoAbrRef = useRef<HTMLVideoElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const [dropdownOpen, setDropdownOpen] = useState(false)

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  // Calculate dynamic quality resolution for Pro ABR simulator (needs 5.0M for 1080p, 2.0M for 720p, else 360p)
  const abrQuality = network >= 5.0 ? '1080p' : network >= 2.0 ? '720p' : '360p'
  const activeQuality = resolution === 'Auto' ? abrQuality : resolution

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60)
    const secs = Math.floor(time % 60)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Play/pause sync handlers
  const handlePlayToggle = () => {
    if (isPlaying) {
      videoMp4Ref.current?.pause()
      videoAbrRef.current?.pause()
      setIsPlaying(false)
    } else {
      setIsPlaying(true)
    }
  }

  // Time tracking synchronization handler
  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const t = e.currentTarget.currentTime
    setCurrentTime(t)
    
    // Sync other video if it exists
    const other = e.currentTarget === videoMp4Ref.current ? videoAbrRef.current : videoMp4Ref.current
    if (other && Math.abs(other.currentTime - t) > 0.3) {
      other.currentTime = t
    }
  }

  // Mathematically accurate buffering simulator based on required bitrates
  useEffect(() => {
    if (!isPlaying) {
      setIsBuffering(false)
      videoMp4Ref.current?.pause()
      videoAbrRef.current?.pause()
      return
    }

    const activeVideo = simulatorTier === 'Basic' ? videoMp4Ref.current : videoAbrRef.current
    if (!activeVideo) return

    // Required bitrates: Basic needs 4.5 Mbps (1080p), Pro ABR needs min 0.8 Mbps (360p)
    const requiredBitrate = simulatorTier === 'Basic' ? 4.5 : 0.8

    if (network >= requiredBitrate) {
      setIsBuffering(false)
      activeVideo.play().catch(() => {})
      return
    }

    // Toggle play/pause dynamically to simulate realistic video starvation buffering
    const fillRatio = Math.max(0.05, network / requiredBitrate)
    const playDuration = 4000 * fillRatio // play shorter as speed drops
    const pauseDuration = 4000 * (1 - fillRatio) // buffer longer as speed drops

    let active = true
    let timeoutId: any

    const runLoop = () => {
      if (!active) return
      setIsBuffering(false)
      activeVideo.play().catch(() => {})
      
      timeoutId = setTimeout(() => {
        if (!active) return
        setIsBuffering(true)
        activeVideo.pause()
        
        timeoutId = setTimeout(runLoop, pauseDuration)
      }, playDuration)
    }

    runLoop()

    return () => {
      active = false
      clearTimeout(timeoutId)
    }
  }, [network, isPlaying, simulatorTier])

  // Pro Tier source quality switcher effect (restores current time upon loading variant file)
  useEffect(() => {
    if (simulatorTier === 'Pro' && videoAbrRef.current) {
      const t = videoAbrRef.current.currentTime
      const wasPaused = videoAbrRef.current.paused
      const prefix = videoSource === 'nature' ? 'trimmed_clip' : 'demo_action'
      
      const newSrc = activeQuality === '360p' 
        ? `/${prefix}_360p.mp4` 
        : activeQuality === '720p' 
          ? `/${prefix}_720p.mp4` 
          : `/${prefix}.mp4`
          
      if (videoAbrRef.current.getAttribute('src') !== newSrc) {
        videoAbrRef.current.src = newSrc
        videoAbrRef.current.load()
        
        const handleLoaded = () => {
          if (videoAbrRef.current) {
            videoAbrRef.current.currentTime = t
            if (!wasPaused && isPlaying) {
              videoAbrRef.current.play().catch(() => {})
            }
            videoAbrRef.current.removeEventListener('loadedmetadata', handleLoaded)
          }
        }
        videoAbrRef.current.addEventListener('loadedmetadata', handleLoaded)
      }
    }
  }, [activeQuality, isPlaying, simulatorTier, videoSource])

  // Basic Tier source switcher effect (restores current time upon swapping videoSource file)
  useEffect(() => {
    if (simulatorTier === 'Basic' && videoMp4Ref.current) {
      const t = videoMp4Ref.current.currentTime
      const wasPaused = videoMp4Ref.current.paused
      const newSrc = videoSource === 'nature' ? '/trimmed_clip.mp4' : '/demo_action.mp4'
      
      if (videoMp4Ref.current.getAttribute('src') !== newSrc) {
        videoMp4Ref.current.src = newSrc
        videoMp4Ref.current.load()
        
        const handleLoaded = () => {
          if (videoMp4Ref.current) {
            videoMp4Ref.current.currentTime = t
            if (!wasPaused && isPlaying) {
              videoMp4Ref.current.play().catch(() => {})
            }
            videoMp4Ref.current.removeEventListener('loadedmetadata', handleLoaded)
          }
        }
        videoMp4Ref.current.addEventListener('loadedmetadata', handleLoaded)
      }
    }
  }, [videoSource, isPlaying, simulatorTier])

  // Listen to user's actual connection bandwidth to dynamically override simulator speed
  useEffect(() => {
    if (!autoDetect) return

    const updateSpeed = () => {
      if (typeof navigator !== 'undefined' && (navigator as any).connection) {
        const speed = (navigator as any).connection.downlink
        if (speed && typeof speed === 'number') {
          // downlink is in Mbps, map to simulator network state (range: 0.5 - 12.0 Mbps)
          setNetwork(Math.min(12.0, Math.max(0.5, speed)))
        }
      }
    }

    updateSpeed()

    const conn = typeof navigator !== 'undefined' ? (navigator as any).connection : null
    if (conn) {
      conn.addEventListener('change', updateSpeed)
      return () => conn.removeEventListener('change', updateSpeed)
    }

    const intervalId = setInterval(updateSpeed, 2000)
    return () => clearInterval(intervalId)
  }, [autoDetect])

  // Sync state if user switches simulator tier
  useEffect(() => {
    setIsPlaying(false)
    videoMp4Ref.current?.pause()
    videoAbrRef.current?.pause()
  }, [simulatorTier])

  const isAdaptive = activeQuality === '360p' || activeQuality === '720p'
  const videoStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    imageRendering: isAdaptive ? 'pixelated' : 'auto',
    filter: activeQuality === '360p' 
      ? 'blur(2.6px)' 
      : activeQuality === '720p' 
      ? 'blur(1.2px)' 
      : 'none',
    transition: 'filter 0.3s ease, image-rendering 0.1s ease',
  }

  return (
    <main style={{ minHeight: '100vh', paddingTop: '112px', paddingBottom: '80px' }}>
      <ScrollReveal id="pricing" className="section container">
        <SectionIntro 
          eyebrow="03 / Subscription Plans" 
          title="Predictable pricing, zero bandwidth markup" 
          copy="We deploy private HLS transcoding pipelines directly inside your cloud storage accounts. Pay once for setup, get continuous updates and support." 
        />
        
        <div className="pricing-grid" style={{ marginTop: '40px' }}>
          <div 
            className={`pricing-card glass-panel transition-all duration-300 ${
              simulatorTier === 'Basic' 
                ? 'ring-2 ring-[#28583f] border-[#28583f] scale-[1.02] shadow-lg shadow-[#28583f]/5' 
                : 'opacity-50 scale-[0.98]'
            }`}
          >
            <div className="price-head">
              <span>Basic Integration</span>
              <span className="price-pill">Foundation</span>
            </div>
            <div style={{ marginTop: '20px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', flexWrap: 'wrap' }}>
                <strong style={{ fontSize: '42px', fontWeight: 850, color: '#28583f', letterSpacing: '-0.04em', lineHeight: 1 }}>$1,999</strong>
                <span style={{ fontSize: '14px', color: '#65736a', fontWeight: 500 }}>for setup</span>
              </div>
              <div style={{ marginTop: '8px', fontSize: '13px', color: '#8e3f46', fontWeight: 650 }}>
                + $199 / monthly afterwards
              </div>
            </div>
            <p>Everything you need to own and deploy a single-quality transcoding pipeline natively in your private cloud bucket.</p>
            <div className="price-list">
              <span><Check size={15} /> Private transcoding setup (FastAPI/Node)</span>
              <span><Check size={15} /> Private S3 storage & CDN pipeline setup</span>
              <span><Check size={15} /> Progressive video player scripts</span>
              <span><Check size={15} /> Next.js & React player SDK integration</span>
              <span><Check size={15} /> Lifetime access to developer docs & handbook</span>
            </div>
            <Button 
              className="button-secondary full"
              onClick={() => {
                setSimulatorTier('Basic')
                document.getElementById('playback-simulator')?.scrollIntoView({ behavior: 'smooth' })
              }}
            >
              Simulate Basic Stream <ArrowRight data-icon="inline-end" />
            </Button>
          </div>

          <div 
            className={`pricing-card featured glass-panel transition-all duration-300 ${
              simulatorTier === 'Pro' 
                ? 'ring-2 ring-[#28583f] border-[#28583f] scale-[1.02] shadow-lg shadow-[#28583f]/5' 
                : 'opacity-50 scale-[0.98]'
            }`}
          >
            <div className="price-head">
              <span>Pro ABR Integration</span>
              <span className="price-pill violet">Best value</span>
            </div>
            <div style={{ marginTop: '20px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', flexWrap: 'wrap' }}>
                <strong style={{ fontSize: '42px', fontWeight: 850, color: '#28583f', letterSpacing: '-0.04em', lineHeight: 1 }}>$3,499</strong>
                <span style={{ fontSize: '14px', color: '#65736a', fontWeight: 500 }}>for setup</span>
              </div>
              <div style={{ marginTop: '8px', fontSize: '13px', color: '#8e3f46', fontWeight: 650 }}>
                + $399 / monthly afterwards
              </div>
            </div>
            <p>Full multi-rendition HLS adaptive bitrate ladder tuned specifically for your application interface and global streaming scales.</p>
            <div className="price-list">
              <span><Check size={15} /> **Everything in Basic Setup**</span>
              <span><Check size={15} /> Multi-rendition ABR ladder (1080p, 720p, 360p)</span>
              <span><Check size={15} /> Automated HLS segmenting & playlist compilation</span>
              <span><Check size={15} /> Connection speed auto-switching compatibility</span>
              <span><Check size={15} /> Cython/PyArmor build obfuscation templates</span>
              <span><Check size={15} /> Priority developer support & upgrades</span>
            </div>
            <Button 
              className="button-primary full"
              onClick={() => {
                setSimulatorTier('Pro')
                document.getElementById('playback-simulator')?.scrollIntoView({ behavior: 'smooth' })
              }}
            >
              Simulate ABR Stream <ArrowRight data-icon="inline-end" />
            </Button>
          </div>

          {/* Launch Special Promotional Banner */}
          <div className="glass-panel" style={{ 
            marginTop: '32px', 
            padding: '28px', 
            borderRadius: '12px', 
            border: '1px solid #b7d0bd', 
            background: 'linear-gradient(135deg, #f3faf4, #fff)',
            boxShadow: '0 8px 30px rgba(40, 88, 63, 0.05)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '20px'
          }}>
            <div style={{ maxWidth: '680px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#28583f', color: '#fff', fontSize: '10px', fontWeight: 700, padding: '4px 10px', borderRadius: '999px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                <Sparkles size={10} /> Limited Time Launch Special
              </div>
              <h4 style={{ fontSize: '20px', fontWeight: 800, color: '#28583f', margin: '12px 0 6px', letterSpacing: '-0.02em' }}>
                Secure the ABR Integration Pipeline for $1,499
              </h4>
              <p style={{ fontSize: '13px', color: '#52605a', lineHeight: 1.5, margin: 0 }}>
                Lock in your custom private pipeline migration today for a flat launch price of <strong>$1,499</strong> (down from $3,500). You pay the setup promo fee today, and once your self-hosted streaming architecture is fully integrated and tested, you pay the rest after you decide which plan level fits your team's needs (Basic at $199/mo or Pro at $399/mo).
              </p>
            </div>
            <Link href="/contact?plan=Launch">
              <Button 
                className="button-primary" 
                style={{ paddingInline: '24px', height: '46px' }}
              >
                Lock Setup Special <ArrowRight data-icon="inline-end" />
              </Button>
            </Link>
          </div>
        </div>
      </ScrollReveal>

      {/* Interactive Subscription Playback Simulator */}
      <ScrollReveal id="playback-simulator" className="section wide-container" style={{ marginTop: '60px' }}>
        <SectionIntro
          eyebrow="Interactive Sandbox"
          title="Compare Playback Experience By Tier"
          copy="Select a subscription tier below and drag the speed slider. See how a Basic MP4 stream freezes under low bandwidth, while Pro ABR dynamically adapts to keep streaming smooth."
        />

        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', margin: '30px 0' }}>
          <button
            onClick={() => setSimulatorTier('Basic')}
            style={{
              padding: '10px 24px',
              borderRadius: '8px',
              border: '1px solid #b7d0bd',
              background: simulatorTier === 'Basic' ? '#28583f' : '#fff',
              color: simulatorTier === 'Basic' ? '#fff' : '#28583f',
              fontWeight: 650,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(40,88,63,0.06)',
              transition: 'all 0.2s'
            }}
          >
            Basic Plan Simulator
          </button>
          <button
            onClick={() => setSimulatorTier('Pro')}
            style={{
              padding: '10px 24px',
              borderRadius: '8px',
              border: '1px solid #b7d0bd',
              background: simulatorTier === 'Pro' ? '#28583f' : '#fff',
              color: simulatorTier === 'Pro' ? '#fff' : '#28583f',
              fontWeight: 650,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(40,88,63,0.06)',
              transition: 'all 0.2s'
            }}
          >
            Pro ABR Plan Simulator
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginBottom: '32px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted-foreground)', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
            Select Demo Stream:
          </span>
          <div style={{ 
            display: 'flex', 
            background: 'rgba(0,0,0,0.03)', 
            padding: '3px', 
            borderRadius: '10px', 
            border: '1px solid var(--border)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.01)'
          }}>
            <button
              onClick={() => setVideoSource('nature')}
              style={{
                padding: '6px 16px',
                border: 0,
                borderRadius: '8px',
                background: videoSource === 'nature' ? 'var(--selected-bg, #28583f)' : 'transparent',
                color: videoSource === 'nature' ? 'var(--selected-fg, #ffffff)' : '#697a70',
                fontSize: '11px',
                fontWeight: 650,
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontFamily: 'var(--font-mono)'
              }}
              onMouseEnter={(e) => { if (videoSource !== 'nature') e.currentTarget.style.color = '#3d9b65' }}
              onMouseLeave={(e) => { if (videoSource !== 'nature') e.currentTarget.style.color = '#697a70' }}
            >
              Nature Scenic
            </button>
            <button
              onClick={() => setVideoSource('action')}
              style={{
                padding: '6px 16px',
                border: 0,
                borderRadius: '8px',
                background: videoSource === 'action' ? 'var(--selected-bg, #28583f)' : 'transparent',
                color: videoSource === 'action' ? 'var(--selected-fg, #ffffff)' : '#697a70',
                fontSize: '11px',
                fontWeight: 650,
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontFamily: 'var(--font-mono)'
              }}
              onMouseEnter={(e) => { if (videoSource !== 'action') e.currentTarget.style.color = '#3d9b65' }}
              onMouseLeave={(e) => { if (videoSource !== 'action') e.currentTarget.style.color = '#697a70' }}
            >
              Action Film
            </button>
          </div>
        </div>

        <div className="demo-grid" style={{ gridTemplateColumns: '1fr', maxWidth: '1360px', margin: '0 auto' }}>
          {simulatorTier === 'Basic' ? (
            /* Basic Stream Player Card */
            <div className="player-card glass-panel" style={{ width: '100%' }}>
              <div className="player-top">
                <span>
                  <span className="status-dot red" /> 
                  Basic Integration Playback (Standard single-file MP4)
                </span>
                <span className="muted">Single Resolution</span>
              </div>
              
              <div className="video-screen frozen" onClick={handlePlayToggle} style={{ cursor: 'pointer', position: 'relative' }}>
                <video 
                  ref={videoMp4Ref} 
                  src="/trimmed_clip.mp4" 
                  loop 
                  muted 
                  playsInline 
                  style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }}
                  onTimeUpdate={handleTimeUpdate}
                />
                {(!isPlaying || isBuffering) && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(1px)' }}>
                    {isBuffering && isPlaying ? (
                      <>
                        <div className="play-orb"><Wifi size={24} className="animate-pulse" /></div>
                        <div className="buffering"><span className="spinner" /> Buffering... (No adaptive fallbacks)</div>
                      </>
                    ) : (
                      <div className="play-orb"><Play size={22} fill="currentColor" /></div>
                    )}
                  </div>
                )}
                <div className="video-time">
                  {formatTime(currentTime)} / 02:00
                </div>
              </div>
              
              <div className="player-caption">
                <span>1080p Source · 4.5 Mbps required</span>
                <span className={network < 4.5 ? 'danger-text' : 'success-text'}>
                  {network < 4.5 ? 'Bandwidth starvation: Playback Stuttering' : 'Playing raw MP4 file'}
                </span>
              </div>
            </div>
          ) : (
            /* Pro ABR Player Card */
            <div className="player-card glass-panel abr-card" style={{ width: '100%' }}>
              <div className="player-top">
                <span>
                  <span className="status-dot green" /> 
                  Pro ABR Playback (HLS Dynamic Transcoding)
                </span>
                <div className="custom-select-container" ref={dropdownRef} style={{ position: 'relative', display: 'inline-block', zIndex: 30 }}>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setDropdownOpen(!dropdownOpen) }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '6px 12px',
                      background: '#ffffff',
                      border: '1px solid #b7d0bd',
                      borderRadius: '6px',
                      color: '#28583f',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      boxShadow: '0 2px 4px rgba(33,53,40,0.03)',
                      transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#8eb89b' }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#b7d0bd' }}
                  >
                    <span>{resolution === 'Auto' ? 'Auto' : resolution}</span>
                    <ChevronDown size={13} style={{ color: '#3d9b65' }} />
                  </button>
                  {dropdownOpen && (
                    <div 
                      style={{
                        position: 'absolute',
                        top: '100%',
                        right: 0,
                        marginTop: '4px',
                        background: '#ffffff',
                        border: '1px solid #b7d0bd',
                        borderRadius: '8px',
                        boxShadow: '0 4px 16px rgba(33,53,40,0.12)',
                        width: '130px',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        animation: 'fade-up 0.15s ease-out'
                      }}
                    >
                      {['Auto', '1080p (Source)', '720p', '360p'].map((opt) => (
                        <button
                          key={opt}
                          onClick={(e) => {
                            e.stopPropagation()
                            setResolution(opt)
                            setDropdownOpen(false)
                          }}
                          style={{
                            padding: '8px 12px',
                            background: resolution === opt ? '#edf6ee' : 'transparent',
                            border: 0,
                            color: '#28583f',
                            fontSize: '12px',
                            fontWeight: resolution === opt ? 700 : 500,
                            textAlign: 'left',
                            cursor: 'pointer',
                            transition: 'background 0.15s ease',
                            width: '100%'
                          }}
                          onMouseEnter={(e) => {
                            if (resolution !== opt) e.currentTarget.style.background = '#f7faf8'
                          }}
                          onMouseLeave={(e) => {
                            if (resolution !== opt) e.currentTarget.style.background = 'transparent'
                          }}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <span className="abr-annotation">Auto-adjusts stream resolution dynamically</span>
              </div>
              
              <div className="video-screen playing" onClick={handlePlayToggle} style={{ cursor: 'pointer', position: 'relative' }}>
                <div className="video-grid-lines" />
                
                {/* Active Quality Badge overlay */}
                {isPlaying && (
                  <div 
                    style={{
                      position: 'absolute',
                      top: '14px',
                      left: '14px',
                      zIndex: 5,
                      background: activeQuality === '1080p' 
                        ? 'rgba(61, 155, 101, 0.85)' 
                        : activeQuality === '720p' 
                        ? 'rgba(234, 179, 8, 0.85)' 
                        : 'rgba(220, 38, 38, 0.85)',
                      color: '#ffffff',
                      padding: '4px 10px',
                      borderRadius: '999px',
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      transition: 'background 0.3s ease'
                    }}
                  >
                    <span 
                      style={{ 
                        display: 'inline-block', 
                        width: '6px', 
                        height: '6px', 
                        borderRadius: '50%', 
                        background: '#ffffff',
                        animation: activeQuality === '1080p' ? 'soft-pulse 2s infinite' : 'none'
                      }} 
                    />
                    <span>{activeQuality} Playback</span>
                  </div>
                )}

                <video 
                  ref={videoAbrRef} 
                  src="/trimmed_clip.mp4" 
                  loop 
                  muted 
                  playsInline 
                  style={videoStyle}
                  onTimeUpdate={handleTimeUpdate}
                />
                {(!isPlaying || isBuffering) && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.25)', backdropFilter: isBuffering ? 'blur(1px)' : 'none' }}>
                    {isBuffering ? (
                      <>
                        <div className="play-orb green-orb"><Wifi size={24} className="animate-pulse" /></div>
                        <div className="buffering" style={{ color: '#5ebd85' }}><span className="spinner" style={{ borderColor: 'rgba(61,155,101,0.2)', borderTopColor: '#3d9b65' }} /> Buffering... (Slow 3G limit)</div>
                      </>
                    ) : (
                      <div className="play-orb green-orb"><Play size={22} fill="currentColor" /></div>
                    )}
                  </div>
                )}
                {isPlaying && !isBuffering && (
                  <div className="playing-label">
                    <span className="equalizer"><i /><i /><i /><i /></span> Playing smoothly
                  </div>
                )}
                <div className="video-time">
                  {formatTime(currentTime)} / 02:00
                </div>
              </div>
              
              <div className="player-caption">
                <span>{resolution === 'Auto' ? `${abrQuality} (Auto-Switched)` : resolution} · HLS Adaptive</span>
                <span className={isBuffering ? 'danger-text' : 'success-text'}>
                  {isBuffering ? 'Bandwidth starved: buffering' : 'Streaming uninterrupted'}
                </span>
              </div>
            </div>
          )}
          {/* Network speed slider controller */}
          <div className="range-control glass-panel" style={{ width: '100%', marginTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '14px' }}>
              <div className="range-label" style={{ margin: 0 }}>
                <span><Wifi size={16} /> Connection speed</span>
                <strong>{network >= 5.0 ? 'Fast Connection (1080p)' : network >= 2.0 ? 'Moderate Connection (720p)' : 'Slow Connection (360p)'} <span>{network.toFixed(1)} Mbps</span></strong>
              </div>
              
              {/* Auto-Detect Switcher Toggle */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '11px', fontWeight: 700, color: 'var(--muted-foreground)', letterSpacing: '0.04em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                <input 
                  type="checkbox" 
                  checked={autoDetect}
                  onChange={(e) => setAutoDetect(e.target.checked)}
                  style={{ width: 'auto', margin: 0, accentColor: '#28583f' }}
                />
                <span>Auto-Detect My Bandwidth</span>
              </label>
            </div>
            <input 
              type="range" 
              min="0.5" 
              max="12.0" 
              step="0.1"
              value={network} 
              onChange={e => setNetwork(Number(e.target.value))} 
              disabled={autoDetect}
              style={{ 
                opacity: autoDetect ? 0.45 : 1, 
                cursor: autoDetect ? 'not-allowed' : 'pointer',
                transition: 'opacity 0.2s ease'
              }}
              aria-label="Network speed" 
            />
            <div className="range-ends">
              <span>{autoDetect ? 'Real-Time Auto-Tracking Mode' : 'Slow 3G (0.5 Mbps)'}</span>
              <span>{autoDetect ? '🟢 ACTIVE' : 'Fast Broadband (12.0 Mbps)'}</span>
            </div>
          </div>
      </div>
    </ScrollReveal>

      {/* Final closing CTA */}
      <section className="section container pt-0" style={{ marginTop: '60px' }}>
        <div className="final-cta">
          <div>
            <span className="eyebrow">Ready when you are</span>
            <h3>Make video infrastructure<br /><span>your competitive edge.</span></h3>
          </div>
          <Link href="/contact?plan=Launch">
            <Button className="button-primary">
              Talk to an engineer <ArrowRight data-icon="inline-end" />
            </Button>
          </Link>
        </div>
      </section>
    </main>
  )
}
