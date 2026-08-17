'use client'

import React, { useState } from 'react'
import { X, Send, Calendar, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function ContactModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<'message' | 'book'>('message')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  if (!isOpen) return null

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
      console.warn('[CoWatch SDK] Lead API failed. Falling back to email mailto client:', err)
      
      // Fallback: trigger email mailto client
      const mailtoUrl = `mailto:integrations@cowatch.dev?subject=CoWatch Integration Setup Request&body=Hi, my name is ${name || 'Developer'}. I am interested in integrating the private HLS streaming pipeline. Message details: ${message || 'No additional message.'}`
      window.open(mailtoUrl)
      
      setSubmitted(true)
    } finally {
      setSubmitting(false)
    }
  }

  const handleBookCall = () => {
    window.open('https://calendly.com/cowatch-integrations/10min', '_blank')
    onClose()
  }

  return (
    <div 
      className="video-modal" 
      onClick={onClose}
      style={{ display: 'grid', placeItems: 'center', zIndex: 1000 }}
    >
      <div 
        className="video-modal-card" 
        onClick={e => e.stopPropagation()}
        style={{ 
          maxWidth: '520px', 
          border: '1px solid rgba(40, 88, 63, 0.25)', 
          background: 'rgba(255, 255, 255, 0.98)', 
          boxShadow: '0 24px 60px rgba(20, 34, 26, 0.15)',
          padding: '24px'
        }}
      >
        <div className="modal-head" style={{ marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
          <strong style={{ fontSize: '18px', color: '#28583f', letterSpacing: '-0.02em' }}>CoWatch Integration Desk</strong>
          <button onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        {/* Tab Selection */}
        <div style={{ display: 'flex', gap: '8px', background: '#f1f5f2', padding: '4px', borderRadius: '8px', marginBottom: '24px' }}>
          <button
            onClick={() => setActiveTab('message')}
            style={{
              flex: 1,
              padding: '8px 12px',
              border: 0,
              borderRadius: '6px',
              background: activeTab === 'message' ? '#fff' : 'transparent',
              color: activeTab === 'message' ? '#28583f' : '#65736a',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: activeTab === 'message' ? '0 2px 6px rgba(0,0,0,0.05)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            <Send size={14} style={{ display: 'inline', marginRight: '6px', transform: 'translateY(-1px)' }} />
            Send Message
          </button>
          <button
            onClick={() => setActiveTab('book')}
            style={{
              flex: 1,
              padding: '8px 12px',
              border: 0,
              borderRadius: '6px',
              background: activeTab === 'book' ? '#fff' : 'transparent',
              color: activeTab === 'book' ? '#28583f' : '#65736a',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: activeTab === 'book' ? '0 2px 6px rgba(0,0,0,0.05)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            <Calendar size={14} style={{ display: 'inline', marginRight: '6px', transform: 'translateY(-1px)' }} />
            Book 10min Call
          </button>
        </div>

        {activeTab === 'message' ? (
          submitted ? (
            <div style={{ textAlign: 'center', padding: '20px 10px' }}>
              <div style={{ color: '#3d9b65', marginBottom: '12px' }}><CheckCircle size={44} style={{ marginInline: 'auto' }} /></div>
              <strong style={{ display: 'block', fontSize: '16px', color: '#28583f', marginBottom: '8px' }}>Lead Captured Successfully!</strong>
              <p style={{ fontSize: '13px', color: 'var(--muted-foreground)', lineHeight: 1.5 }}>
                Our team has logged your interest. An integration engineer will contact you shortly to review your video platform requirements.
              </p>
              <Button className="button-primary" style={{ marginTop: '20px' }} onClick={onClose}>
                Close Panel
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '12px', color: '#65736a', fontWeight: 500 }} htmlFor="lead-name">Your Name</label>
                <input
                  id="lead-name"
                  type="text"
                  placeholder="e.g. John Doe"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    fontSize: '13px',
                    outline: 'none',
                    background: '#fff'
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '12px', color: '#65736a', fontWeight: 500 }} htmlFor="lead-email">Your Work Email</label>
                <input
                  id="lead-email"
                  type="email"
                  required
                  placeholder="e.g. john@yourcompany.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    fontSize: '13px',
                    outline: 'none',
                    background: '#fff'
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '12px', color: '#65736a', fontWeight: 500 }} htmlFor="lead-message">Integration Requirements (Optional)</label>
                <textarea
                  id="lead-message"
                  rows={3}
                  placeholder="Tell us briefly about your current video hosting bills and streaming scale..."
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    fontSize: '13px',
                    outline: 'none',
                    background: '#fff',
                    resize: 'none'
                  }}
                />
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="button-primary"
                style={{ width: '100%', marginTop: '10px', justifyContent: 'center' }}
              >
                {submitting ? 'Submitting Details...' : 'Submit Setup Request'}
              </Button>
            </form>
          )
        ) : (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{ color: '#28583f', marginBottom: '16px' }}>
              <Calendar size={48} style={{ marginInline: 'auto', opacity: 0.8 }} />
            </div>
            <strong style={{ display: 'block', fontSize: '16px', color: '#28583f', marginBottom: '8px' }}>Schedule Integration Consultation</strong>
            <p style={{ fontSize: '13px', color: 'var(--muted-foreground)', lineHeight: 1.5, marginBottom: '24px' }}>
              Book a 10-minute technical evaluation call with our lead infrastructure engineer. We'll map out your cloud architecture and estimate your bandwidth cost savings.
            </p>
            <Button
              className="button-primary"
              onClick={handleBookCall}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              Book 10-Minute Chat <ArrowRight data-icon="inline-end" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
