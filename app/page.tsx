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
        advice: "Your sending domain lacks a valid Sender Policy Framework (SPF) record. Google and Microsoft currently view your emails as spoofed threats. You must log into your DNS provider immediately and authorize your email sending tool via a TXT record."
      });
    }

    if (report.authentication.dmarc === 'Fail') {
      fixes.push({
        title: "Enforce a DMARC Protocol",
        impact: "High",
        advice: "You are operating without a DMARC record. As of early 2024, tier-one providers strictly require this for bulk senders. Deploy a TXT record at `_dmarc.yourdomain.com` starting with `v=DMARC1; p=none;` to halt immediate algorithmic blocking."
      });
    }

    if (report.blacklists.blacklistedCount > 0) {
      fixes.push({
        title: "Eradicate Active Blacklist Triggers",
        impact: "Critical",
        advice: `Your IP is currently flagged on ${report.blacklists.blacklistedCount} global spam databases. Pause all outbound campaigns immediately to stop further reputation damage. You must submit manual delisting requests to the triggered lists or completely cycle your sending IP.`
      });
    }

    if (report.age.days > 0 && report.age.days < 30) {
      fixes.push({
        title: "Initiate Aggressive Domain Warmup",
        impact: "High",
        advice: "Your domain is practically invisible (under 30 days old). Zero inbox trust has been established. Suspend blast campaigns and artificially warm this domain by sending 10-20 highly-engaged emails daily for the next 21 days."
      });
    }

    return fixes;
  };

  const calculateSafeVolume = () => {
    if (!report) return "0";
    const { score, age } = report;
    if (score < 50 || (age.days > 0 && age.days < 30) || report.blacklists.blacklistedCount > 0) return "50 - 100 (Warmup Mode)";
    if (score >= 50 && score < 80) return "1,000 - 2,500";
    return "5,000 - 10,000+";
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main className="min-h-screen bg-[#0a0f1c] text-slate-300 font-sans selection:bg-cyan-900 selection:text-white relative overflow-hidden">
      
      {/* Background Glow Effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-64 bg-cyan-600/20 blur-[120px] rounded-full pointer-events-none print:hidden"></div>

      {/* Hero */}
      <div className="max-w-4xl mx-auto px-6 pt-24 pb-12 text-center relative z-10 print:hidden">
        <div className="inline-block mb-6 px-4 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 text-xs font-bold tracking-widest uppercase">
          Enterprise Deliverability Audit
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-6 leading-tight">
          Stop burning cash on <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">invisible emails.</span>
        </h1>
        <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
          Your cold outreach is useless if it lands in the spam folder. Deep-scan your domain, uncover hidden blacklists, and get a step-by-step recovery protocol in 60 seconds.
        </p>
        
        <form onSubmit={handleAudit} className="max-w-xl mx-auto flex flex-col sm:flex-row gap-3 mb-4">
          <input 
            type="text" 
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="Enter your domain (e.g., yourcompany.com)" 
            className="flex-1 px-6 py-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all shadow-inner"
            required
          />
          <button 
            type="submit" 
            disabled={isLoading}
            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 disabled:opacity-50 text-white font-bold rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] transition-all whitespace-nowrap"
          >
            {isLoading ? 'Scanning Network...' : 'Execute Audit'}
          </button>
        </form>
        {error && <p className="text-red-400 font-medium mt-3 bg-red-400/10 border border-red-400/20 py-2 rounded-lg max-w-xl mx-auto">{error}</p>}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="max-w-4xl mx-auto px-6 pb-20 text-center print:hidden">
          <div className="animate-pulse flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-slate-800 border-t-cyan-400 rounded-full animate-spin mb-4 shadow-[0_0_15px_rgba(6,182,212,0.5)]"></div>
            <p className="text-cyan-400 font-semibold tracking-wide">Querying 50+ global databases...</p>
          </div>
        </div>
      )}

      {/* Report View */}
      {report && !isLoading && (
        <div className="max-w-5xl mx-auto px-6 pb-32 relative z-10 print:pb-0">
          
          {/* Action Buttons */}
          <div className="flex justify-end gap-4 mb-6 print:hidden">
            <button 
              onClick={handleCopyLink}
              className="px-5 py-2.5 bg-white/5 border border-white/10 text-white rounded-lg hover:bg-white/10 font-semibold transition-all flex items-center gap-2"
            >
              {copied ? '✓ Copied to Clipboard' : '🔗 Copy Share Link'}
            </button>
            <button 
              onClick={() => window.print()}
              className="px-5 py-2.5 bg-white text-slate-900 rounded-lg hover:bg-slate-200 font-bold transition-all flex items-center gap-2 shadow-lg"
            >
              📄 Export PDF Report
            </button>
          </div>

          {/* Main Data Grid */}
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden mb-8 shadow-2xl print:bg-white print:border-none print:shadow-none print:rounded-none">
            
            <div className="p-10 text-center relative overflow-hidden print:bg-slate-100 print:text-slate-900">
              <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none print:hidden"></div>
              <h2 className="text-sm font-bold tracking-widest uppercase text-slate-400 print:text-slate-600 mb-4 relative z-10">Domain Reputation Score: {report.domain}</h2>
              <div className="text-7xl font-extrabold mb-4 relative z-10">
                <span className={report.score > 80 ? 'text-green-400 drop-shadow-[0_0_15px_rgba(74,222,128,0.3)] print:text-green-600 print:drop-shadow-none' : report.score > 50 ? 'text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.3)] print:text-yellow-600 print:drop-shadow-none' : 'text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.3)] print:text-red-600 print:drop-shadow-none'}>
                  {report.score}
                </span>
                <span className="text-3xl text-slate-600">/100</span>
              </div>
              <p className="text-lg text-slate-300 font-medium print:text-slate-600 relative z-10">
                {report.score > 80 ? 'Elite sender status. Inbox placement highly probable.' : report.score > 50 ? 'Mediocre sender status. High risk of routing to promotions.' : 'Critical reputation failure. Emails are routing to spam.'}
              </p>
            </div>

            <div className="bg-cyan-900/20 border-y border-cyan-500/20 p-8 text-center print:bg-white print:border-slate-300">
              <h3 className="text-xs font-bold text-cyan-400 print:text-slate-500 uppercase tracking-widest mb-2">Maximum Safe Weekly Volume</h3>
              <p className="text-4xl font-extrabold text-white print:text-slate-900">{calculateSafeVolume()}</p>
            </div>

            <div className="p-10 grid md:grid-cols-2 gap-10">
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-5 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                  Infrastructure
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-5 bg-black/20 rounded-xl border border-white/5 print:bg-slate-50 print:border-slate-200">
                    <span className="font-medium text-slate-300 print:text-slate-700">SPF Record</span>
                    <span className={`font-bold tracking-wide ${report.authentication.spf === 'Pass' ? 'text-green-400 print:text-green-600' : 'text-red-400 print:text-red-600'}`}>
                      {report.authentication.spf}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-5 bg-black/20 rounded-xl border border-white/5 print:bg-slate-50 print:border-slate-200">
                    <span className="font-medium text-slate-300 print:text-slate-700">DMARC Record</span>
                    <span className={`font-bold tracking-wide ${report.authentication.dmarc === 'Pass' ? 'text-green-400 print:text-green-600' : 'text-red-400 print:text-red-600'}`}>
                      {report.authentication.dmarc}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-5 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                  Trust Metrics
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-5 bg-black/20 rounded-xl border border-white/5 print:bg-slate-50 print:border-slate-200">
                    <span className="font-medium text-slate-300 print:text-slate-700">Global Blacklists Hit</span>
                    <span className={`font-bold tracking-wide ${report.blacklists.blacklistedCount === 0 ? 'text-green-400 print:text-green-600' : 'text-red-400 print:text-red-600'}`}>
                      {report.blacklists.blacklistedCount} / {report.blacklists.totalChecked}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-5 bg-black/20 rounded-xl border border-white/5 print:bg-slate-50 print:border-slate-200">
                    <span className="font-medium text-slate-300 print:text-slate-700">Registered Age</span>
                    <span className="font-bold tracking-wide text-white print:text-slate-900">
                      {report.age.days > 0 ? `${report.age.days} days` : 'Unknown'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Fix Protocol */}
          {generateFixList().length > 0 && (
            <div className="mb-12 print:break-inside-avoid">
              <h3 className="text-3xl font-extrabold mb-8 text-white print:text-slate-900 flex items-center gap-4">
                Recovery Protocol
                <span className="h-px bg-white/10 flex-1 print:bg-slate-300"></span>
              </h3>
              <div className="space-y-5">
                {generateFixList().map((fix, index) => (
                  <div key={index} className="bg-white/5 backdrop-blur-md p-8 rounded-2xl border border-white/10 border-l-4 border-l-red-500 shadow-lg print:border-slate-300 print:border-l-4 print:border-l-slate-800 print:bg-white">
                    <div className="flex items-center gap-4 mb-3">
                      <span className="bg-red-500/20 border border-red-500/30 text-red-400 print:bg-slate-200 print:text-slate-800 print:border-slate-300 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                        {fix.impact} Priority
                      </span>
                      <h4 className="text-xl font-bold text-white print:text-slate-900">{fix.title}</h4>
                    </div>
                    <p className="text-slate-400 print:text-slate-600 leading-relaxed text-lg">{fix.advice}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Conversion Hook */}
          <div className="mt-20 bg-gradient-to-br from-blue-900 to-[#0a0f1c] rounded-3xl p-12 md:p-16 text-center border border-blue-500/30 shadow-[0_0_50px_rgba(30,58,138,0.3)] print:hidden relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[80px] -mr-40 -mt-40 pointer-events-none"></div>
            
            <h3 className="text-4xl md:text-5xl font-extrabold mb-6 text-white relative z-10 leading-tight">
              Stop guessing. Start dominating the inbox.
            </h3>
            <p className="text-xl text-blue-200 mb-10 max-w-3xl mx-auto leading-relaxed relative z-10">
              You can spend the next month fighting algorithms and begging blacklists for mercy, or we can deploy our recovery systems to repair your domain and force your emails back into the primary inbox.
            </p>
            <a 
              href="https://your-booking-link-here.com" 
              target="_blank" 
              rel="noreferrer" 
              className="inline-block px-12 py-5 bg-white text-blue-950 font-black rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.3)] text-xl hover:scale-105 hover:bg-slate-100 transition-all relative z-10 uppercase tracking-wide"
            >
              Book a Strategy Call
            </a>
            <p className="text-sm text-blue-400/80 mt-6 font-semibold tracking-wide uppercase relative z-10">
              Strictly for high-volume senders.
            </p>
          </div>

        </div>
      )}
      
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0f1c] flex items-center justify-center text-cyan-400 font-bold tracking-widest">INITIALIZING SECURE ENVIRONMENT...</div>}>
      <ReportApp />
    </Suspense>
  );
}