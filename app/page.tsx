"use client";

import React, { useState, useEffect, Suspense } from 'react';

import { useSearchParams, useRouter } from 'next/navigation';

/* ─────────────────────────────────────────────

   INLINE STYLES INJECTED ONCE

   All keyframes + custom utilities that Tailwind

   can't express as static class names.

   — Improved contrast and readability

───────────────────────────────────────────── */

const GLOBAL_STYLES = `

  @import url('https://api.fontshare.com/v2/css?f[]=satoshi@300,400,500,700,900&f[]=cabinet-grotesk@400,500,700,800,900&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {

    --bg:         #04070f;

    --surface-1:  #080d1a;

    --surface-2:  #0d1526;

    --surface-3:  #111d30;

    --border:     rgba(255,255,255,0.055);

    --border-hi:  rgba(255,255,255,0.10);

    --accent:     #0CF2D0;

    --accent-dim: rgba(12,242,208,0.08);

    --accent-glow:rgba(12,242,208,0.18);

    --text-1:     #ffffff;

    --text-2:     #b0c2da;    /* lighter for better contrast */

    --text-3:     #7a8caa;    /* increased lightness */

    --red:        #f04d5c;

    --amber:      #f0a34d;

    --green:      #34d399;

    --font-display: 'Cabinet Grotesk', system-ui, sans-serif;

    --font-body:    'Satoshi', system-ui, sans-serif;

    --base-size:   16px;      /* base for rem scaling */

  }

  html { -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; font-size: var(--base-size); }

  body { font-family: var(--font-body); background: var(--bg); color: var(--text-2); line-height: 1.6; }

  ::selection { background: rgba(12,242,208,0.18); color: #fff; }

  /* ── Keyframes ── */

  @keyframes spin { to { transform: rotate(360deg); } }

  @keyframes fadeUp {

    from { opacity: 0; transform: translateY(10px); }

    to   { opacity: 1; transform: translateY(0); }

  }

  @keyframes fadeIn {

    from { opacity: 0; }

    to   { opacity: 1; }

  }

  @keyframes scanLine {

    0%   { transform: translateY(-100%); }

    100% { transform: translateY(400%); }

  }

  @keyframes progressGrow {

    from { width: 0%; }

    to   { width: var(--target-w); }

  }

  @keyframes pulse-dot {

    0%, 100% { opacity: 1; transform: scale(1); }

    50%       { opacity: 0.4; transform: scale(0.7); }

  }

  @keyframes shimmer {

    0%   { background-position: -400px 0; }

    100% { background-position:  400px 0; }

  }

  /* ── Utilities ── */

  .font-display { font-family: var(--font-display); }

  .font-body    { font-family: var(--font-body); }

  .text-accent  { color: var(--accent); }

  .text-1 { color: var(--text-1); }

  .text-2 { color: var(--text-2); }

  .text-3 { color: var(--text-3); }

  /* Grid line background for hero */

  .grid-bg {

    background-image:

      linear-gradient(rgba(255,255,255,0.022) 1px, transparent 1px),

      linear-gradient(90deg, rgba(255,255,255,0.022) 1px, transparent 1px);

    background-size: 48px 48px;

  }

  /* Animated scan line on loading */

  .scan-line::after {

    content: '';

    position: absolute;

    inset: 0;

    background: linear-gradient(to bottom, transparent 0%, rgba(12,242,208,0.07) 50%, transparent 100%);

    height: 60px;

    animation: scanLine 2.2s ease-in-out infinite;

    pointer-events: none;

  }

  /* Premium card hover lift */

  .card-lift {

    transition: transform 0.22s cubic-bezier(0.16,1,0.3,1),

                box-shadow 0.22s cubic-bezier(0.16,1,0.3,1);

  }

  .card-lift:hover {

    transform: translateY(-2px);

    box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.07);

  }

  /* Progress bar animation */

  .progress-bar {

    animation: progressGrow 1.1s cubic-bezier(0.16,1,0.3,1) 0.3s both;

  }

  /* Staggered fade-up for report sections */

  .stagger-1 { animation: fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) 0.05s both; }

  .stagger-2 { animation: fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) 0.12s both; }

  .stagger-3 { animation: fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) 0.19s both; }

  .stagger-4 { animation: fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) 0.26s both; }

  .stagger-5 { animation: fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) 0.33s both; }

  /* Print overrides */

  @media print {

    :root { --bg: #fff; --surface-1: #f8f9fb; --surface-2: #f1f3f7; --surface-3: #e9ecf2; --border: rgba(0,0,0,0.1); --text-1: #0d1526; --text-2: #2d3a4f; --text-3: #6a7b94; }

    body { background: #fff; }

    .print-hidden { display: none !important; }

  }

`;

/* ─────────────────────────────────────────────

   SUB-COMPONENTS

───────────────────────────────────────────── */

/** Thin top-edge accent line shared by all major cards */

const CardAccentLine = () => (

  <div style={{

    position: 'absolute', top: 0, left: 0, right: 0, height: '1px',

    background: 'linear-gradient(90deg, transparent 0%, rgba(12,242,208,0.4) 40%, rgba(91,156,246,0.3) 70%, transparent 100%)',

  }} />

);

/** Section divider */

const Divider = () => (

  <div style={{ height: '1px', background: 'var(--border)', margin: '0' }} />

);

/** Metric cell used in auth grid – improved contrast */

