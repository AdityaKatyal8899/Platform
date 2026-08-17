'use client'

import React, { useState } from 'react'
import { ArrowRight, Check, Settings, Key, ShieldAlert, Database, BookOpen, FileCheck, ShieldCheck, Cpu, Cloud, Send, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import SectionIntro from '@/components/SectionIntro'
import Link from 'next/link'

export default function DocsPage() {
  return (
    <main style={{ minHeight: '100vh', paddingTop: '112px', paddingBottom: '80px' }}>
      
      {/* Introduction */}
      <section id="intro" className="section container reveal-on-scroll is-visible" style={{ paddingBottom: '30px' }}>
        <SectionIntro 
          eyebrow="04 / How It Works" 
          title="Integration Process & Roadmap" 
          copy="CoWatch is a fully guided infrastructure integration service. We deploy a private video streaming pipeline directly inside your cloud accounts, eliminating SaaS bandwidth markups." 
        />
      </section>

      {/* 1. What We Give You (Deliverables Grid) */}
      <section className="container reveal-on-scroll is-visible" style={{ borderTop: '1px solid var(--border)', paddingTop: '50px', paddingBottom: '50px' }}>
        <SectionIntro 
          eyebrow="Part 1" 
          title="What We Give You" 
          copy="Upon purchasing the setup, CoWatch engineers deploy and deliver the complete codebase and configurations to your team." 
        />
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginTop: '40px' }}>
          
          <div className="glass-panel" style={{ padding: '24px', borderRadius: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#28583f' }}>
              <span style={{ padding: '8px', background: '#edf6ee', borderRadius: '8px', display: 'grid', placeItems: 'center' }}><Settings size={18} /></span>
              <strong style={{ fontSize: '15px' }}>Production Pipeline Code</strong>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--muted-foreground)', marginTop: '10px', lineHeight: 1.6 }}>
              Full transcoder server source code implemented in Python/FastAPI using hardware-accelerated FFmpeg profiles.
            </p>
          </div>

          <div className="glass-panel" style={{ padding: '24px', borderRadius: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#28583f' }}>
              <span style={{ padding: '8px', background: '#edf6ee', borderRadius: '8px', display: 'grid', placeItems: 'center' }}><Key size={18} /></span>
              <strong style={{ fontSize: '15px' }}>S3 CORS & Security Policies</strong>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--muted-foreground)', marginTop: '10px', lineHeight: 1.6 }}>
              Pre-configured AWS S3 and Cloudflare R2 bucket policies to restrict access and configure secure streaming headers.
            </p>
          </div>

          <div className="glass-panel" style={{ padding: '24px', borderRadius: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#28583f' }}>
              <span style={{ padding: '8px', background: '#edf6ee', borderRadius: '8px', display: 'grid', placeItems: 'center' }}><ShieldAlert size={18} /></span>
              <strong style={{ fontSize: '15px' }}>Obfuscation Templates</strong>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--muted-foreground)', marginTop: '10px', lineHeight: 1.6 }}>
              Cython building scripts and PyArmor configs to compile your pipeline files, preventing reverse-engineering.
            </p>
          </div>

          <div className="glass-panel" style={{ padding: '24px', borderRadius: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#28583f' }}>
              <span style={{ padding: '8px', background: '#edf6ee', borderRadius: '8px', display: 'grid', placeItems: 'center' }}><Database size={18} /></span>
              <strong style={{ fontSize: '15px' }}>SQL Schema Definitions</strong>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--muted-foreground)', marginTop: '10px', lineHeight: 1.6 }}>
              Database schemas (PostgreSQL/MySQL) to log upload tasks, job states, resolution tracks, and playback files.
            </p>
          </div>

          <div className="glass-panel" style={{ padding: '24px', borderRadius: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#28583f' }}>
              <span style={{ padding: '8px', background: '#edf6ee', borderRadius: '8px', display: 'grid', placeItems: 'center' }}><BookOpen size={18} /></span>
              <strong style={{ fontSize: '15px' }}>Deployment Playbooks</strong>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--muted-foreground)', marginTop: '10px', lineHeight: 1.6 }}>
              Detailed installation playbooks for Docker Compose, systemd unit services, and automated updates.
            </p>
          </div>

          <div className="glass-panel" style={{ padding: '24px', borderRadius: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#28583f' }}>
              <span style={{ padding: '8px', background: '#edf6ee', borderRadius: '8px', display: 'grid', placeItems: 'center' }}><FileCheck size={18} /></span>
              <strong style={{ fontSize: '15px' }}>Webhook Orchestrations</strong>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--muted-foreground)', marginTop: '10px', lineHeight: 1.6 }}>
              Status payloads, callback scripts, and hook payloads to update your core product DB when transcoding finishes.
            </p>
          </div>

        </div>
      </section>

      {/* 2. What You Will Be Doing (Action Steps Timeline) */}
      <section className="container reveal-on-scroll is-visible" style={{ borderTop: '1px solid var(--border)', paddingTop: '65px', paddingBottom: '50px' }}>
        <SectionIntro 
          eyebrow="Part 2" 
          title="What You Will Be Doing" 
          copy="Integrate the private video pipeline into your main platform in four straightforward steps." 
        />
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '40px', maxWidth: '900px', marginInline: 'auto' }}>
          
          <div className="glass-panel" style={{ display: 'flex', gap: '20px', padding: '24px', borderRadius: '12px', alignItems: 'flex-start' }}>
            <div style={{ padding: '12px', background: '#edf6ee', borderRadius: '10px', color: '#28583f', display: 'grid', placeItems: 'center' }}>
              <ShieldCheck size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '10px', fontStyle: 'normal', color: '#8e3f46', fontFamily: 'var(--font-mono)', fontWeight: 600, border: '1px solid #d8a6aa', padding: '2px 8px', borderRadius: '4px' }}>STEP 1</span>
                <h4 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Provision Cloud Credentials</h4>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--muted-foreground)', marginTop: '8px', lineHeight: 1.5 }}>
                Set up a secure IAM user in AWS or Cloudflare R2 with restricted read/write access. We use these credentials to configure the uploader to push `.ts` video segments directly to your private buckets.
              </p>
            </div>
          </div>

          <div className="glass-panel" style={{ display: 'flex', gap: '20px', padding: '24px', borderRadius: '12px', alignItems: 'flex-start' }}>
            <div style={{ padding: '12px', background: '#edf6ee', borderRadius: '10px', color: '#28583f', display: 'grid', placeItems: 'center' }}>
              <Cloud size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '10px', fontStyle: 'normal', color: '#8e3f46', fontFamily: 'var(--font-mono)', fontWeight: 600, border: '1px solid #d8a6aa', padding: '2px 8px', borderRadius: '4px' }}>STEP 2</span>
                <h4 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Configure DNS Subdomain</h4>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--muted-foreground)', marginTop: '8px', lineHeight: 1.5 }}>
                Map a sub-domain (e.g. <code style={{ color: '#28583f' }}>stream.yourdomain.com</code>) to point to the Cloudflare CDN edge of your S3 storage bucket, ensuring low latency global delivery.
              </p>
            </div>
          </div>

          <div className="glass-panel" style={{ display: 'flex', gap: '20px', padding: '24px', borderRadius: '12px', alignItems: 'flex-start' }}>
            <div style={{ padding: '12px', background: '#edf6ee', borderRadius: '10px', color: '#28583f', display: 'grid', placeItems: 'center' }}>
              <Send size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '10px', fontStyle: 'normal', color: '#8e3f46', fontFamily: 'var(--font-mono)', fontWeight: 600, border: '1px solid #d8a6aa', padding: '2px 8px', borderRadius: '4px' }}>STEP 3</span>
                <h4 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Provide Webhook Endpoint</h4>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--muted-foreground)', marginTop: '8px', lineHeight: 1.5 }}>
                Provide a secure endpoint in your main application (Node, Ruby, Python, Go) that listens to transcoding callbacks. When a video segment compiles, we hit your webhook to update video metadata in your database.
              </p>
            </div>
          </div>

          <div className="glass-panel" style={{ display: 'flex', gap: '20px', padding: '24px', borderRadius: '12px', alignItems: 'flex-start' }}>
            <div style={{ padding: '12px', background: '#edf6ee', borderRadius: '10px', color: '#28583f', display: 'grid', placeItems: 'center' }}>
              <Smartphone size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '10px', fontStyle: 'normal', color: '#8e3f46', fontFamily: 'var(--font-mono)', fontWeight: 600, border: '1px solid #d8a6aa', padding: '2px 8px', borderRadius: '4px' }}>STEP 4</span>
                <h4 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Embed Streaming Players</h4>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--muted-foreground)', marginTop: '8px', lineHeight: 1.5 }}>
                Configure your React, iOS, Android, or standard HTML5 player to load the HLS `.m3u8` manifest file URL. Hls.js automatically manages on-the-fly resolution shifts based on connection speed.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* Access Call to Action */}
      <section className="section container reveal-on-scroll is-visible pt-0" style={{ marginTop: '50px' }}>
        <div className="final-cta">
          <div>
            <span className="eyebrow">Start your migration</span>
            <h3>Ready to own your video<br /><span>streaming backend?</span></h3>
          </div>
          <Link href="/contact?plan=Launch">
            <Button className="button-primary">
              Get Setup Integration <ArrowRight data-icon="inline-end" />
            </Button>
          </Link>
        </div>
      </section>
    </main>
  )
}
