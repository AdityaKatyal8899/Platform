import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

const SMTP_USER = process.env.SMTP_USER || 'cowatchservices@gmail.com'
const SMTP_PASSWORD = process.env.SMTP_PASSWORD || ''
const SENDER_NAME = process.env.SENDER_NAME || 'CoWatch SDK Team'
const PORTFOLIO_URL = process.env.PORTFOLIO_URL || 'http://localhost:3000'

// Welcome Campaign Template
const WELCOME_SUBJECT = 'Own your video infrastructure and cut monthly bills'
const WELCOME_BODY = `Hi {first_name},

Thank you for requesting setup details for CoWatch SDK! 

I help platform owners own their video infrastructure by setting up private, self-hosted video streaming pipelines directly inside their own cloud accounts. By migrating to your own storage and CDN, your monthly video bills drop significantly because you only pay direct cloud rates.

What we integrate for you:
* High-performance video transcoding.
* Adaptive Bitrate (ABR) HLS streaming (smooth resolution switching depending on connections).
* Buffer-free playbacks (video starts playing while transcoding is still processing).
* Stream-fragment security to prevent unauthorized downloads.

Lock in our private pipeline setup for a flat Launch Special setup fee of $1,499.

Let me know if you would like to schedule a quick 10-minute chat this week to review your current video workflow.

Best regards,

{sender_name}
{portfolio_url}`

// 15-Day Follow-Up Template
const FOLLOWUP_SUBJECT = 'Lock in your Launch Special Promo ($1,499 Setup) - 15 Days Left'
const FOLLOWUP_BODY = `Hi {first_name},

I hope your team is enjoying testing the CoWatch HLS streaming sandbox!

Just a quick heads-up: it has been 15 days since you requested setup details, which means your 30-day Launch Special trial period is halfway through. 

You have 15 days left to lock in the promotional $1,499 flat setup rate (saving $2,000 on the standard integration rate). Once locked in, you have all the time you need to integrate and test before deciding which monthly support plan fits your team best.

If you have any technical questions about CORS security, Webhook events, or FastAPI transcoding, please reply directly or book a quick sync:
https://calendly.com/cowatch-integrations/10min

Best regards,

{sender_name}
{portfolio_url}`

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { authEmail, recipients, campaignType } = body

    // 1. Authenticate check: only cowatchservices@gmail.com or cowatchservice@gmail.com can send
    const cleanAuth = (authEmail || '').trim().toLowerCase()
    if (cleanAuth !== 'cowatchservices@gmail.com' && cleanAuth !== 'cowatchservice@gmail.com') {
      return NextResponse.json(
        { status: 'error', message: 'Unauthorized authenticating email.' },
        { status: 401 }
      )
    }

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json(
        { status: 'error', message: 'No recipients provided.' },
        { status: 400 }
      )
    }

    // 2. Select templates
    const isFollowup = campaignType === 'followup'
    const subject = isFollowup ? FOLLOWUP_SUBJECT : WELCOME_SUBJECT
    const rawTemplate = isFollowup ? FOLLOWUP_BODY : WELCOME_BODY

    // 3. Configure Transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASSWORD
      }
    })

    const results = []
    
    // 4. Send emails sequentially to avoid spam blocking
    for (const item of recipients) {
      const recipientEmail = typeof item === 'string' ? item : item.email
      const name = typeof item === 'string' ? 'Developer' : item.name || 'Developer'

      const emailText = rawTemplate
        .replace('{first_name}', name)
        .replace('{sender_name}', SENDER_NAME)
        .replace('{portfolio_url}', PORTFOLIO_URL)

      try {
        await transporter.sendMail({
          from: `"${SENDER_NAME}" <${SMTP_USER}>`,
          to: recipientEmail,
          subject: subject,
          text: emailText
        })
        results.push({ email: recipientEmail, status: 'success' })
      } catch (err: any) {
        results.push({ email: recipientEmail, status: 'failed', error: err?.message || 'Unknown error' })
      }
    }

    return NextResponse.json({ status: 'ok', results })
  } catch (err: any) {
    return NextResponse.json(
      { status: 'error', message: err?.message || 'Server error' },
      { status: 500 }
    )
  }
}
