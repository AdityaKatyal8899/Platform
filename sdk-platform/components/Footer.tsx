'use client'

import React from 'react'
import Link from 'next/link'
import { Video } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="footer container">
      <Link href="/" className="brand">
        <span className="brand-mark"><Video size={17} /></span>
        <span>CoWatch<span className="brand-muted"> SDK</span></span>
      </Link>
      <span>Private video infrastructure for teams who ship.</span>
      <span className="mono">© 2026 CoWatch</span>
    </footer>
  )
}
