'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Send, Calendar, CheckCircle, ArrowRight, Sparkles, MessageSquare, ShieldCheck, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import SectionIntro from '@/components/SectionIntro'
import ScrollReveal from '@/components/ScrollReveal'

// Separate search params component to satisfy Next.js Suspense requirements
function ContactFormContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const initialPlan = searchParams.get('plan') || 'Launch'
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [plan, setPlan] = useState<string>(initialPlan)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [animateKey, setAnimateKey] = useState(0) // Trigger template switch animations

  // Pre-crafted email templates
  const templates: Record<string, string> = {
    Basic: `Hi CoWatch Team,

I am interested in migrating our video infrastructure to the CoWatch Basic Integration Plan.

Setup details:
- Plan: Basic Integration ($1,999 setup fee)
- Support: $199/month afterwards
- Cloud target: Private S3 Bucket + Cloudflare CDN

Please contact me to schedule a technical review and initiate the migration setup.

Best regards,`,
    Pro: `Hi CoWatch Team,

I am interested in migrating our video infrastructure to the CoWatch Pro ABR Integration Plan.

Setup details:
- Plan: Pro ABR Integration ($3,500 setup fee)
- Support: $399/month afterwards
- Cloud target: Private S3 + Multi-rendition ABR (1080p, 720p, 360p) + CDN edge

Please contact me to schedule a technical review and initiate the migration setup.

Best regards,`,
    Launch: `Hi CoWatch Team,

I would like to lock in the Limited Time Launch Special offer for the ABR Integration Pipeline.

Setup details:
- Plan: Launch Special Promo ($1,499 setup fee today)
- Support: $199/mo or $399/mo afterwards (to be decided after integration testing)
- Cloud target: Private self-hosted HLS transcoding pipeline

Please lock in this launch discount for us and contact me to coordinate the setup.

Best regards,`
  }

  // Sync state if search parameter changes
  useEffect(() => {
    const p = searchParams.get('plan')
    if (p && (p === 'Basic' || p === 'Pro' || p === 'Launch')) {
      setPlan(p)
    }
  }, [searchParams])

  // Regenerate template text when plan or name changes
  useEffect(() => {
    const greeting = name ? name : '[Your Name]'
    const baseTemplate = templates[plan] || templates['Launch']
    setMessage(`${baseTemplate}\n${greeting}`)
    setAnimateKey(prev => prev + 1) // Trigger animation trigger
  }, [plan, name])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setSubmitting(true)
    try {
      const res = await fetch('http://localhost:8000/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, first_name: name || 'Developer' })
      })

      if (res.ok) {
        setSubmitted(true)
      } else {
        throw new Error('Server returned error')
      }
    } catch (err) {
      console.warn('[CoWatch SDK] Lead API offline. Launching local mail client:', err)
      
      // Fallback: trigger local mailto window with pre-crafted template message
      const mailtoUrl = `mailto:cowatchservices@gmail.com?subject=CoWatch Integration setup: ${plan}&body=${encodeURIComponent(message)}`
      window.open(mailtoUrl)
      
      setSubmitted(true)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="sandbox-grid" style={{ marginTop: '40px' }}>
      
      {/* Tab/Form Section */}
      <div className="upload-column">
        <div className="glass-panel" style={{ padding: '32px', border: 'none', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#28583f', margin: '0 0 20px', letterSpacing: '-0.02em' }}>
            Choose Integration Scope
          </h3>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '12px', color: '#65736a', fontWeight: 650 }}>Selected Plan</label>
              
              <div style={{ position: 'relative', width: '100%' }}>
                <button
                  type="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #b7d0bd',
                    borderRadius: '6px',
                    fontSize: '13px',
                    background: '#f3faf4',
                    color: '#28583f',
                    fontWeight: 600,
                    textAlign: 'left',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    outline: 'none',
                    boxShadow: dropdownOpen ? '0 0 0 3px rgba(40, 88, 63, 0.12)' : 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  <span>
                    {plan === 'Launch' ? 'Launch Special ($1,499 Setup + Monthly Afterwards)' : 
                     plan === 'Basic' ? 'Basic Integration ($1,999 Setup + $199/mo Support)' : 
                     'Pro ABR Integration ($3,500 Setup + $399/mo Support)'}
                  </span>
                  <ChevronDown size={16} style={{ transform: dropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', color: '#28583f' }} />
                </button>

                {dropdownOpen && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: '6px',
                    background: '#fff',
                    border: '1px solid #b7d0bd',
                    borderRadius: '8px',
                    boxShadow: '0 10px 25px rgba(20, 34, 26, 0.1)',
                    zIndex: 50,
                    overflow: 'hidden',
                    animation: 'fade-up 0.15s ease-out both'
                  }}>
                    {[
                      { value: 'Launch', label: 'Launch Special ($1,499 Setup + Monthly Afterwards)' },
                      { value: 'Basic', label: 'Basic Integration ($1,999 Setup + $199/mo Support)' },
                      { value: 'Pro', label: 'Pro ABR Integration ($3,500 Setup + $399/mo Support)' }
                    ].map(opt => (
                      <div
                        key={opt.value}
                        onClick={() => {
                          setPlan(opt.value)
                          setDropdownOpen(false)
                        }}
                        style={{
                          padding: '11px 14px',
                          fontSize: '13px',
                          fontWeight: plan === opt.value ? 700 : 500,
                          color: plan === opt.value ? '#fff' : '#28583f',
                          background: plan === opt.value ? '#28583f' : '#fff',
                          cursor: 'pointer',
                          transition: 'all 0.15s'
                        }}
                        onMouseEnter={e => {
                          if (plan !== opt.value) {
                            e.currentTarget.style.background = '#edf6ee'
                          }
                        }}
                        onMouseLeave={e => {
                          if (plan !== opt.value) {
                            e.currentTarget.style.background = '#fff'
                          }
                        }}
                      >
                        {opt.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '12px', color: '#65736a', fontWeight: 650 }} htmlFor="contact-name">Your Name</label>
              <input
                id="contact-name"
                type="text"
                required
                placeholder="e.g. John Doe"
                value={name}
                onChange={e => setName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  fontSize: '13px',
                  outline: 'none',
                  background: '#fff'
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '12px', color: '#65736a', fontWeight: 650 }} htmlFor="contact-email">Work Email</label>
              <input
                id="contact-email"
                type="email"
                required
                placeholder="e.g. john@yourcompany.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  fontSize: '13px',
                  outline: 'none',
                  background: '#fff'
                }}
              />
            </div>

            {submitted ? (
              <div style={{ padding: '16px', background: '#f0f8f1', border: '1px solid #b7d0bd', borderRadius: '8px', color: '#28583f', textAlign: 'center', marginTop: '10px' }}>
                <CheckCircle size={24} style={{ marginInline: 'auto', marginBottom: '8px' }} />
                <strong style={{ display: 'block', fontSize: '14px' }}>Lead Saved Successfully!</strong>
                <span style={{ fontSize: '12px', opacity: 0.85 }}>An integration engineer will email you shortly.</span>
              </div>
            ) : (
              <Button
                type="submit"
                disabled={submitting}
                className="button-primary"
                style={{ width: '100%', marginTop: '10px', justifyContent: 'center', height: '44px' }}
              >
                <Send size={16} data-icon="inline-end" /> {submitting ? 'Sending Request...' : 'Send Setup Interest Email'}
              </Button>
            )}
          </form>
        </div>

        {/* Schedule Call Subpanel */}
        <div className="glass-panel" style={{ padding: '32px', border: 'none', textAlign: 'center' }}>
          <Calendar size={32} style={{ color: '#28583f', marginInline: 'auto', marginBottom: '12px', opacity: 0.8 }} />
          <strong style={{ display: 'block', fontSize: '15px', color: '#28583f', marginBottom: '6px' }}>Prefer booking a call directly?</strong>
          <p style={{ fontSize: '13px', color: 'var(--muted-foreground)', margin: '0 0 16px', lineHeight: 1.45 }}>
            Schedule a 10-minute setup consultation with our lead infrastructure engineer.
          </p>
          <Button
            className="button-secondary"
            onClick={() => window.open('https://calendly.com/cowatch-integrations/10min', '_blank')}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            Schedule 10min Chat <ArrowRight data-icon="inline-end" />
          </Button>
        </div>
      </div>

      {/* Pre-crafted Template Previewer Column */}
      <div className="monitor-card glass-panel" style={{ padding: '32px', background: '#f3faf4', border: '1px solid #b7d0bd' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#52605a', fontSize: '11px', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', borderBottom: '1px solid #cbdcd0', paddingBottom: '12px', marginBottom: '20px' }}>
          <span>PRE-CRAFTED EMAIL PREVIEW</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#28583f' }}><MessageSquare size={12} /> Auto-switches</span>
        </div>

        {/* Dynamic transition container for text templates */}
        <div 
          key={animateKey}
          style={{ 
            animation: 'fade-up 0.4s ease-out both',
            fontFamily: 'var(--font-mono)',
            fontSize: '13px',
            lineHeight: 1.8,
            color: '#28583f',
            whiteSpace: 'pre-wrap',
            minHeight: '260px'
          }}
        >
          {message}
        </div>
      </div>
    </div>
  )
}

export default function ContactPage() {
  return (
    <main style={{ minHeight: '100vh', paddingTop: '112px', paddingBottom: '80px' }}>
      <ScrollReveal className="section container">
        <SectionIntro
          eyebrow="Contact & Scheduling"
          title="Start Your Video Pipeline Migration"
          copy="Select your plan tier. Our pre-crafted message updates automatically. Send the message or schedule an integration call."
        />

        <Suspense fallback={
          <div style={{ display: 'grid', placeItems: 'center', minHeight: '400px' }}>
            <span className="spinner" style={{ width: '32px', height: '32px', borderColor: '#bce0fd', borderTopColor: '#004085' }} />
          </div>
        }>
          <ContactFormContent />
        </Suspense>
      </ScrollReveal>
    </main>
  )
}