const MetricCell = ({

  label, value, valueColor, sub, mono = false

}: { label: string; value: string; valueColor: string; sub: string; mono?: boolean }) => (

  <div style={{

    background: 'var(--surface-3)',

    border: '1px solid var(--border)',

    borderRadius: '12px',

    padding: '18px 20px',

  }}>

    <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '6px' }}>

      {label}

    </p>

    <p style={{ fontSize: '24px', fontWeight: 900, color: valueColor, letterSpacing: '-0.02em', fontFamily: mono ? 'var(--font-body)' : 'var(--font-display)', lineHeight: 1.1 }}>

      {value}

    </p>

    <p style={{ fontSize: '13px', color: 'var(--text-2)', marginTop: '8px', lineHeight: 1.5 }}>

      {sub}

    </p>

  </div>

);

/** Impact badge – better readability */

const ImpactBadge = ({ impact }: { impact: string }) => {

  const isCritical = impact === 'Critical';

  return (

    <span style={{

      display: 'inline-flex', alignItems: 'center', gap: '6px',

      fontSize: '11px', fontWeight: 800, letterSpacing: '0.1em',

      textTransform: 'uppercase', padding: '5px 12px', borderRadius: '999px',

      color: isCritical ? 'var(--red)' : 'var(--amber)',

      background: isCritical ? 'rgba(240,77,92,0.12)' : 'rgba(240,163,77,0.12)',

      border: `1px solid ${isCritical ? 'rgba(240,77,92,0.3)' : 'rgba(240,163,77,0.3)'}`,

    }}>

      <span style={{

        width: '6px', height: '6px', borderRadius: '50%',

        background: isCritical ? 'var(--red)' : 'var(--amber)',

        flexShrink: 0,

      }} />

      {impact}

    </span>

  );

};

/* ─────────────────────────────────────────────

   MAIN APP

───────────────────────────────────────────── */

