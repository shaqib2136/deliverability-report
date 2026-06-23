"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function ReportApp() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialDomain = searchParams.get('domain') || '';

  const [domain, setDomain] = useState(initialDomain);
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
        body: JSON.stringify({ domain: targetDomain })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to audit domain');

      setReport(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const generateFixList = () => {
    if (!report) return [];
    const fixes = [];

    if (report.authentication.spf === 'Fail') {
      fixes.push({
        title: "Authenticate Your Infrastructure (SPF)",
        impact: "Critical",
        advice: `Your domain lacks a valid Sender Policy Framework (SPF) record. Google and Microsoft currently view your emails as spoofed threats and will reject them. This blocks approximately 40% of your outbound sends.`
      });
    }

    if (report.authentication.dmarc === 'Fail') {
      fixes.push({
        title: "Enforce a DMARC Protocol",
        impact: "Critical",
        advice: `You are operating without a DMARC record. 2026 guidelines from tier-one providers strictly require this. Deploy a TXT record immediately to prevent spoofing and improve deliverability.`
      });
    }

    if (report.authentication.dmarc === 'Pass' && !report.authentication.dmarcStrict) {
      fixes.push({
        title: "Upgrade DMARC to Enforcement",
        impact: "High",
        advice: `Your DMARC record is set to 'p=none'. Upgrade to 'p=quarantine' or 'p=reject' to satisfy strict enterprise filters and stop domain spoofing.`
      });
    }

    if (report.blacklists.blacklistedCount > 3) {
      fixes.push({
        title: "Eradicate Active Blacklist Triggers",
        impact: "Critical",
        advice: `Your IP is flagged on ${report.blacklists.blacklistedCount} global databases. Pause campaigns immediately, check your FCrDNS matching, and submit manual delisting requests. This is killing your inbox placement.`
      });
    }

    if (report.age.days > 0 && report.age.days < 90) {
      fixes.push({
        title: "Initiate Domain Warmup",
        impact: "High",
        advice: `Your domain is practically invisible (${report.age.days} days old). Zero inbox trust has been established. Warm this domain slowly before scaling volume, or you'll be flagged as a spam source.`
      });
    }

    return fixes;
  };

  const calculateSafeVolume = () => {
    if (!report) return "0";
    const { score, age, blacklists } = report;
    if (score < 50 || (age.days > 0 && age.days < 30) || blacklists?.blacklistedCount > 3) return "50 – 100 (Warmup Mode)";
    if (score >= 50 && score < 85) return "1,000 – 2,500";
    return "5,000 – 10,000+";
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const score = report?.score ?? 0;

  return (
    <main className="min-h-screen bg-[#060913] text-slate-300 font-sans selection:bg-cyan-900 selection:text-white relative overflow-hidden">
      {/* Subtle glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-64 bg-teal-500/10 blur-[120px] rounded-full pointer-events-none print:hidden" />

      <div className="max-w-4xl mx-auto px-6 pt-20 pb-12 relative z-10 print:hidden">
        {/* Badge – left aligned */}
        <div className="mb-6">
          <span className="inline-block px-4 py-1.5 rounded-full border border-teal-500/20 bg-teal-500/10 text-teal-400 text-xs font-bold tracking-widest uppercase">
            Real-time DNS audit against 2026 mailbox provider requirements
          </span>
        </div>

        {/* Hero – left aligned with clean input */}
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white mb-4 leading-tight">
          Your email infrastructure is leaking revenue.<br />
          <span className="text-teal-400">Here's exactly where.</span>
        </h1>
        <p className="text-lg text-slate-400 mb-8 max-w-xl leading-relaxed">
          We scan SPF, DMARC, blacklist databases, and domain age to identify every configuration error that's costing you inbox placement. Results in 60 seconds.
        </p>

        <form onSubmit={handleAudit} className="flex flex-col sm:flex-row gap-3 max-w-xl">
          <input
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="company.com"
            className="flex-1 px-6 py-4 rounded-xl bg-[#0f1526] border border-white/5 text-white placeholder-slate-600 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 transition-all shadow-inner"
            required
          />
          <button
            type="submit"
            disabled={isLoading}
            className="px-8 py-4 bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-white font-bold rounded-xl shadow-[0_0_20px_rgba(10,191,191,0.2)] hover:shadow-[0_0_30px_rgba(10,191,191,0.4)] transition-all whitespace-nowrap"
          >
            {isLoading ? 'Scanning...' : 'Audit Infrastructure'}
          </button>
        </form>
        {error && <p className="text-red-400 font-medium mt-4 bg-red-400/10 border border-red-400/20 py-2 px-4 rounded-lg max-w-xl">{error}</p>}
      </div>

      {/* Loading state with staggered lines */}
      {isLoading && (
        <div className="max-w-4xl mx-auto px-6 pb-20 text-center print:hidden">
          <div className="flex flex-col items-center space-y-2">
            <div className="w-12 h-12 border-4 border-[#0f1526] border-t-teal-500 rounded-full animate-spin mb-4 shadow-[0_0_15px_rgba(10,191,191,0.3)]" />
            <style jsx>{`
              .fade-in {
                opacity: 0;
                animation: fadeIn 0.5s ease forwards;
              }
              .fade-in:nth-child(1) { animation-delay: 0ms; }
              .fade-in:nth-child(2) { animation-delay: 200ms; }
              .fade-in:nth-child(3) { animation-delay: 400ms; }
              @keyframes fadeIn {
                to { opacity: 1; transform: translateY(0); }
              }
            `}</style>
            <p className="fade-in text-cyan-400 font-semibold tracking-wide">Scanning Spamhaus, SORBS, and 48 other reputation systems...</p>
            <p className="fade-in text-cyan-400 font-semibold tracking-wide">Validating SPF, DKIM, DMARC alignment...</p>
            <p className="fade-in text-cyan-400 font-semibold tracking-wide">Analyzing domain reputation and age...</p>
          </div>
        </div>
      )}

      {/* Report */}
      {report && !isLoading && (
        <div className="max-w-5xl mx-auto px-6 pb-32 relative z-10 print:pb-0">
          {/* Action buttons row */}
          <div className="flex justify-end gap-4 mb-6 print:hidden">
            <button
              onClick={handleCopyLink}
              className="px-5 py-2.5 bg-[#0f1526] border border-white/5 text-slate-300 rounded-lg hover:bg-white/5 hover:text-white font-semibold transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
              {copied ? 'Copied' : 'Share Link'}
            </button>
            <button
              onClick={() => window.print()}
              className="px-5 py-2.5 bg-white text-slate-900 rounded-lg hover:bg-slate-200 font-bold transition-all flex items-center gap-2 shadow-lg"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              Export PDF
            </button>
          </div>

          {/* Score card – with horizontal progress bar */}
          <div className="bg-[#0c1221] rounded-3xl border border-white/[0.06] overflow-hidden mb-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)] print:bg-white print:border-none print:shadow-none print:rounded-none">
            <div className="p-8 md:p-12 relative overflow-hidden print:bg-slate-100 print:text-slate-900">
              <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none print:hidden" />

              <h2 className="text-xs font-bold tracking-[0.2em] uppercase text-slate-500 print:text-slate-600 mb-4">
                Infrastructure Report — {report.domain}
              </h2>

              {/* Score as big number with horizontal bar */}
              <div className="flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-8">
                <div className="flex-shrink-0">
                  <span className="text-7xl font-black tracking-tighter text-white print:text-slate-900">
                    {score}
                  </span>
                  <span className="text-3xl font-bold text-slate-500 print:text-slate-400">/100</span>
                </div>
                <div className="flex-1 w-full">
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden print:bg-slate-300">
                    <div
                      className="h-full rounded-full transition-all duration-1000 ease-out"
                      style={{
                        width: `${score}%`,
                        backgroundColor: score >= 85 ? '#4ade80' : score >= 60 ? '#facc15' : '#ef4444'
                      }}
                    />
                  </div>
                  <p className="mt-4 text-lg font-medium text-slate-300 print:text-slate-700">
                    {score >= 85
                      ? "Authentication is solid. Next: optimize engagement signals."
                      : score >= 60
                      ? "Your setup is costing you ~30% delivery. Fix enforcement gaps."
                      : "Critical failures detected. Google will downgrade your reputation."}
                  </p>
                </div>
              </div>
            </div>

            {/* Safe volume */}
            <div className="bg-gradient-to-r from-teal-950/40 via-blue-900/20 to-teal-950/40 border-y border-white/[0.06] p-8 text-center print:bg-white print:border-slate-300 relative">
              <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-teal-500/50 to-transparent print:hidden" />
              <h3 className="text-xs font-bold text-teal-400 print:text-slate-500 uppercase tracking-[0.2em] mb-1">
                Estimated Safe Weekly Volume
              </h3>
              <p className="text-sm text-slate-400 print:text-slate-600 mb-2">
                Based on your current score and blacklist status.
              </p>
              <p className="text-4xl font-black text-white print:text-slate-900 tracking-tight">
                {calculateSafeVolume()}
              </p>
            </div>

            {/* Metrics grid – all six in one grid with consistent styling */}
            <div className="p-8 md:p-12">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-[0.15em] mb-6">
                Configuration Deep-Dive
              </h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* SPF */}
                <div className="relative overflow-hidden rounded-2xl bg-[#111827] border border-white/[0.06] p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02)] print:bg-slate-50 print:border-slate-200">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-1 print:text-slate-600">SPF Record</span>
                  <span className={`text-2xl font-bold tracking-tight ${report.authentication.spf === 'Pass' ? 'text-green-400 print:text-green-600' : 'text-red-400 print:text-red-600'}`}>
                    {report.authentication.spf}
                  </span>
                  <p className="text-xs text-slate-500 mt-1">
                    {report.authentication.spf === 'Pass'
                      ? 'SPF matches your sending IPs.'
                      : 'SPF does not authorize your sending IPs.'}
                  </p>
                </div>

                {/* DMARC */}
                <div className="relative overflow-hidden rounded-2xl bg-[#111827] border border-white/[0.06] p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02)] print:bg-slate-50 print:border-slate-200">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-1 print:text-slate-600">DMARC Enforcement</span>
                  <span className={`text-2xl font-bold tracking-tight ${report.authentication.dmarcStrict === true ? 'text-green-400 print:text-green-600' : 'text-red-400 print:text-red-600'}`}>
                    {report.authentication.dmarcStrict ? 'Strict' : report.authentication.dmarc === 'Pass' ? 'Monitor Only' : 'Fail'}
                  </span>
                  <p className="text-xs text-slate-500 mt-1">
                    {report.authentication.dmarcStrict
                      ? 'Enforcement active, preventing spoofing.'
                      : report.authentication.dmarc === 'Pass'
                      ? 'Emails can be spoofed. Upgrade to p=quarantine.'
                      : 'No DMARC policy found.'}
                  </p>
                </div>

                {/* Blacklists */}
                <div className="relative overflow-hidden rounded-2xl bg-[#111827] border border-white/[0.06] p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02)] print:bg-slate-50 print:border-slate-200">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-1 print:text-slate-600">Global Blacklists</span>
                  <span className={`text-2xl font-bold tracking-tight ${report.blacklists.blacklistedCount === 0 ? 'text-green-400 print:text-green-600' : report.blacklists.blacklistedCount <= 3 ? 'text-yellow-400 print:text-yellow-600' : 'text-red-400 print:text-red-600'}`}>
                    {report.blacklists.blacklistedCount} / {report.blacklists.totalChecked}
                  </span>
                  <p className="text-xs text-slate-500 mt-1">
                    {report.blacklists.blacklistedCount === 0
                      ? 'Clean — no blacklists.'
                      : report.blacklists.blacklistedCount <= 3
                      ? 'Some blacklists flagged — investigate.'
                      : 'Multiple blacklists — urgent action needed.'}
                  </p>
                </div>

                {/* BIMI */}
                <div className="relative overflow-hidden rounded-2xl bg-[#111827] border border-white/[0.06] p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02)] print:bg-slate-50 print:border-slate-200">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-1 print:text-slate-600">BIMI Brand Indicator</span>
                  <span className={`text-xl font-bold tracking-tight text-slate-300 print:text-slate-700`}>
                    {report.authentication.bimi === 'Pass' ? 'Installed' : 'Not Installed'}
                  </span>
                  <p className="text-xs text-slate-500 mt-1">
                    {report.authentication.bimi === 'Pass'
                      ? 'Logo will display in supported inboxes.'
                      : 'No BIMI record found.'}
                  </p>
                </div>

                {/* MTA-STS */}
                <div className="relative overflow-hidden rounded-2xl bg-[#111827] border border-white/[0.06] p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02)] print:bg-slate-50 print:border-slate-200">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-1 print:text-slate-600">MTA-STS Protocol</span>
                  <span className={`text-xl font-bold tracking-tight text-slate-300 print:text-slate-700`}>
                    {report.authentication.mtasts === 'Pass' ? 'Installed' : 'Not Installed'}
                  </span>
                  <p className="text-xs text-slate-500 mt-1">
                    {report.authentication.mtasts === 'Pass'
                      ? 'Encryption enforced for transit.'
                      : 'No MTA-STS record found.'}
                  </p>
                </div>

                {/* Domain Age */}
                <div className="relative overflow-hidden rounded-2xl bg-[#111827] border border-white/[0.06] p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02)] print:bg-slate-50 print:border-slate-200">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-1 print:text-slate-600">Registered Age</span>
                  <span className="text-xl font-bold tracking-tight text-slate-300 print:text-slate-700">
                    {report.age.days > 0 ? `${report.age.days} days` : 'Unknown'}
                  </span>
                  <p className="text-xs text-slate-500 mt-1">
                    {report.age.days > 0
                      ? `Registered ${report.age.days} days ago.`
                      : 'Age data unavailable.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Diagnostic Engine – vertical list with numbered items and subtle icons */}
          <div className="mb-12 relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-950/40 to-[#0c1221] border border-red-500/30 p-8 md:p-10 shadow-[0_0_30px_rgba(239,68,68,0.1)] print:border-slate-300 print:bg-white">
            <h3 className="text-2xl font-black text-white mb-4 print:text-slate-900 tracking-tight">
              The Invisible Filters That Kill Deliverability
            </h3>
            <div className="space-y-4 text-slate-300 print:text-slate-600 mb-8">
              <p className="leading-relaxed text-lg">
                Perfect DNS is only 10% of the battle. These three behavioral triggers determine if you land in Primary or Promotions.
              </p>
            </div>

            <div className="space-y-4">
              {[
                {
                  number: '01',
                  title: 'Google Postmaster Spam Rate',
                  desc: 'If users mark your emails as spam at a rate higher than 0.30%, Google will permanently route your domain to the spam folder, regardless of your DNS setup.'
                },
                {
                  number: '02',
                  title: 'RFC 8058 Non-Compliance',
                  desc: 'As of 2026, Gmail and Yahoo require the exact List-Unsubscribe-Post header. If you only use a text link, you are violating the one-click mandate and will be filtered.'
                },
                {
                  number: '03',
                  title: 'Low Engagement Signals',
                  desc: 'If recipients routinely ignore your emails without replying, forwarding, or starring them, Microsoft\'s SNDS and Google\'s algorithms will classify your domain content as low-value promotional mail.'
                }
              ].map((item) => (
                <div key={item.number} className="flex gap-4 items-start bg-[#111827] p-5 rounded-xl border border-white/5 print:bg-slate-50 print:border-slate-200">
                  <span className="text-3xl font-mono font-black text-red-500/30 print:text-slate-400 leading-none select-none">
                    {item.number}
                  </span>
                  <div>
                    <h4 className="font-bold text-white print:text-slate-800">{item.title}</h4>
                    <p className="text-sm text-slate-400 print:text-slate-600 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Fix List */}
          {generateFixList().length > 0 && (
            <div className="mb-16 print:break-inside-avoid">
              <div className="flex items-center gap-6 mb-8">
                <h3 className="text-2xl font-black text-white print:text-slate-900 tracking-tight">Technical Fix List</h3>
                <div className="h-px bg-white/10 flex-1 print:bg-slate-300" />
              </div>

              <div className="space-y-6">
                {generateFixList().map((fix, index) => (
                  <div key={index} className="relative group overflow-hidden rounded-2xl bg-[#0c1221] border border-white/[0.06] p-8 shadow-lg transition-all hover:border-white/10 print:bg-white print:border-slate-300 print:shadow-none">
                    {/* Decorative number */}
                    <span className="absolute top-4 right-6 font-mono text-6xl font-black text-white/5 print:text-slate-200 select-none">
                      {String(index + 1).padStart(2, '0')}
                    </span>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
                      <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-widest w-fit ${
                        fix.impact === 'Critical'
                          ? 'bg-red-500/10 border border-red-500/20 text-red-400 print:bg-red-100 print:text-red-700 print:border-red-300'
                          : 'bg-amber-500/10 border border-amber-500/20 text-amber-400 print:bg-amber-100 print:text-amber-700 print:border-amber-300'
                      }`}>
                        {fix.impact} Priority
                      </span>
                      <h4 className="text-xl font-bold text-white print:text-slate-900">{fix.title}</h4>
                    </div>
                    <p className="text-slate-400 print:text-slate-600 leading-relaxed text-base pl-1">{fix.advice}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Final CTA */}
          <div className="bg-[#0c1221] rounded-3xl p-12 md:p-16 text-center border border-teal-500/20 shadow-[0_0_60px_rgba(10,191,191,0.08)] print:hidden relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-teal-900/20 to-transparent pointer-events-none" />
            <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/10 rounded-full blur-[100px] -mr-40 -mt-40 pointer-events-none" />

            <h3 className="text-3xl md:text-4xl font-extrabold mb-6 text-white relative z-10 leading-tight tracking-tight">
              In a 45-minute consultation, we'll dissect your subject line psychology, reply triggers, and list hygiene to ensure you hit the Primary tab.
            </h3>
            <p className="text-lg text-slate-400 mb-10 max-w-3xl mx-auto leading-relaxed relative z-10">
              You'll receive a clear roadmap to fix your behavioral signals and stop leaking revenue to the spam folder.
            </p>
            <a
              href="https://your-booking-link-here.com"
              target="_blank"
              rel="noreferrer"
              className="inline-block px-12 py-5 bg-white text-slate-950 font-black rounded-xl shadow-[0_0_30px_rgba(255,255,255,0.1)] text-lg hover:scale-[1.02] hover:bg-slate-100 transition-all relative z-10 uppercase tracking-widest"
            >
              Book Your Deliverability Audit
            </a>
          </div>
        </div>
      )}
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#060913] flex items-center justify-center text-teal-500/50 text-sm font-bold tracking-[0.3em]">INITIALIZING SECURE ENVIRONMENT...</div>}>
      <ReportApp />
    </Suspense>
  );
}