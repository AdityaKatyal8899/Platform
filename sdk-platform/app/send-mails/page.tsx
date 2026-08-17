'use client'

import React, { useState } from 'react'
import { Send, Key, Lock, Mail, Users, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import SectionIntro from '@/components/SectionIntro'
import ScrollReveal from '@/components/ScrollReveal'

interface ResultItem {
  email: string
  status: 'success' | 'failed'
  error?: string
}

export default function SendMailsPage() {
  const [authEmail, setAuthEmail] = useState('')
  const [campaignType, setCampaignType] = useState('welcome')
  const [recipientsRaw, setRecipientsRaw] = useState('')
  const [sending, setSending] = useState(false)
  const [results, setResults] = useState<ResultItem[] | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  // Check if authenticated (either with 'services' or singular 'service')
  const cleanAuth = authEmail.trim().toLowerCase()
  const isAuthenticated = cleanAuth === 'cowatchservices@gmail.com' || cleanAuth === 'cowatchservice@gmail.com'

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isAuthenticated) return

    const emails = recipientsRaw
      .split(/[\n,]/)
      .map(email => email.trim())
      .filter(email => email.length > 0 && email.includes('@'))

    if (emails.length === 0) {
      setErrorMsg('Please enter at least one valid recipient email address.')
      return
    }

    setErrorMsg('')
    setSending(true)
    setResults(null)

    try {
      const res = await fetch('/api/send-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authEmail,
          recipients: emails,
          campaignType
        })
      })

      const data = await res.json()
      if (res.ok && data.status === 'ok') {
        setResults(data.results)
      } else {
        setErrorMsg(data.message || 'Failed to dispatch email campaign.')
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'A network error occurred while sending.')
    } finally {
      setSending(false)
    }
  }

  return (
    <main style={{ minHeight: '100vh', paddingTop: '112px', paddingBottom: '80px' }}>
      <ScrollReveal className="section container">
        <SectionIntro
          eyebrow="Console Dashboard"
          title="Campaign Inbound Center"
          copy="Enter the authorized sender address to unlock the cold mailing controls. Emails are processed server-side immediately."
        />

        <div className="sandbox-grid" style={{ marginTop: '40px' }}>
          {/* Authorization & Target Inputs */}
          <div className="upload-column">
            <div className="glass-panel" style={{ padding: '32px', border: 'none', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#28583f', margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Key size={20} /> Authentication Keys
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '20px' }}>
                <label style={{ fontSize: '12px', color: '#65736a', fontWeight: 650 }} htmlFor="auth-email-input">
                  Authenticating Sender Email
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="auth-email-input"
                    type="email"
                    required
                    placeholder="Enter cowatchservices@gmail.com"
                    value={authEmail}
                    onChange={e => setAuthEmail(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 38px',
                      border: `1px solid ${isAuthenticated ? '#3d9b65' : '#b7d0bd'}`,
                      borderRadius: '6px',
                      fontSize: '13px',
                      outline: 'none',
                      background: '#fff',
                      transition: 'all 0.2s'
                    }}
                  />
                  <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: isAuthenticated ? '#3d9b65' : '#8e3f46' }}>
                    {isAuthenticated ? <CheckCircle size={16} /> : <Lock size={16} />}
                  </div>
                </div>
                <span style={{ fontSize: '10px', color: isAuthenticated ? '#3d9b65' : '#8e3f46', marginTop: '4px', fontWeight: 550 }}>
                  {isAuthenticated ? '✓ Keys Verified. Dashboard unlocked.' : '🔒 Enter the authorized admin email address to access.'}
                </span>
              </div>

              {isAuthenticated && (
                <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: '18px', animation: 'fade-up 0.3s ease-out both' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '12px', color: '#65736a', fontWeight: 650 }}>Outreach Campaign Template</label>
                    <select
                      value={campaignType}
                      onChange={e => setCampaignType(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #b7d0bd',
                        borderRadius: '6px',
                        fontSize: '13px',
                        outline: 'none',
                        background: '#f3faf4',
                        color: '#28583f',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      <option value="welcome">Welcome Outreach (Flat $1,499 Setup)</option>
                      <option value="followup">15-Day Trial Follow-Up (Lock discount reminder)</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '12px', color: '#65736a', fontWeight: 650 }}>
                      Recipients list
                    </label>
                    <textarea
                      required
                      placeholder="john@company.com&#10;sarah@startup.co&#10;(one email per line or comma-separated)"
                      value={recipientsRaw}
                      onChange={e => setRecipientsRaw(e.target.value)}
                      rows={6}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #b7d0bd',
                        borderRadius: '6px',
                        fontSize: '13px',
                        outline: 'none',
                        fontFamily: 'var(--font-mono)',
                        lineHeight: 1.5,
                        background: '#fff'
                      }}
                    />
                  </div>

                  {errorMsg && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: '#fff0f0', border: '1px solid #ffc1c1', borderRadius: '6px', color: '#a24e55', fontSize: '12px' }}>
                      <AlertCircle size={16} />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={sending}
                    className="button-primary"
                    style={{ width: '100%', height: '44px', justifyContent: 'center' }}
                  >
                    {sending ? (
                      <>
                        <RefreshCw size={16} className="spinner" style={{ marginRight: '8px' }} /> Processing Campaign...
                      </>
                    ) : (
                      <>
                        <Send size={16} style={{ marginRight: '8px' }} /> Dispatch outreach emails
                      </>
                    )}
                  </Button>
                </form>
              )}
            </div>
          </div>

          {/* Campaign Log & Results Viewer */}
          <div className="monitor-card glass-panel" style={{ padding: '28px', background: '#f3faf4', border: '1px solid #b7d0bd' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#52605a', fontSize: '11px', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', borderBottom: '1px solid #cbdcd0', paddingBottom: '12px', marginBottom: '20px' }}>
              <span>CAMPAIGN TRANSACTION LOG</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#28583f' }}>
                <Users size={12} /> {results ? `${results.length} processed` : 'Waiting'}
              </span>
            </div>

            {results ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '400px', overflowY: 'auto' }}>
                {results.map((res, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 14px',
                      background: '#fff',
                      border: `1px solid ${res.status === 'success' ? '#b7d0bd' : '#ffc1c1'}`,
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontFamily: 'var(--font-mono)'
                    }}
                  >
                    <span style={{ color: '#28583f', fontWeight: 500 }}>{res.email}</span>
                    {res.status === 'success' ? (
                      <span style={{ color: '#3d9b65', fontWeight: 700 }}>SUCCESS</span>
                    ) : (
                      <span style={{ color: '#a24e55', fontWeight: 700 }}>FAILED ({res.error})</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: 'grid', placeItems: 'center', minHeight: '260px', color: '#65736a', textAlign: 'center' }}>
                <div>
                  <Mail size={36} style={{ marginInline: 'auto', marginBottom: '12px', opacity: 0.5 }} />
                  <p style={{ fontSize: '13px', margin: 0 }}>
                    Enter authorized key to configure and launch outreach campaigns.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </ScrollReveal>
    </main>
  )
}
