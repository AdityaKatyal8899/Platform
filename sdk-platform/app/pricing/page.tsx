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
  const [network, setNetwork] = useState(78)
  const [resolution, setResolution] = useState('Auto')
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)

  const videoMp4Ref = useRef<HTMLVideoElement>(null)
  const videoAbrRef = useRef<HTMLVideoElement>(null)

  // Calculate dynamic quality resolution for Pro ABR simulator
  const abrQuality = network > 65 ? '1080p' : network > 38 ? '720p' : '360p'
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
      if (simulatorTier === 'Basic') {
        if (network > 38) {
          videoMp4Ref.current?.play().catch(() => {})
        }
      } else {
        videoAbrRef.current?.play().catch(() => {})
      }
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

  // Basic Tier buffering simulator effect
  useEffect(() => {
    if (simulatorTier === 'Basic') {
      if (network <= 38) {
        videoMp4Ref.current?.pause()
      } else if (isPlaying) {
        videoMp4Ref.current?.play().catch(() => {})
      }
    }
  }, [network, isPlaying, simulatorTier])

  // Pro Tier source quality switcher effect (restores current time upon loading variant file)
  useEffect(() => {
    if (simulatorTier === 'Pro' && videoAbrRef.current) {
      const t = videoAbrRef.current.currentTime
      const wasPaused = videoAbrRef.current.paused
      
      const newSrc = activeQuality === '360p' 
        ? '/trimmed_clip_360p.mp4' 
        : activeQuality === '720p' 
          ? '/trimmed_clip_720p.mp4' 
          : '/trimmed_clip.mp4'
          
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
  }, [activeQuality, isPlaying, simulatorTier])

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
    transition: 'image-rendering 0.1s ease',
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
                <strong style={{ fontSize: '42px', fontWeight: 850, color: '#28583f', letterSpacing: '-0.04em', lineHeight: 1 }}>$3,500</strong>
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
                {(!isPlaying || network <= 38) && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(1px)' }}>
                    {network <= 38 && isPlaying ? (
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
                <span>2K Source · 8.2 Mbps</span>
                <span className="danger-text">{network <= 38 ? 'Bandwidth drop: Playback Frozen' : 'Playing raw MP4 file'}</span>
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
                <label className="select-wrap">
                  <select 
                    id="quality-select" 
                    value={resolution} 
                    onChange={e => setResolution(e.target.value)} 
                    aria-label="Video resolution"
                  >
                    <option>Auto</option>
                    <option>1080p (Source)</option>
                    <option>720p</option>
                    <option>360p</option>
                  </select>
                  <ChevronDown size={13} />
                </label>
                <span className="abr-annotation">Auto-adjusts stream resolution dynamically</span>
              </div>
              
              <div className="video-screen playing" onClick={handlePlayToggle} style={{ cursor: 'pointer', position: 'relative' }}>
                <div className="video-grid-lines" />
                <video 
                  ref={videoAbrRef} 
                  src="/trimmed_clip.mp4" 
                  loop 
                  muted 
                  playsInline 
                  style={videoStyle}
                  onTimeUpdate={handleTimeUpdate}
                />
                {!isPlaying && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.2)' }}>
                    <div className="play-orb green-orb"><Play size={22} fill="currentColor" /></div>
                  </div>
                )}
                {isPlaying && (
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
                <span className="success-text">Streaming uninterrupted</span>
              </div>
            </div>
          )}

          {/* Network speed slider controller */}
          <div className="range-control glass-panel" style={{ width: '100%', marginTop: '16px' }}>
            <div className="range-label">
              <span><Wifi size={16} /> Simulate user connection bandwidth</span>
              <strong>{network > 70 ? 'Fast Connection' : network > 40 ? 'Moderate Connection' : 'Slow Connection'} <span>{network} Mbps</span></strong>
            </div>
            <input 
              type="range" 
              min="8" 
              max="100" 
              value={network} 
              onChange={e => setNetwork(Number(e.target.value))} 
              aria-label="Network speed" 
            />
            <div className="range-ends">
              <span>Weak 3G (8 Mbps)</span>
              <span>High-speed Fiber (100 Mbps)</span>
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
