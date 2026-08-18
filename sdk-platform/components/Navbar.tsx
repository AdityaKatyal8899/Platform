'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Video, ArrowRight, Menu, X } from 'lucide-react'
import { Button } from './ui/button'
import { AnimatedThemeToggler } from './AnimatedThemeToggler'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 80) {
        setScrolled(true)
      } else {
        setScrolled(false)
      }
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Auto-close menu when path changes
  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  // Listen for 'T' keypress to trigger theme toggler
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.getAttribute('contenteditable') === 'true'
      ) {
        return
      }
      if (e.key.toLowerCase() === 't') {
        const btn = document.querySelector('[data-theme-toggler]') as HTMLButtonElement
        btn?.click()
      }
    }
    document.addEventListener('keydown', handleKeyPress)
    return () => document.removeEventListener('keydown', handleKeyPress)
  }, [])

  const isActive = (path: string) => pathname === path

  const linkStyle = (path: string): React.CSSProperties => ({
    color: isActive(path) ? '#28583f' : undefined,
    fontWeight: isActive(path) ? 700 : undefined
  })

  return (
    <div className={`nav-wrapper ${menuOpen || scrolled || pathname !== '/' ? 'scrolled' : 'hidden-nav'}`}>
      <nav className="nav container">
        <Link href="/" className="brand">
          <span className="brand-mark"><Video size={17} /></span>
          <span>CoWatch<span className="brand-muted"> SDK</span></span>
        </Link>
        
        <div className={`nav-links ${menuOpen ? 'open' : ''}`}>
          <Link href="/" style={linkStyle('/')}>Us</Link>
          <Link href="/demo#sandbox" style={linkStyle('/demo#sandbox')}>Sandbox</Link>
          <Link href="/pricing" style={linkStyle('/pricing')}>Pricing</Link>
          <Link href="/docs" style={linkStyle('/docs')}>Docs</Link>
          <Link href="/contact" style={linkStyle('/contact')}>Contact</Link>
        </div>

        <div className="nav-actions" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <AnimatedThemeToggler variant="square" data-theme-toggler style={{ scale: '0.85' }} />
          <Button 
            className="nav-cta" 
            onClick={() => { 
              setMenuOpen(false)
              router.push('/demo#sandbox')
            }}
          >
            Try sandbox <ArrowRight data-icon="inline-end" />
          </Button>
          <button 
            className="menu-button" 
            aria-label="Toggle menu" 
            aria-expanded={menuOpen} 
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </nav>
    </div>
  )
}
