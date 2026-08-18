'use client'

import React, { useState, useRef, useMemo, useEffect } from 'react'
import { Upload, Plus, FileVideo, Play, Check, X, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import SectionIntro from '@/components/SectionIntro'
import ScrollReveal from '@/components/ScrollReveal'

export default function DemoPage() {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [stage, setStage] = useState('Ready to process')
  const [dragging, setDragging] = useState(false)
  const [videoOpen, setVideoOpen] = useState(false)
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null)
  const [backendState, setBackendState] = useState<'checking' | 'active' | 'offline'>('checking')
  
  const fileInput = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const pollingIntervalRef = useRef<number | null>(null)
  const timeoutsRef = useRef<number[]>([])

  // Cleanup intervals/timeouts on component unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) window.clearInterval(pollingIntervalRef.current)
      timeoutsRef.current.forEach(t => window.clearTimeout(t))
    }
  }, [])

  // Auto-retrying ping checker for Render free server cold starts
  useEffect(() => {
    let active = true
    let retries = 0
    
    const checkStatus = async () => {
      if (!active) return
      try {
        const controller = new AbortController()
        const id = setTimeout(() => controller.abort(), 3500)
        
        // Ping local or public backend address
        const res = await fetch('https://cowatchtranscoder.onrender.com/api/videos', { signal: controller.signal })
        clearTimeout(id)
        
        if (res.ok && active) {
          setBackendState('active')
          setStage('Ready to transcode')
        }
      } catch (err) {
        if (active) {
          retries += 1
          if (retries < 12) {
            // Check again in 4 seconds to allow cold starting server to wake
            setTimeout(checkStatus, 4000)
          } else {
            setBackendState('offline')
            setStage('Running in simulation mode')
          }
        }
      }
    }
    
    checkStatus()
    return () => { active = false }
  }, [])

  // Dynamic HLS playback support in client browser
  useEffect(() => {
    if (videoOpen && activeVideoUrl && videoRef.current) {
      const video = videoRef.current
      if (activeVideoUrl.endsWith('.m3u8')) {
        import('hls.js').then((HlsModule) => {
          const HlsClass = HlsModule.default
          if (HlsClass.isSupported()) {
            const hls = new HlsClass()
            hls.loadSource(activeVideoUrl)
            hls.attachMedia(video)
            hls.on(HlsClass.Events.MANIFEST_PARSED, () => {
              video.play().catch(() => {})
            })
            return () => {
              hls.destroy()
            }
          } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = activeVideoUrl
            video.play().catch(() => {})
          }
        })
      } else {
        video.src = activeVideoUrl
        video.play().catch(() => {})
      }
    }
  }, [videoOpen, activeVideoUrl])

  const startUpload = async (file?: File) => {
    // Reset previous pipeline states
    if (pollingIntervalRef.current) {
      window.clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }
    timeoutsRef.current.forEach(t => window.clearTimeout(t))
    timeoutsRef.current = []

    setUploading(true)
    setProgress(5)
    setStage('Connecting to local pipeline backend...')
    setActiveVideoUrl(null)

    // Decide which backend API to hit
    let url = 'http://localhost:8000/api/videos/process-local'
    let options: RequestInit = { method: 'POST' }

    if (file) {
      if (file.size > 20 * 1024 * 1024) { 
        setStage('File exceeds 20MB sandbox limit')
        setUploading(false)
        return 
      }
      url = 'http://localhost:8000/api/videos/upload'
      const formData = new FormData()
      formData.append('file', file)
      options = {
        method: 'POST',
        body: formData
      }
      setStage('Uploading original video payload...')
    }

    try {
      const res = await fetch(url, options)
      if (!res.ok) {
        throw new Error(`Server responded with status ${res.status}`)
      }
      const data = await res.json()
      const videoId = data.video_id
      
      setProgress(10)
      setStage('Video queued in pipeline database')

      // Poll the SQLite job state on backend
      let mockProgress = 10
      pollingIntervalRef.current = window.setInterval(async () => {
        try {
          const statusRes = await fetch(`http://localhost:8000/api/videos/${videoId}`)
          if (!statusRes.ok) return
          const statusData = await statusRes.json()
          
          const currentStatus = statusData.status // queued, transcoding, uploading, completed, failed
          const manifestPath = statusData.delivery_url

          if (currentStatus === 'completed') {
            setProgress(100)
            setStage('Pipeline ready')
            setActiveVideoUrl(manifestPath || `http://localhost:8000/videos/${videoId}/master.m3u8`)
            if (pollingIntervalRef.current) {
              window.clearInterval(pollingIntervalRef.current)
              pollingIntervalRef.current = null
            }
          } else if (currentStatus === 'failed') {
            setStage(`Transcoding Error: ${statusData.error || 'SDK process failed'}`)
            setUploading(false)
            if (pollingIntervalRef.current) {
              window.clearInterval(pollingIntervalRef.current)
              pollingIntervalRef.current = null
            }
          } else {
            // Animate progress smoothly inside matching status ranges
            if (currentStatus === 'queued') {
              mockProgress = Math.min(mockProgress + 2, 25)
              setStage('Ingesting video chunks...')
            } else if (currentStatus === 'transcoding') {
              mockProgress = Math.min(mockProgress + 1, 75)
              setStage('Compiling ABR renditions ladder (FFmpeg)...')
            } else if (currentStatus === 'uploading') {
              mockProgress = Math.min(mockProgress + 3, 95)
              setStage('Pushing video segments to storage...')
            }
            setProgress(mockProgress)

            // Early-Play Activation: If progress is >= 30%, stream is playable immediately!
            if (mockProgress >= 30) {
              setActiveVideoUrl(`http://localhost:8000/videos/${videoId}/master.m3u8`)
            }
          }
        } catch (pollErr) {
          console.error('[CoWatch SDK] Status check failed:', pollErr)
        }
      }, 1000)

    } catch (err) {
      console.warn('[CoWatch SDK] Backend offline. Running client-side uploader simulation:', err)
      runClientSideSimulation()
    }
  }

  const runClientSideSimulation = () => {
    setProgress(10)
    setStage('Ingesting File (Simulated)')

    const t1 = window.setTimeout(() => {
      setProgress(38)
      setStage('Transcoding HLS renditions ladder (Simulated)')
      // Early-play unlocked at 30%+ in simulation!
      setActiveVideoUrl('/trimmed_clip.mp4')
    }, 1500)

    const t2 = window.setTimeout(() => {
      setProgress(72)
      setStage('Uploading segment files to AWS (Simulated)')
    }, 3800)

    const t3 = window.setTimeout(() => {
      setProgress(100)
      setStage('Pipeline ready (Simulated)')
      setActiveVideoUrl('/trimmed_clip.mp4')
    }, 6500)

    timeoutsRef.current.push(t1, t2, t3)
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => { 
    event.preventDefault()
    setDragging(false)
    if (event.dataTransfer.files?.[0]) {
      startUpload(event.dataTransfer.files[0])
    }
  }

  const progressLabel = `${progress}%`
  const canPlay = progress >= 30 && activeVideoUrl !== null

  return (
    <main style={{ minHeight: '100vh', paddingTop: '112px', paddingBottom: '80px' }}>
      <ScrollReveal id="sandbox" className="section container">
        <SectionIntro 
          eyebrow="02 / Try it yourself" 
          title="Instant early-play sandbox" 
          copy="Drop a video below and watch CoWatch build a streamable HLS ladder before the full file finishes uploading." 
        />
        
        {/* Render Cold Start Status Banner */}
        <div style={{ marginTop: '24px', width: '100%' }}>
          {backendState === 'checking' && (
            <div style={{ padding: '12px 18px', background: '#edf4fc', border: '1px solid #bce0fd', borderRadius: '8px', color: '#004085', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: 500 }}>
              <span className="spinner" style={{ borderColor: '#bce0fd', borderTopColor: '#004085', margin: 0 }} />
              <span>Getting transcoder ready for you...</span>
            </div>
          )}
          {backendState === 'active' && (
            <div style={{ padding: '12px 18px', background: '#f0f8f1', border: '1px solid #b7d0bd', borderRadius: '8px', color: '#28583f', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: 500 }}>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', background: '#3d9b65', borderRadius: '50%' }} />
              <span>Transcoding server is awake and active. You can upload video files now!</span>
            </div>
          )}
          {backendState === 'offline' && (
            <div style={{ padding: '12px 18px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: 500 }}>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', background: '#94a3b8', borderRadius: '50%' }} />
              <span>Backend server offline. Running sandbox in high-fidelity uploader simulation mode.</span>
            </div>
          )}
        </div>
        
        <div className="sandbox-grid" style={{ marginTop: '30px' }}>
          <div className="upload-column">
            <div 
              className={`upload-zone glass-panel ${uploading ? 'uploading' : ''} ${dragging ? 'dragging' : ''}`} 
              onDragOver={e => { e.preventDefault(); setDragging(true) }} 
              onDragLeave={() => setDragging(false)} 
              onDrop={handleDrop} 
              id="drop-zone" 
              onClick={() => fileInput.current?.click()} 
              role="button" 
              tabIndex={0} 
              onKeyDown={e => e.key === 'Enter' && fileInput.current?.click()}
            >
              <input 
                id="file-input" 
                ref={fileInput} 
                type="file" 
                accept="video/mp4,video/quicktime" 
                className="sr-only" 
                onChange={e => startUpload(e.target.files?.[0])} 
              />
              <div className="upload-icon"><Upload size={23} /></div>
              <strong>{uploading ? 'Processing original video payload' : 'Drop a video file here'}</strong>
              <span>{uploading ? 'CoWatch is preparing your stream...' : 'MP4 or MOV · max 20MB'}</span>
              {!uploading && <div className="upload-cta"><Plus size={14} /> Choose file</div>}
            </div>

            <Button 
              id="btn-process-local" 
              className="sample-button" 
              onClick={e => { e.stopPropagation(); startUpload() }}
            >
              <FileVideo data-icon="inline-end" /> Process Sample Video
            </Button>
            
            <Button 
              id="btn-play" 
              className="play-button" 
              disabled={!canPlay} 
              onClick={() => setVideoOpen(true)}
            >
              <Play data-icon="inline-end" fill="currentColor" /> Play Video
            </Button>
            
            <div className="sandbox-note">
              <Zap size={14} /> First playable rendition becomes available at 30% upload
            </div>
          </div>

          <div id="monitor-panel" className="monitor-card glass-panel">
            <div className="monitor-head">
              <span>PIPELINE MONITOR</span>
              <span className="badge-live"><span className="live-dot" /> {uploading ? 'Processing' : 'Idle'}</span>
            </div>
            
            <div className="progress-track">
              <div id="upload-progress-bar" style={{ width: `${progress}%` }} />
            </div>
            
            <div className="progress-meta">
              <span>{stage}</span>
              <strong id="upload-percent">{progressLabel}</strong>
            </div>
            
            <div className="steps">
              {[
                ['Probing Video', 'Source metadata read'], 
                ['Extracting Thumbnail', 'Poster frame ready'], 
                ['Transcoding segments', `${progress}% · 1080p / 720p / 360p`], 
                ['Pushing to S3/CDN', progress === 100 ? 'Renditions stored on S3' : 'Waiting for renditions']
              ].map(([label, sub], i) => (
                <div className={`step ${i < 2 || (i === 2 && uploading) || (i === 3 && progress === 100) ? 'done' : i === 2 ? 'current' : ''}`} key={label}>
                  <span className="step-marker">
                    {i < 2 || (i === 2 && progress >= 72) || (i === 3 && progress === 100) ? (
                      <Check size={13} />
                    ) : i === 2 && uploading ? (
                      <span className="spinner" />
                    ) : (
                      i + 1
                    )}
                  </span>
                  <div>
                    <strong>{label}</strong>
                    <small>{sub}</small>
                  </div>
                </div>
              ))}
            </div>
            
            <Button 
              className={`play-button ${canPlay ? 'ready' : ''}`} 
              disabled={!canPlay} 
              onClick={() => setVideoOpen(true)}
            >
              <Play size={16} fill="currentColor" /> Play Video
            </Button>
          </div>
        </div>
      </ScrollReveal>

      {videoOpen && (
        <div 
          id="player-modal" 
          className="video-modal" 
          role="dialog" 
          aria-modal="true" 
          aria-label="CoWatch HLS player" 
          onClick={() => setVideoOpen(false)}
        >
          <div className="video-modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <strong>CoWatch HLS output</strong>
              <button id="btn-close-player" onClick={() => setVideoOpen(false)} aria-label="Close player">
                <X />
              </button>
            </div>
            <video 
              ref={videoRef} 
              id="hls-video" 
              controls 
              autoPlay 
              className="modal-video" 
              style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
            />
            <p style={{ marginTop: '12px' }}>Progressive HLS manifest loaded successfully · manifest.m3u8</p>
          </div>
        </div>
      )}
    </main>
  )
}
