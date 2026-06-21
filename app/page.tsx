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

    // Tolerance Threshold: Only alert if more than 3 blacklists are hit
    if (report.blacklists.blacklistedCount > 3) {
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
    const { score, age, blacklists } = report;
    // Tolerance Threshold: Only force warmup if score is terrible, domain is new, or severely blacklisted (>3)
    if (score < 50 || (age.days > 0 && age.days < 30) || blacklists.blacklistedCount > 3) return "50 - 100 (Warmup Mode)";
    if (score >= 50 && score < 80) return "1,000 - 2,500";
    return "5,000 - 10,000+";
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main className="min-h-screen bg-[#060913] text-slate-300 font-sans selection:bg-cyan-900 selection:text-white relative overflow-hidden">
      
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-64 bg-cyan-600/10 blur-[120px] rounded-full pointer-events-none print:hidden"></div>

      <div className="max-w-4xl mx-auto px-6 pt-24 pb-12 text-center relative z-10 print:hidden">
        <div className="inline-block mb-6 px-4 py-1.5 rounded-full border border-cyan-500/20 bg-cyan-500/10 text-cyan-400 text-xs font-bold tracking-widest uppercase">
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
            className="flex-1 px-6 py-4 rounded-xl bg-[#0f1526] border border-white/5 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all shadow-inner"
            required
          />
          <button 
            type="submit" 
            disabled={isLoading}
            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 disabled:opacity-50 text-white font-bold rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.2)] hover:shadow-[0_0_30px_rgba(6,182,212,0.4)] transition-all whitespace-nowrap"
          >
            {isLoading ? 'Scanning Network...' : 'Execute Audit'}
          </button>
        </form>
        {error && <p className="text-red-400 font-medium mt-3 bg-red-400/10 border border-red-400/20 py-2 rounded-lg max-w-xl mx-auto">{error}</p>}
      </div>

      {isLoading && (
        <div className="max-w-4xl mx-auto px-6 pb-20 text-center print:hidden">
          <div className="animate-pulse flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-[#0f1526] border-t-cyan-500 rounded-full animate-spin mb-4 shadow-[0_0_15px_rgba(6,182,212,0.3)]"></div>
            <p className="text-cyan-400 font-semibold tracking-wide">Querying 50+ global databases...</p>
          </div>
        </div>
      )}

      {report && !isLoading && (
        <div className="max-w-5xl mx-auto px-6 pb-32 relative z-10 print:pb-0">
          
          <div className="flex justify-end gap-4 mb-6 print:hidden">
            <button 
              onClick={handleCopyLink}
              className="px-5 py-2.5 bg-[#0f1526] border border-white/5 text-slate-300 rounded-lg hover:bg-white/5 hover:text-white font-semibold transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
              {copied ? 'Copied' : 'Share Link'}
            </button>
            <button 
              onClick={() => window.print()}
              className="px-5 py-2.5 bg-white text-slate-900 rounded-lg hover:bg-slate-200 font-bold transition-all flex items-center gap-2 shadow-lg"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
              Export PDF
            </button>
          </div>

          <div className="bg-[#0b101e] rounded-3xl border border-white/[0.08] overflow-hidden mb-12 shadow-[0_20px_50px_rgba(0,0,0,0.5)] print:bg-white print:border-none print:shadow-none print:rounded-none">
            
            <div className="p-12 text-center relative overflow-hidden print:bg-slate-100 print:text-slate-900">
              <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none print:hidden"></div>
              <h2 className="text-xs font-bold tracking-[0.2em] uppercase text-slate-500 print:text-slate-600 mb-6 relative z-10">Domain Reputation Score: {report.domain}</h2>
              <div className="text-8xl font-black mb-6 relative z-10 tracking-tighter">
                <span className={report.score > 80 ? 'text-green-400 drop-shadow-[0_0_20px_rgba(74,222,128,0.2)] print:text-green-600 print:drop-shadow-none' : report.score > 50 ? 'text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.2)] print:text-yellow-600 print:drop-shadow-none' : 'text-red-500 drop-shadow-[0_0_20px_rgba(239,68,68,0.2)] print:text-red-600 print:drop-shadow-none'}>
                  {report.score}
                </span>
                <span className="text-4xl text-slate-700 font-bold">/100</span>
              </div>
              <p className="text-lg text-slate-400 font-medium print:text-slate-600 relative z-10 max-w-md mx-auto">
                {report.score > 80 ? 'Elite sender status. Inbox placement highly probable.' : report.score > 50 ? 'Mediocre sender status. High risk of routing to promotions.' : 'Critical reputation failure. Emails are routing to spam.'}
              </p>
            </div>

            <div className="bg-gradient-to-r from-cyan-950/40 via-blue-900/20 to-cyan-950/40 border-y border-white/[0.05] p-8 text-center print:bg-white print:border-slate-300 relative">
              <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent print:hidden"></div>
              <h3 className="text-xs font-bold text-cyan-500 print:text-slate-500 uppercase tracking-[0.2em] mb-3">Maximum Safe Weekly Volume</h3>
              <p className="text-4xl font-black text-white print:text-slate-900 tracking-tight">{calculateSafeVolume()}</p>
            </div>

            <div className="p-8 md:p-12 grid md:grid-cols-2 gap-8">
              
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-[0.15em] mb-6 flex items-center gap-3">
                  <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
                  Infrastructure
                </h3>
                <div className="space-y-4">
                  <div className="relative overflow-hidden rounded-2xl bg-[#111827] border border-white/[0.05] p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02)] print:bg-slate-50 print:border-slate-200">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-1 print:text-slate-600">SPF Record</span>
                    <span className={`text-2xl font-bold tracking-tight ${report.authentication.spf === 'Pass' ? 'text-green-400 print:text-green-600' : 'text-red-400 print:text-red-600'}`}>
                      {report.authentication.spf}
                    </span>
                  </div>
                  <div className="relative overflow-hidden rounded-2xl bg-[#111827] border border-white/[0.05] p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02)] print:bg-slate-50 print:border-slate-200">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-1 print:text-slate-600">DMARC Record</span>
                    <span className={`text-2xl font-bold tracking-tight ${report.authentication.dmarc === 'Pass' ? 'text-green-400 print:text-green-600' : 'text-red-400 print:text-red-600'}`}>
                      {report.authentication.dmarc}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-[0.15em] mb-6 flex items-center gap-3">
                  <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                  Trust Metrics
                </h3>
                <div className="space-y-4">
                  <div className="relative overflow-hidden rounded-2xl bg-[#111827] border border-white/[0.05] p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02)] print:bg-slate-50 print:border-slate-200">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-1 print:text-slate-600">Global Blacklists Hit</span>
                    <span className={`text-2xl font-bold tracking-tight ${report.blacklists.blacklistedCount === 0 ? 'text-green-400 print:text-green-600' : report.blacklists.blacklistedCount <= 3 ? 'text-yellow-400 print:text-yellow-600' : 'text-red-400 print:text-red-600'}`}>
                      {report.blacklists.blacklistedCount} / {report.blacklists.totalChecked}
                    </span>
                  </div>
                  <div className="relative overflow-hidden rounded-2xl bg-[#111827] border border-white/[0.05] p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02)] print:bg-slate-50 print:border-slate-200">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-1 print:text-slate-600">Registered Age</span>
                    <span className="text-2xl font-bold tracking-tight text-white print:text-slate-900">
                      {report.age.days > 0 ? `${report.age.days} days` : 'Unknown'}
                    </span>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {generateFixList().length > 0 && (
            <div className="mb-16 print:break-inside-avoid">
              <div className="flex items-center gap-6 mb-8">
                <h3 className="text-2xl font-black text-white print:text-slate-900 tracking-tight">Recovery Protocol</h3>
                <div className="h-px bg-white/10 flex-1 print:bg-slate-300"></div>
              </div>
              
              <div className="space-y-6">
                {generateFixList().map((fix, index) => (
                  <div key={index} className="relative group overflow-hidden rounded-2xl bg-[#0b101e] border border-white/[0.05] p-8 shadow-lg transition-all hover:border-white/10 print:bg-white print:border-slate-300 print:shadow-none">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-red-500 to-red-900 opacity-80 print:bg-slate-800"></div>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
                      <span className="inline-flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 text-red-400 print:bg-slate-100 print:text-slate-700 print:border-slate-300 text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-widest w-fit">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 print:bg-slate-500 animate-pulse"></span>
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

          <div className="bg-[#0b101e] rounded-3xl p-12 md:p-16 text-center border border-blue-500/20 shadow-[0_0_60px_rgba(30,58,138,0.15)] print:hidden relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-transparent pointer-events-none"></div>
            <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-[100px] -mr-40 -mt-40 pointer-events-none"></div>
            
            <h3 className="text-4xl md:text-5xl font-extrabold mb-6 text-white relative z-10 leading-tight tracking-tight">
              Stop guessing. Start dominating the inbox.
            </h3>
            <p className="text-lg text-slate-400 mb-10 max-w-3xl mx-auto leading-relaxed relative z-10">
              You can spend the next month fighting algorithms and begging blacklists for mercy, or we can deploy our enterprise recovery systems to repair your domain and force your emails back into the primary inbox.
            </p>
            <a 
              href="https://your-booking-link-here.com" 
              target="_blank" 
              rel="noreferrer" 
              className="inline-block px-12 py-5 bg-white text-slate-950 font-black rounded-xl shadow-[0_0_30px_rgba(255,255,255,0.1)] text-lg hover:scale-[1.02] hover:bg-slate-100 transition-all relative z-10 uppercase tracking-widest"
            >
              Book a Strategy Call
            </a>
            <p className="text-xs text-slate-500 mt-6 font-bold tracking-[0.2em] uppercase relative z-10">
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
    <Suspense fallback={<div className="min-h-screen bg-[#060913] flex items-center justify-center text-cyan-500/50 text-sm font-bold tracking-[0.3em]">INITIALIZING SECURE ENVIRONMENT...</div>}>
      <ReportApp />
    </Suspense>
  );
}