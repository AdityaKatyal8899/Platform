
'use client'

import React, { useMemo } from 'react'
import { ArrowRight, Sparkles, Gauge, ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import ScrollReveal from '@/components/ScrollReveal'
import PipelineDiagram from '@/components/PipelineDiagram'
import SectionIntro from '@/components/SectionIntro'
import HeroVideo from '@/components/HeroVideo'

export default function HomePage() {
  const router = useRouter()
  
  const stats = useMemo(() => [
    { value: 'Lower Infrastructure-Cost', label: 'Customer Owned Infrastructure' }, 
    { value: '< 1minute', label: 'to first playable' }, 
    { value: '4K', label: 'multi-rendition output' }
  ], [])

  return (
    <main>
      {/* Fullscreen Centered Hero Section */}
      <section id="top" className="hero container">
        <ScrollReveal className="hero-copy">
          <div className="announcement">
            <Sparkles size={14} /> Private video infrastructure for teams <ArrowRight size={13} />
          </div>
          <h1>Own Your Video Streaming Infrastructure.<br /><span>Stop Renting It.</span></h1>
          <p className="hero-sub">
            Migrate from expensive third-party video hosts. We deploy a private, high-performance HLS video pipeline directly inside your S3 and Cloudflare accounts. Save up to 80% on video bills.
          </p>
          <div className="hero-actions">
            <Button className="button-primary" onClick={() => router.push('/pricing')}>
              Get setup pricing & subscriptions <ArrowRight data-icon="inline-end" />
            </Button>
            <Button className="button-secondary" onClick={() => router.push('/demo')}>
              Test active quality ABR demo <Gauge size={16} />
            </Button>
          </div>
          <div className="hero-trust">
            <span className="avatar-stack"><i>J</i><i>M</i><i>A</i><i>+</i></span>
            <span>Built for teams who own their stack</span>
          </div>
        </ScrollReveal>
      </section>
      
      {/* Platform Walkthrough Video Demo (appearing right after scroll fold) */}
      <ScrollReveal className="container py-10" style={{ marginBottom: '40px' }}>
        <HeroVideo />
      </ScrollReveal>
      
      {/* Platform Stats panel */}
      <ScrollReveal className="hero-stats container" style={{ marginBottom: '80px' }}>
        {stats.map(stat => (
          <div className="stat" key={stat.label}>
            <strong style={{ fontSize: stat.value.length > 8 ? '20px' : '25px', letterSpacing: stat.value.length > 8 ? 'normal' : '-.05em', lineHeight: stat.value.length > 8 ? '1.4' : '1' }}>
              {stat.value}
            </strong>
            <span>{stat.label}</span>
          </div>
        ))}
        <div className="stat-note">
          <span className="status-dot green" /> Your Infrastructure, Your Cloud
        </div>
      </ScrollReveal>


      {/* What We Do & Benefits showcase grid (Replacing the old blurred bottom cards) */}
      <ScrollReveal className="section container" style={{ borderTop: '1px solid var(--border)', paddingTop: '60px', paddingBottom: '100px' }}>
        <SectionIntro eyebrow="01 / Overview" title="What We Do & Your Benefits" copy="We deploy private video pipelines directly inside your cloud storage accounts. Pay once, own your infrastructure forever." />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', width: '100%', marginTop: '40px' }}>
          
          <div className="glass-panel" style={{ padding: '28px', borderRadius: '12px', borderLeft: '4px solid #8e3f46' }}>
            <strong style={{ display: 'block', fontSize: '11px', color: '#8e3f46', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)' }}>What We Do</strong>
            <h3 style={{ fontSize: '18px', fontWeight: 750, marginTop: '10px', color: '#28583f', letterSpacing: '-0.03em' }}>Deploy Private HLS Pipelines</h3>
            <p style={{ fontSize: '13px', color: 'var(--muted-foreground)', marginTop: '8px', lineHeight: 1.6 }}>
              We set up a self-hosted, hardware-accelerated video transcoding engine directly inside your AWS or Cloudflare environment. You maintain full ownership of the compute resources.
            </p>
          </div>

          <div className="glass-panel" style={{ padding: '28px', borderRadius: '12px', borderLeft: '4px solid #28583f' }}>
            <strong style={{ display: 'block', fontSize: '11px', color: '#28583f', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)' }}>Core Benefit</strong>
            <h3 style={{ fontSize: '18px', fontWeight: 750, marginTop: '10px', color: '#28583f', letterSpacing: '-0.03em' }}>Save huge expenses on Bandwidth Bills</h3>
            <p style={{ fontSize: '13px', color: 'var(--muted-foreground)', marginTop: '8px', lineHeight: 1.6 }}>
              Bypass high SaaS video hosting markup fees. Since the video streams directly from your own S3 buckets and Cloudflare CDN edges, you pay raw infrastructure costs only.
            </p>
          </div>

          <div className="glass-panel" style={{ padding: '28px', borderRadius: '12px', borderLeft: '4px solid #28583f' }}>
            <strong style={{ display: 'block', fontSize: '11px', color: '#28583f', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)' }}>Core Benefit</strong>
            <h3 style={{ fontSize: '18px', fontWeight: 750, marginTop: '10px', color: '#28583f', letterSpacing: '-0.03em' }}>Zero Platform Vendor Lock-in</h3>
            <p style={{ fontSize: '13px', color: 'var(--muted-foreground)', marginTop: '8px', lineHeight: 1.6 }}>
              Get the entire pipeline source code (Contract based), obfuscation templates, and DB triggers. Your video infrastructure is permanently Yours—even if you cancel support.
            </p>
          </div>

        </div>
      </ScrollReveal>
    </main>
  )
}
