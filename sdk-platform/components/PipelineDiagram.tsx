import React from 'react'
import { Upload, Settings2, Database, Cloud, Play } from 'lucide-react'

export default function PipelineDiagram() {
  const nodes = [
    { icon: Upload, label: 'Video Ingest', sub: 'S3 upload' }, 
    { icon: Settings2, label: 'FFmpeg Node', sub: 'Transcoder' }, 
    { icon: Database, label: 'S3 Bucket', sub: 'Your storage' }, 
    { icon: Cloud, label: 'Cloudflare', sub: 'CDN edge' }, 
    { icon: Play, label: 'ABR Player', sub: 'Any device' }
  ]
  
  return (
    <div className="pipeline-card glass-panel">
      {/* Self-contained styling for high-performance keyframe animations */}
      <style>{`
        @keyframes flow {
          0% { left: -20px; }
          100% { left: 50px; }
        }
        @keyframes spin-slow {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes active-pulse {
          0%, 100% { border-color: #8eb89b; box-shadow: 0 0 0 0 rgba(40, 88, 63, 0.18); }
          50% { border-color: #3d9b65; box-shadow: 0 0 0 8px rgba(40, 88, 63, 0.05); }
        }
        .pipeline-node.active {
          animation: active-pulse 2.2s infinite ease-in-out;
        }
        .pipeline-node.active svg {
          animation: spin-slow 8s infinite linear;
        }
      `}</style>

      <div className="pipeline-head">
        <span className="live-dot" /> Live pipeline 
        <span className="pipeline-meta">5 stages · 00:02:41</span>
      </div>
      <div className="pipeline-nodes">
        {nodes.map((node, i) => { 
          const Icon = node.icon
          return (
            <div className="pipeline-node-wrap" key={node.label}>
              <div className={`pipeline-node ${i === 1 ? 'active' : ''}`}>
                <Icon size={26} />
                <strong>{node.label}</strong>
                <small>{node.sub}</small>
              </div>
              {i < nodes.length - 1 && (
                <div style={{ 
                  position: 'relative', 
                  width: '40px', 
                  height: '3px', 
                  background: '#e2e8e2', 
                  margin: '0 8px', 
                  overflow: 'hidden',
                  borderRadius: '999px',
                  flexShrink: 0
                }}>
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '16px',
                    height: '100%',
                    background: 'linear-gradient(90deg, transparent, #28583f, transparent)',
                    animation: 'flow 1.8s infinite linear',
                    animationDelay: `${i * 0.35}s`
                  }} />
                </div>
              )}
            </div>
          )
        })}
      </div>
      <div className="pipeline-foot">
        <span><span className="status-dot green" /> 4 renditions ready</span>
        <span className="mono">manifest.m3u8</span>
      </div>
    </div>
  )
}