function ReportApp() {

  const router = useRouter();

  const searchParams = useSearchParams();

  const initialDomain = searchParams.get('domain') || '';

  const [domain, setDomain] = useState(initialDomain);

  const [dkimSelector, setDkimSelector] = useState('');

  const [openRate, setOpenRate] = useState('');

  const [dailyVolume, setDailyVolume] = useState('');

  const [isLoading, setIsLoading] = useState(false);

  const [report, setReport] = useState<any>(null);

  const [error, setError] = useState('');

  const [copied, setCopied] = useState(false);

  useEffect(() => {

    if (initialDomain && !report && !isLoading && !error) {

      runAudit(initialDomain);

    }

  }, [initialDomain]);

  const handleAudit = async (e: React.FormEvent) => {

    e.preventDefault();

    router.push(`/?domain=${domain}`, { scroll: false });

    runAudit(domain);

  };

  const runAudit = async (targetDomain: string) => {

    setIsLoading(true);

    setError('');

    setReport(null);

    setCopied(false);

    try {

      const response = await fetch('/api/audit', {

        method: 'POST',

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify({ domain: targetDomain, dkimSelector, openRate, dailyVolume })

      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Failed to audit domain');
      // Calculate prediction locally 
      const prediction = openRate === '<15%' ? 'Spam' : (data.score >= 85 && openRate === '>40%') ? 'Primary' : 'Promotions';
      data.behavioral = { prediction, openRate: openRate || 'Unknown' };
      setReport(data);

    } catch (err: any) {

      setError(err.message);

    } finally {

      setIsLoading(false);

    }

  };

  const generateFixList = () => {

    if (!report) return [];

    const fixes: { title: string; impact: string; advice: string }[] = [];

    if (report.authentication.spf === 'Fail') {

      fixes.push({

        title: "Authenticate Your Infrastructure (SPF)",

        impact: "Critical",

        advice: "Your domain lacks a valid Sender Policy Framework (SPF) record. Google and Microsoft currently view your emails as spoofed threats and will reject them."

      });

    }

    if (report.authentication.dmarc === 'Fail') {

      fixes.push({

        title: "Enforce a DMARC Protocol",

        impact: "Critical",

        advice: "You are operating without a DMARC record. 2026 guidelines from tier-one providers strictly require this. You must deploy a TXT record immediately."

      });

    }

    if (report.authentication.dmarc === 'Pass' && !report.authentication.dmarcStrict) {

      fixes.push({

        title: "Upgrade DMARC to Enforcement",

        impact: "High",

        advice: "Your DMARC record is set to 'p=none'. You must upgrade to 'p=quarantine' or 'p=reject' to satisfy strict enterprise filters and stop domain spoofing."

      });

    }

    if (report.blacklists.blacklistedCount > 3) {

      fixes.push({

        title: "Eradicate Active Blacklist Triggers",

        impact: "Critical",

        advice: `Your IP is flagged on ${report.blacklists.blacklistedCount} global databases. Pause campaigns immediately, check your FCrDNS matching, and submit manual delisting requests.`

      });

    }

    if (report.age.days > 0 && report.age.days < 90) {

      fixes.push({

        title: "Initiate Domain Warmup",

        impact: "High",

        advice: `Your domain is practically invisible (${report.age.days} days old). Zero inbox trust has been established. You must warm this domain slowly before scaling volume.`

      });

    }

    return fixes;

  };

  const calculateSafeVolume = () => {
    if (!report) return "0";
    if (report.behavioral.prediction === 'Spam' || report.score < 50) return "50 / day";
    if (report.score >= 50 && report.score < 85) return "500 / day";
    return dailyVolume === '5000+' ? "5,000+ / day" : "1,000 / day";
  };

  const handleCopyLink = () => {

    navigator.clipboard.writeText(window.location.href);

    setCopied(true);

    setTimeout(() => setCopied(false), 2000);

  };

  const fixes = report ? generateFixList() : [];

  const scoreColor = report

    ? report.score >= 85 ? 'var(--green)'

      : report.score >= 60 ? 'var(--amber)'

        : 'var(--red)'

    : 'var(--text-3)';

  return (

    <>

      <style dangerouslySetInnerHTML={{ __html: GLOBAL_STYLES }} />

      <main style={{ minHeight: '100vh', background: 'var(--bg)', position: 'relative', overflowX: 'hidden' }}>

        {/* ── Ambient background glow ── */}

        <div className="print-hidden" style={{

          position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)',

          width: '900px', height: '500px', pointerEvents: 'none', zIndex: 0,

          background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(12,242,208,0.055) 0%, transparent 80%)',

        }} />

        {/* ── NAV BAR ── */}

        <nav className="print-hidden" style={{

          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,

          height: '60px', display: 'flex', alignItems: 'center',

          padding: '0 32px',

          background: 'rgba(4,7,15,0.85)',

          backdropFilter: 'blur(16px)',

          borderBottom: '1px solid var(--border)',

        }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>

            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">

              <rect x="0.5" y="0.5" width="23" height="23" rx="6" stroke="rgba(12,242,208,0.4)" />

              <path d="M6 12h12M12 6l6 6-6 6" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />

            </svg>

            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '15px', color: 'var(--text-1)', letterSpacing: '-0.01em' }}>

              Inbox Protector

            </span>

            <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginLeft: '4px' }}>

              / Audit

            </span>

          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>

            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.08em' }}>

              2026 SENDER STANDARDS

            </span>

            <span style={{

              width: '7px', height: '7px', borderRadius: '50%',

              background: 'var(--accent)',

              animation: 'pulse-dot 2s ease-in-out infinite',

            }} />

          </div>

        </nav>

        {/* ── HERO ── */}

        <section className="print-hidden grid-bg" style={{

          position: 'relative', zIndex: 1,

          paddingTop: '140px', paddingBottom: '80px',

          borderBottom: '1px solid var(--border)',

        }}>

          <div style={{

            position: 'absolute', top: 0, left: 0, right: 0, height: '1px',

            background: 'linear-gradient(90deg, transparent 0%, rgba(12,242,208,0.35) 40%, rgba(91,156,246,0.25) 70%, transparent 100%)',

          }} />

          <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 32px' }}>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>

              <div style={{ height: '1px', width: '32px', background: 'var(--accent)', opacity: 0.6 }} />

              <span style={{

                fontSize: '12px', fontWeight: 700, letterSpacing: '0.2em',

                textTransform: 'uppercase', color: 'var(--accent)',

              }}>

                Live DNS &amp; Reputation Analysis

              </span>

            </div>

            <h1 style={{

              fontFamily: 'var(--font-display)', fontWeight: 900,

              fontSize: 'clamp(2.8rem, 5.5vw, 4.6rem)',

              lineHeight: 1.05, letterSpacing: '-0.03em',

              color: 'var(--text-1)', marginBottom: '20px',

              maxWidth: '780px',

            }}>

              Your emails are being rejected<br />

              <span style={{

                WebkitBackgroundClip: 'text',

                WebkitTextFillColor: 'transparent',

                backgroundClip: 'text',

                backgroundImage: 'linear-gradient(95deg, #0CF2D0 0%, #5b9cf6 55%, #a78bfa 100%)',

              }}>

                before your customers ever open them.

              </span>

            </h1>

            <p style={{

              fontSize: '18px', lineHeight: 1.7, color: 'var(--text-2)',

              maxWidth: '620px', marginBottom: '12px',

            }}>

              This audit validates your SPF record, DMARC enforcement policy, global blacklist status, and domain age against the exact sender requirements currently enforced by Gmail, Yahoo, and Outlook.

            </p>

            <p style={{

              fontSize: '15px', lineHeight: 1.7, color: 'var(--text-3)',

              maxWidth: '560px', marginBottom: '40px',

            }}>

              A single failure across any of these four checks is sufficient for inbox providers to silently filter your sends — regardless of your content, list quality, or sending volume.

            </p>

            <form onSubmit={handleAudit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '640px' }}>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '260px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-3)', marginBottom: '6px', fontWeight: 700 }}>DOMAIN TO AUDIT</label>
                  <input type="text" value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="yourdomain.com" required style={{ width: '100%', padding: '14px 20px', background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-1)', fontSize: '15px', outline: 'none' }} />
                </div>
                <div style={{ flex: 1, minWidth: '260px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-3)', marginBottom: '6px', fontWeight: 700 }}>DKIM SELECTOR (OPTIONAL)</label>
                  <input type="text" value={dkimSelector} onChange={(e) => setDkimSelector(e.target.value)} placeholder="e.g. google, selector1" style={{ width: '100%', padding: '14px 20px', background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-1)', fontSize: '15px', outline: 'none' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '260px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-3)', marginBottom: '6px', fontWeight: 700 }}>AVERAGE OPEN RATE</label>
                  <select value={openRate} onChange={(e) => setOpenRate(e.target.value)} required style={{ width: '100%', padding: '14px 20px', background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-1)', fontSize: '15px', outline: 'none' }}>
                    <option value="" disabled>Select engagement tier</option>
                    <option value=">40%">Over 40% (Healthy)</option>
                    <option value="15-40%">15% - 40% (Average)</option>
                    <option value="<15%">Under 15% (Critical)</option>
                    <option value="Unknown">I don't know</option>
                  </select>
                </div>
                <div style={{ flex: 1, minWidth: '260px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-3)', marginBottom: '6px', fontWeight: 700 }}>DAILY SEND VOLUME</label>
                  <select value={dailyVolume} onChange={(e) => setDailyVolume(e.target.value)} required style={{ width: '100%', padding: '14px 20px', background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-1)', fontSize: '15px', outline: 'none' }}>
                    <option value="" disabled>Select volume</option>
                    <option value="<50">Under 50 emails</option>
                    <option value="50-500">50 - 500 emails</option>
                    <option value="500-5000">500 - 5,000 emails</option>
                    <option value="5000+">5,000+ emails</option>
                  </select>
                </div>
              </div>
              <button type="submit" disabled={isLoading} style={{ padding: '14px 28px', background: isLoading ? 'rgba(12,242,208,0.5)' : 'var(--accent)', border: 'none', borderRadius: '10px', color: '#04070f', fontWeight: 900, cursor: isLoading ? 'not-allowed' : 'pointer', alignSelf: 'flex-start' }}>
                {isLoading ? 'Scanning...' : 'Run Audit →'}
              </button>
            </form>

            {error && (

              <div style={{

                marginTop: '16px', padding: '12px 18px',

                background: 'rgba(240,77,92,0.07)',

                border: '1px solid rgba(240,77,92,0.22)',

                borderRadius: '8px', color: 'var(--red)',

                fontSize: '14px', fontWeight: 500, maxWidth: '580px',

              }}>

                {error}

              </div>

            )}

          </div>

        </section>

        {/* ── LOADING ── */}

        {isLoading && (

          <section className="print-hidden" style={{

            maxWidth: '900px', margin: '0 auto',

            padding: '64px 32px',

            position: 'relative', zIndex: 1,

          }}>

            <div style={{

              background: 'var(--surface-1)',

              border: '1px solid var(--border)',

              borderRadius: '16px', padding: '44px',

              position: 'relative', overflow: 'hidden',

            }} className="scan-line">

              <CardAccentLine />

              <p style={{

                fontSize: '12px', fontWeight: 700, letterSpacing: '0.2em',

                textTransform: 'uppercase', color: 'var(--accent)',

                marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '12px',

              }}>

                <span style={{

                  width: '20px', height: '20px',

                  border: '2px solid rgba(12,242,208,0.2)',

                  borderTopColor: 'var(--accent)',

                  borderRadius: '50%',

                  animation: 'spin 0.8s linear infinite',

                  display: 'inline-block', flexShrink: 0,

                }} />

                Audit in progress

              </p>

              {[

                { label: 'Querying SPF and DMARC records via authoritative DNS...', delay: '0s' },

                { label: 'Cross-referencing Spamhaus, SORBS, Barracuda, SpamCop, and 46 additional reputation databases...', delay: '0.6s' },

                { label: 'Resolving WHOIS registration date and domain age signal...', delay: '1.2s' },

                { label: 'Checking BIMI, MTA-STS, and TLS enforcement policies...', delay: '1.8s' },

              ].map((item, i) => (

                <div key={i} style={{

                  display: 'flex', alignItems: 'flex-start', gap: '14px',

                  marginBottom: '16px',

                  animation: `fadeIn 0.3s ease ${item.delay} both`,

                }}>

                  <span style={{

                    width: '6px', height: '6px', borderRadius: '50%',

                    background: 'var(--accent)', flexShrink: 0, marginTop: '6px',

                    opacity: 0.5,

                  }} />

                  <p style={{ fontSize: '14px', color: 'var(--text-2)', lineHeight: 1.6 }}>

                    {item.label}

                  </p>

                </div>

              ))}

            </div>

          </section>

        )}

        {/* ── REPORT ── */}

        {report && !isLoading && (

          <section style={{

            maxWidth: '960px', margin: '0 auto',

            padding: '48px 32px 120px',

            position: 'relative', zIndex: 1,

          }}>

            {/* ── Share / Export ── */}

            <div className="print-hidden stagger-1" style={{

              display: 'flex', justifyContent: 'space-between', alignItems: 'center',

              marginBottom: '32px',

            }}>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>

                <span style={{

                  width: '8px', height: '8px', borderRadius: '50%',

                  background: 'var(--green)',

                  boxShadow: '0 0 12px rgba(52,211,153,0.5)',

                }} />

                <span style={{ fontSize: '13px', color: 'var(--text-3)', fontFamily: 'monospace', letterSpacing: '0.05em' }}>

                  Audit complete — {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}

                </span>

              </div>

              <div style={{ display: 'flex', gap: '10px' }}>

                {[

                  {

                    label: copied ? '✓ Copied' : 'Share Link',

                    onClick: handleCopyLink,

                    icon: (

                      <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />

                      </svg>

                    ),

                    primary: false,

                  },

                  {

                    label: 'Export PDF',

                    onClick: () => window.print(),

                    icon: (

                      <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />

                      </svg>

                    ),

                    primary: true,

                  },

                ].map((btn, i) => (

                  <button

                    key={i}

                    onClick={btn.onClick}

                    style={{

                      display: 'flex', alignItems: 'center', gap: '8px',

                      padding: '10px 18px',

                      background: btn.primary ? 'var(--text-1)' : 'var(--surface-2)',

                      border: `1px solid ${btn.primary ? 'transparent' : 'var(--border)'}`,

                      borderRadius: '8px',

                      color: btn.primary ? 'var(--bg)' : 'var(--text-2)',

                      fontSize: '13px', fontWeight: 700,

                      cursor: 'pointer', fontFamily: 'var(--font-body)',

                      transition: 'background 0.15s, color 0.15s, transform 0.12s',

                    }}

                    onMouseEnter={e => {

                      const el = e.currentTarget;

                      el.style.background = btn.primary ? '#e2e8f0' : 'var(--surface-3)';

                      el.style.transform = 'translateY(-1px)';

                    }}

                    onMouseLeave={e => {

                      const el = e.currentTarget;

                      el.style.background = btn.primary ? 'var(--text-1)' : 'var(--surface-2)';

                      el.style.transform = 'translateY(0)';

                    }}

                  >

                    {btn.icon}

                    {btn.label}

                  </button>

                ))}

              </div>

            </div>

            {/* ── SCORE CARD ── */}

            <div className="stagger-2" style={{

              background: 'var(--surface-1)',

              border: '1px solid var(--border)',

              borderRadius: '20px', overflow: 'hidden',

              marginBottom: '16px',

              boxShadow: '0 32px 80px rgba(0,0,0,0.5)',

              position: 'relative',

            }}>

              <CardAccentLine />

              <div style={{

                display: 'grid', gridTemplateColumns: '1fr auto',

                gap: '28px', padding: '44px 48px 36px',

                alignItems: 'start',

              }}>

                <div>

                  <p style={{

                    fontSize: '12px', fontWeight: 700, letterSpacing: '0.2em',

                    textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '12px',

                  }}>

                    Infrastructure Assessment — <span style={{ color: 'var(--text-2)' }}>{report.domain}</span>

                  </p>

                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', marginBottom: '16px' }}>

                    <span style={{

                      fontFamily: 'var(--font-display)', fontWeight: 900,

                      fontSize: 'clamp(5.5rem, 10vw, 8rem)',

                      lineHeight: 1, letterSpacing: '-0.04em',

                      color: scoreColor,

                      filter: `drop-shadow(0 0 28px ${scoreColor}44)`,

                    }}>

                      {report.score}

                    </span>

                    <span style={{

                      fontSize: '28px', fontWeight: 700, color: 'var(--text-3)',

                      marginBottom: '12px', fontFamily: 'var(--font-display)',

                    }}>

                      / 100

                    </span>

                  </div>

                  <div style={{

                    width: '300px', maxWidth: '100%', height: '4px',

                    borderRadius: '999px', background: 'var(--surface-3)',

                    marginBottom: '20px', overflow: 'hidden',

                  }}>

                    <div

                      className="progress-bar"

                      style={{

                        height: '100%', borderRadius: '999px',

                        background: scoreColor,

                        '--target-w': `${report.score}%`,

                        boxShadow: `0 0 10px ${scoreColor}`,

                      } as React.CSSProperties}

                    />

                  </div>

                  <p style={{

                    fontSize: '15px', lineHeight: 1.7, color: 'var(--text-2)',

                    maxWidth: '520px',

                  }}>

                    {report.score >= 85

                      ? 'Your authentication stack is correctly configured. The remaining risk lies in behavioral signals — engagement rate, unsubscribe header compliance, and list hygiene — none of which DNS records can fix.'

                      : report.score >= 60

                        ? 'A configuration gap is actively reducing your delivery rate. Senders in this range typically see 15–30% of sends silently deferred or junked before any recipient sees a subject line.'

                        : 'Critical authentication failures detected. Inbox providers are actively rejecting or routing your sends to spam. This domain is not safe for outbound email until these failures are resolved.'}

                  </p>

                </div>

                <div style={{

                  background: 'var(--surface-2)',

                  border: '1px solid var(--border)',

                  borderRadius: '14px', padding: '28px 32px',

                  textAlign: 'center', minWidth: '220px',

                }}>

                  <p style={{

                    fontSize: '11px', fontWeight: 800, letterSpacing: '0.18em',

                    textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '10px',

                  }}>

                    Weekly send ceiling

                  </p>

                  <p style={{

                    fontFamily: 'var(--font-display)', fontWeight: 900,

                    fontSize: '32px', color: 'var(--text-1)', letterSpacing: '-0.02em',

                    lineHeight: 1, marginBottom: '10px',

                    fontVariantNumeric: 'tabular-nums',

                  }}>

                    {calculateSafeVolume()}

                  </p>

                  <p style={{ fontSize: '12px', color: 'var(--text-2)', lineHeight: 1.6 }}>

                    Based on your current reputation score. Exceeding this accelerates decay in Google and Microsoft's filtering models.

                  </p>

                </div>

              </div>

              <Divider />

              <div style={{

                display: 'grid', gridTemplateColumns: '1fr 1fr',

                gap: '0',

              }}>

                <div style={{ padding: '40px 48px', borderRight: '1px solid var(--border)' }}>
                  <div style={{ marginBottom: '32px' }}>
                    <p style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '8px' }}>
                      Behavioral Prediction
                    </p>
                    <MetricCell
                      label="Expected Inbox Placement"
                      value={report.behavioral.prediction}
                      valueColor={report.behavioral.prediction === 'Primary' ? 'var(--green)' : report.behavioral.prediction === 'Promotions' ? 'var(--amber)' : 'var(--red)'}
                      sub={`Based on your provided engagement rate of ${report.behavioral.openRate}.`}
                    />
                  </div>

                  <p style={{

                    fontSize: '12px', fontWeight: 800, letterSpacing: '0.16em',

                    textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '8px',

                  }}>

                    Gate-Level Checks

                  </p>

                  <p style={{ fontSize: '14px', color: 'var(--text-2)', lineHeight: 1.6, marginBottom: '24px', maxWidth: '360px' }}>

                    Evaluated before your subject line is ever rendered. One failure here causes silent discard by Gmail, Yahoo, or Outlook.

                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

                    <MetricCell

                      label="SPF Record"

                      value={report.authentication.spf}

                      valueColor={report.authentication.spf === 'Pass' ? 'var(--green)' : 'var(--red)'}

                      sub={report.authentication.spf === 'Pass'

                        ? 'Authorised senders declared. Send origin is verifiable.'

                        : 'No authorised senders. Every outbound send is unverifiable.'}

                    />

                    <MetricCell

                      label="DMARC Policy"

                      value={

                        report.authentication.dmarcStrict ? 'Enforced'

                          : report.authentication.dmarc === 'Pass' ? 'Monitor Only'

                            : 'Not Present'

                      }

                      valueColor={report.authentication.dmarcStrict ? 'var(--green)' : 'var(--red)'}

                      sub={

                        report.authentication.dmarcStrict

                          ? 'p=quarantine or p=reject. Spoofed sends are blocked at the gate.'

                          : report.authentication.dmarc === 'Pass'

                            ? 'p=none — spoofed sends go unblocked. Upgrade to p=quarantine.'

                            : '2026 Gmail and Yahoo mandates require a DMARC record. Deploy immediately.'

                      }

                    />

                    <MetricCell

                      label="Global Blacklists"

                      value={`${report.blacklists.blacklistedCount} / ${report.blacklists.totalChecked}`}

                      valueColor={

                        report.blacklists.blacklistedCount === 0 ? 'var(--green)'

                          : report.blacklists.blacklistedCount <= 3 ? 'var(--amber)'

                            : 'var(--red)'

                      }

                      sub={

                        report.blacklists.blacklistedCount === 0

                          ? `Clean across all ${report.blacklists.totalChecked} reputation databases checked.`

                          : report.blacklists.blacklistedCount <= 3

                            ? `${report.blacklists.blacklistedCount} active listing(s). Submit delisting requests before scaling.`

                            : `${report.blacklists.blacklistedCount} listings. Pause all sends and begin manual delisting now.`

                      }

                      mono

                    />

                  </div>

                </div>

                <div style={{ padding: '40px 48px' }}>

                  <p style={{

                    fontSize: '12px', fontWeight: 800, letterSpacing: '0.16em',

                    textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '8px',

                  }}>

                    Trust Signals

                  </p>

                  <p style={{ fontSize: '14px', color: 'var(--text-2)', lineHeight: 1.6, marginBottom: '24px', maxWidth: '360px' }}>

                    Optional records that improve enterprise filter trust scores, inbox brand visibility, and transport security. None of these affect spam routing.

                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

                    <MetricCell

                      label="BIMI Brand Indicator"

                      value={report.authentication.bimi === 'Pass' ? 'Configured' : 'Not Installed'}

                      valueColor="var(--text-2)"

                      sub="Displays your logo in Gmail and Apple Mail inbox rows. Purely visual — no spam routing effect."

                    />

                    <MetricCell

                      label="MTA-STS Policy"

                      value={report.authentication.mtasts === 'Pass' ? 'Configured' : 'Not Installed'}

                      valueColor="var(--text-2)"

                      sub="Forces TLS on all inbound connections. Protects against downgrade attacks and raises enterprise filter trust."

                    />

                    <MetricCell

                      label="Registered Domain Age"

                      value={report.age.days > 0 ? `${report.age.days} days` : 'Unknown'}

                      valueColor="var(--text-2)"

                      sub={

                        report.age.days > 0 && report.age.days < 90

                          ? 'Under 90 days — sending history is near-zero. Warmup required before scaling.'

                          : report.age.days >= 90

                            ? 'Sufficient age for reputation to carry history. Delivery now depends on behavioral signals.'

                            : 'Age could not be resolved from WHOIS records.'

                      }

                      mono

                    />

                  </div>

                </div>

              </div>

            </div>

            {/* ── BEHAVIORAL DIAGNOSTIC ── */}

            <div className="stagger-3" style={{

              background: 'var(--surface-1)',

              border: '1px solid var(--border)',

              borderRadius: '20px', overflow: 'hidden',

              marginBottom: '16px',

              position: 'relative',

            }}>

              <CardAccentLine />

              <div style={{ padding: '44px 48px' }}>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '40px', marginBottom: '36px', flexWrap: 'wrap' }}>

                  <div style={{ flex: 1, minWidth: '280px' }}>

                    <p style={{

                      fontSize: '12px', fontWeight: 700, letterSpacing: '0.2em',

                      textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '8px',

                    }}>

                      Beyond your DNS records

                    </p>

                    <h2 style={{

                      fontFamily: 'var(--font-display)', fontWeight: 900,

                      fontSize: 'clamp(1.6rem, 2.8vw, 2.2rem)',

                      letterSpacing: '-0.02em', color: 'var(--text-1)',

                      lineHeight: 1.15, marginBottom: '14px',

                    }}>

                      The Behavioral Layer —<br />Where Clean Infrastructure Still Fails

                    </h2>

                  </div>

                  <div style={{ maxWidth: '420px' }}>

                    <p style={{ fontSize: '15px', lineHeight: 1.7, color: 'var(--text-2)', marginBottom: '12px' }}>

                      DNS authentication accounts for roughly 10% of inbox placement decisions. The remaining 90% is behavioral — how recipients respond, whether your headers comply with RFC mandates, and whether your engagement signals classify your domain as high-value or low-value.

                    </p>

                    <p style={{ fontSize: '14px', lineHeight: 1.7, color: 'var(--text-3)' }}>

                      An Infrastructure Score above 85 does not guarantee primary tab placement. Any of the following three triggers — if present — will cause Gmail and Microsoft to silently route your sends to spam.

                    </p>

                  </div>

                </div>

                <Divider />

                <div style={{ marginTop: '36px' }}>

                  {[

                    {

                      num: '01',

                      title: "Google's 0.30% Spam Rate Threshold Doesn't Reset Automatically",

                      body: <>Once recipients manually mark your sends as spam at a rate exceeding <strong style={{ color: 'var(--text-1)', fontWeight: 700 }}>0.30%</strong>, Google Postmaster flags your domain — and that classification persists beyond the triggering campaign. Recovery requires suppressing all non-openers, cleaning your list, and holding send volume under 500/day while you actively monitor the score inside Google Postmaster Tools. It does not self-correct.</>,

                    },

                    {

                      num: '02',

                      title: <>Missing <code style={{ fontFamily: 'monospace', fontSize: '14px', color: 'var(--accent)', background: 'rgba(12,242,208,0.07)', padding: '2px 8px', borderRadius: '5px' }}>List-Unsubscribe-Post</code> Header Violates RFC 8058</>,

                      body: <>Since February 2024, Gmail and Yahoo require one-click unsubscribe via the <strong style={{ color: 'var(--text-1)', fontWeight: 700 }}>List-Unsubscribe-Post</strong> header (RFC 8058). A footer text link does not satisfy this mandate. ESPs that don't inject this header automatically require you to set it manually. Its absence causes infrastructure-level filtering before any recipient can see your email.</>,

                    },

                    {

                      num: '03',

                      title: "Low Engagement Signals Train Filters Against Your Domain — Permanently",

                      body: <>Microsoft SNDS and Gmail's engagement models score what recipients do with your emails. Consistent non-engagement — no replies, no forwards, no stars — progressively reclassifies your domain as low-value promotional content. The fix is not technical: it requires reducing your list to the most engaged segment and engineering a reply signal within the first two sends to a new contact.</>,

                    },

                  ].map((item, i) => (

                    <div key={i}>

                      {i > 0 && <div style={{ height: '1px', background: 'var(--border)', margin: '32px 0' }} />}

                      <div style={{ display: 'grid', gridTemplateColumns: '64px 1fr', gap: '24px', alignItems: 'start' }}>

                        <span style={{

                          fontFamily: 'monospace', fontWeight: 900,

                          fontSize: '3.2rem', color: 'var(--surface-3)',

                          lineHeight: 1, letterSpacing: '-0.04em',

                          userSelect: 'none',

                        }}>

                          {item.num}

                        </span>

                        <div>

                          <h3 style={{

                            fontFamily: 'var(--font-display)', fontWeight: 800,

                            fontSize: '16px', color: 'var(--text-1)',

                            lineHeight: 1.35, marginBottom: '10px', letterSpacing: '-0.01em',

                          }}>

                            {item.title}

                          </h3>

                          <p style={{ fontSize: '14px', color: 'var(--text-2)', lineHeight: 1.75 }}>

                            {item.body}

                          </p>

                        </div>

                      </div>

                    </div>

                  ))}

                </div>

              </div>

            </div>

            {/* ── FIX LIST ── */}

            {fixes.length > 0 && (

              <div className="stagger-4" style={{ marginBottom: '16px' }}>

                <div style={{

                  display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px',

                }}>

                  <h2 style={{

                    fontFamily: 'var(--font-display)', fontWeight: 900,

                    fontSize: '18px', color: 'var(--text-1)',

                    letterSpacing: '-0.01em', whiteSpace: 'nowrap',

                  }}>

                    Required Fixes

                  </h2>

                  <span style={{

                    fontSize: '12px', fontWeight: 700, color: 'var(--text-3)',

                    background: 'var(--surface-2)', border: '1px solid var(--border)',

                    borderRadius: '999px', padding: '4px 12px',

                  }}>

                    {fixes.length} {fixes.length === 1 ? 'item' : 'items'}

                  </span>

                  <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />

                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

                  {fixes.map((fix, index) => (

                    <div

                      key={index}

                      className="card-lift"

                      style={{

                        background: 'var(--surface-1)',

                        border: '1px solid var(--border)',

                        borderRadius: '16px', overflow: 'hidden',

                        position: 'relative',

                        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',

                      }}

                    >

                      <span style={{

                        position: 'absolute', top: '12px', right: '24px',

                        fontFamily: 'monospace', fontWeight: 900,

                        fontSize: '4.5rem', lineHeight: 1,

                        color: 'rgba(255,255,255,0.025)',

                        letterSpacing: '-0.04em', userSelect: 'none',

                        pointerEvents: 'none',

                      }}>

                        {String(index + 1).padStart(2, '0')}

                      </span>

                      <div style={{

                        position: 'absolute', top: 0, left: 0, right: 0, height: '2px',

                        background: fix.impact === 'Critical'

                          ? 'linear-gradient(90deg, var(--red), transparent 80%)'

                          : 'linear-gradient(90deg, var(--amber), transparent 80%)',

                      }} />

                      <div style={{ padding: '28px 32px' }}>

                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>

                          <ImpactBadge impact={fix.impact} />

                          <h3 style={{

                            fontFamily: 'var(--font-display)', fontWeight: 800,

                            fontSize: '17px', color: 'var(--text-1)',

                            letterSpacing: '-0.01em', lineHeight: 1.25,

                          }}>

                            {fix.title}

                          </h3>

                        </div>

                        <p style={{ fontSize: '14px', color: 'var(--text-2)', lineHeight: 1.7 }}>

                          {fix.advice}

                        </p>

                      </div>

                    </div>

                  ))}

                </div>

              </div>

            )}

            {/* ── CTA ── */}

            <div className="print-hidden stagger-5" style={{

              background: 'var(--surface-1)',

              border: '1px solid var(--border)',

              borderRadius: '20px', overflow: 'hidden',

              position: 'relative',

              boxShadow: '0 0 80px rgba(0,0,0,0.4)',

            }}>

              <CardAccentLine />

              <div style={{

                position: 'absolute', top: 0, right: 0,

                width: '400px', height: '300px', pointerEvents: 'none',

                background: 'radial-gradient(circle at 90% 10%, rgba(12,242,208,0.055) 0%, transparent 60%)',

              }} />

              <div style={{

                display: 'grid', gridTemplateColumns: '1fr auto',

                gap: '40px', padding: '48px 52px',

                alignItems: 'center', flexWrap: 'wrap',

              }}>

                <div style={{ position: 'relative', zIndex: 1 }}>

                  <p style={{

                    fontSize: '12px', fontWeight: 700, letterSpacing: '0.2em',

                    textTransform: 'uppercase', color: 'var(--accent)', opacity: 0.8,

                    marginBottom: '14px',

                  }}>

                    45-Minute Deliverability Review

                  </p>

                  <h2 style={{

                    fontFamily: 'var(--font-display)', fontWeight: 900,

                    fontSize: 'clamp(1.6rem, 3vw, 2.4rem)',

                    letterSpacing: '-0.025em', color: 'var(--text-1)',

                    lineHeight: 1.15, marginBottom: '18px',

                  }}>

                    Leave with a working fix,<br />not a list of things to research.

                  </h2>

                  <p style={{ fontSize: '15px', color: 'var(--text-2)', lineHeight: 1.7, marginBottom: '12px', maxWidth: '540px' }}>

                    We will audit your subject line structure, reply-baiting strategy, list segmentation, and <code style={{ fontFamily: 'monospace', fontSize: '14px', color: 'var(--text-2)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px' }}>List-Unsubscribe-Post</code> header configuration — the four behavioral factors that determine whether your sends land in Primary or Promotions.

                  </p>

                  <p style={{ fontSize: '14px', color: 'var(--text-3)', lineHeight: 1.7, maxWidth: '500px' }}>

                    You will leave with a prioritised fix sequence, ESP-specific implementation steps, and a warmup volume schedule calibrated to your current Infrastructure Score of <strong style={{ color: 'var(--text-2)', fontWeight: 700 }}>{report.score}/100</strong>.

                  </p>

                </div>

                <div style={{ position: 'relative', zIndex: 1, flexShrink: 0 }}>

                  <a

                    href="https://your-booking-link-here.com"

                    target="_blank"

                    rel="noreferrer"

                    style={{

                      display: 'block', padding: '18px 36px',

                      background: 'var(--accent)',

                      color: '#04070f', fontWeight: 900,

                      fontSize: '14px', letterSpacing: '0.05em',

                      fontFamily: 'var(--font-display)',

                      borderRadius: '12px', textDecoration: 'none',

                      textAlign: 'center', whiteSpace: 'nowrap',

                      boxShadow: '0 0 28px rgba(12,242,208,0.22)',

                      transition: 'background 0.16s, box-shadow 0.16s, transform 0.12s',

                    }}

                    onMouseEnter={e => {

                      (e.currentTarget as HTMLAnchorElement).style.background = '#0adab9';

                      (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 0 40px rgba(12,242,208,0.38)';

                      (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-2px)';

                    }}

                    onMouseLeave={e => {

                      (e.currentTarget as HTMLAnchorElement).style.background = 'var(--accent)';

                      (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 0 28px rgba(12,242,208,0.22)';

                      (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(0)';

                    }}

                  >

                    Book Infrastructure Review →

                  </a>

                  <p style={{ fontSize: '12px', color: 'var(--text-3)', textAlign: 'center', marginTop: '12px' }}>

                    45 min · No obligation

                  </p>

                </div>

              </div>

            </div>

          </section>

        )}

        {/* ── FOOTER ── */}

        {!isLoading && (

          <footer className="print-hidden" style={{

            borderTop: '1px solid var(--border)',

            padding: '28px 32px',

            display: 'flex', justifyContent: 'space-between', alignItems: 'center',

            maxWidth: '960px', margin: '0 auto',

            flexWrap: 'wrap', gap: '12px',

          }}>

            <span style={{ fontSize: '13px', color: 'var(--text-3)' }}>

              InboxProof · Live DNS Audit

            </span>

            <span style={{ fontSize: '13px', color: 'var(--text-3)', fontFamily: 'monospace' }}>

              2026 Gmail · Yahoo · Outlook Sender Mandates

            </span>

          </footer>

        )}

      </main>

    </>

  );

}

export default function Home() {

  return (

    <Suspense

      fallback={

        <div style={{

          minHeight: '100vh', background: '#04070f',

          display: 'flex', alignItems: 'center', justifyContent: 'center',

        }}>

          <span style={{

            fontSize: '12px', fontWeight: 700, letterSpacing: '0.3em',

            textTransform: 'uppercase', color: 'rgba(12,242,208,0.3)',

            fontFamily: 'monospace',

          }}>

            Initialising...

          </span>

        </div>

      }

    >

      <ReportApp />

    </Suspense>

  );

}
