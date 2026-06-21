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
        title: "Fix Missing or Broken SPF Record",
        impact: "Critical",
        advice: "Your domain lacks a valid Sender Policy Framework (SPF) record. Without this, Gmail and Outlook assume anyone sending from your domain is a spoofing scammer. Log into your DNS provider and add a TXT record authenticating your email sending tool."
      });
    }

    if (report.authentication.dmarc === 'Fail') {
      fixes.push({
        title: "Implement a DMARC Policy",
        impact: "High",
        advice: "You are missing a DMARC record. As of early 2024, Yahoo and Google strictly require DMARC for bulk senders. Add a TXT record at `_dmarc.yourdomain.com` starting with a simple monitor policy: `v=DMARC1; p=none;` to stop immediate blocking."
      });
    }

    if (report.blacklists.blacklistedCount > 0) {
      fixes.push({
        title: "Delist from Active Blacklists",
        impact: "Critical",
        advice: `Your domain's IP is currently flagged on ${report.blacklists.blacklistedCount} global spam lists. Pause all cold email campaigns immediately. Visit the specific blacklists triggered and submit a manual delisting request.`
      });
    }

    if (report.age.days > 0 && report.age.days < 30) {
      fixes.push({
        title: "Execute a Domain Warmup Strategy",
        impact: "High",
        advice: "Your domain is brand new (under 30 days old). Do not send blast campaigns. You must artificially warm up the domain by sending 10-20 emails per day to known, engaged contacts for the next 3 weeks to build a sender reputation."
      });
    }

    return fixes;
  };

  const calculateSafeVolume = () => {
    if (!report) return "0";
    const { score, age } = report;
    if (score < 50 || (age.days > 0 && age.days < 30) || report.blacklists.blacklistedCount > 0) return "50 - 100 (Warmup Only)";
    if (score >= 50 && score < 80) return "1,000 - 2,500";
    return "5,000 - 10,000+";
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-200">
      
      {/* Hero Section */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-10 text-center print:hidden">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 mb-4">
          Stop guessing why your emails land in spam.
        </h1>
        <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto leading-relaxed">
          Run a full deliverability audit on your sending domain. Get a scored report and a prioritized fix list in under 60 seconds.
        </p>
        
        <form onSubmit={handleAudit} className="max-w-xl mx-auto flex flex-col sm:flex-row gap-4 mb-4">
          <input 
            type="text" 
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="Enter your domain (e.g., yourcompany.com)" 
            className="flex-1 px-6 py-4 rounded-lg border border-slate-300 shadow-sm text-lg focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all"
            required
          />
          <button 
            type="submit" 
            disabled={isLoading}
            className="px-8 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold rounded-lg shadow-md text-lg transition-colors whitespace-nowrap"
          >
            {isLoading ? 'Scanning...' : 'Audit Domain'}
          </button>
        </form>
        {error && <p className="text-red-600 font-medium mt-2">{error}</p>}
      </section>

      {/* Loading State */}
      {isLoading && (
        <div className="max-w-4xl mx-auto px-6 pb-20 text-center print:hidden">
          <div className="animate-pulse flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
            <p className="text-slate-600 font-medium">Querying 50+ global blacklists and DNS records...</p>
          </div>
        </div>
      )}

      {/* Report View */}
      {report && !isLoading && (
        <section className="max-w-4xl mx-auto px-6 pb-32 print:pb-0">
          
          {/* Action Buttons */}
          <div className="flex justify-end gap-4 mb-6 print:hidden">
            <button 
              onClick={handleCopyLink}
              className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium shadow-sm transition-colors flex items-center gap-2"
            >
              {copied ? '✓ Copied' : '🔗 Copy Link'}
            </button>
            <button 
              onClick={() => window.print()}
              className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-medium shadow-sm transition-colors flex items-center gap-2"
            >
              📄 Download PDF
            </button>
          </div>

          {/* Data Grid */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-8 print:border-none print:shadow-none print:rounded-none">
            <div className="bg-slate-900 p-8 text-center text-white print:bg-slate-100 print:text-slate-900">
              <h2 className="text-lg font-medium text-slate-300 print:text-slate-600 mb-2">Sending Reputation Score for {report.domain}</h2>
              <div className="text-6xl font-extrabold mb-2">
                <span className={report.score > 80 ? 'text-green-400 print:text-green-600' : report.score > 50 ? 'text-yellow-400 print:text-yellow-600' : 'text-red-400 print:text-red-600'}>
                  {report.score}
                </span>
                <span className="text-3xl text-slate-500">/100</span>
              </div>
              <p className="text-slate-400 print:text-slate-600">
                {report.score > 80 ? 'Top tier sender. High inbox placement likelihood.' : report.score > 50 ? 'Average sender. Risk of promotions tab.' : 'Poor reputation. High spam risk.'}
              </p>
            </div>

            <div className="bg-blue-50 border-b border-slate-200 p-6 text-center print:bg-white print:border-y">
              <h3 className="text-sm font-bold text-blue-800 print:text-slate-800 uppercase tracking-wider mb-1">Estimated Weekly Safe Send Volume</h3>
              <p className="text-3xl font-extrabold text-blue-600 print:text-slate-900">{calculateSafeVolume()}</p>
            </div>

            <div className="p-8 grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Authentication</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-slate-50 rounded-lg border border-slate-100 print:border-slate-300">
                    <span className="font-semibold">SPF Record</span>
                    <span className={`font-bold ${report.authentication.spf === 'Pass' ? 'text-green-600' : 'text-red-600'}`}>
                      {report.authentication.spf}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-slate-50 rounded-lg border border-slate-100 print:border-slate-300">
                    <span className="font-semibold">DMARC Record</span>
                    <span className={`font-bold ${report.authentication.dmarc === 'Pass' ? 'text-green-600' : 'text-red-600'}`}>
                      {report.authentication.dmarc}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Blacklists & Age</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-slate-50 rounded-lg border border-slate-100 print:border-slate-300">
                    <span className="font-semibold">Blacklists Triggered</span>
                    <span className={`font-bold ${report.blacklists.blacklistedCount === 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {report.blacklists.blacklistedCount} / {report.blacklists.totalChecked}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-slate-50 rounded-lg border border-slate-100 print:border-slate-300">
                    <span className="font-semibold">Domain Age</span>
                    <span className="font-bold text-slate-700">
                      {report.age.days > 0 ? `${report.age.days} days` : 'Unknown'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Priority Fix List */}
          {generateFixList().length > 0 && (
            <div className="mb-8 print:break-inside-avoid">
              <h3 className="text-2xl font-bold mb-6 text-slate-900">Priority Fix List</h3>
              <div className="space-y-4">
                {generateFixList().map((fix, index) => (
                  <div key={index} className="bg-white p-6 rounded-xl border border-red-100 border-l-4 border-l-red-500 shadow-sm print:border-slate-300 print:border-l-4 print:border-l-slate-800">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="bg-red-100 text-red-700 print:bg-slate-200 print:text-slate-800 text-xs font-bold px-2 py-1 rounded uppercase tracking-wide">
                        {fix.impact}
                      </span>
                      <h4 className="text-lg font-bold text-slate-900">{fix.title}</h4>
                    </div>
                    <p className="text-slate-600 leading-relaxed">{fix.advice}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Conversion CTA Bridge */}
          <div className="mt-16 bg-gradient-to-br from-slate-900 to-blue-950 rounded-2xl p-10 md:p-14 text-center text-white shadow-2xl print:hidden relative overflow-hidden">
            {/* Decorative background circle */}
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-blue-600 opacity-20 blur-3xl pointer-events-none"></div>
            
            <h3 className="text-3xl md:text-4xl font-extrabold mb-5 relative z-10">
              Emails still landing in spam? Let us fix it for you.
            </h3>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto leading-relaxed relative z-10">
              You can spend the next 3 weeks trying to decipher DNS records and begging blacklists for mercy, or we can repair your sending reputation so your emails land in inboxes and start making money again.
            </p>
            <a 
              href="https://your-booking-link-here.com" 
              target="_blank" 
              rel="noreferrer" 
              className="inline-block px-10 py-5 bg-white text-blue-900 font-extrabold rounded-lg shadow-lg text-xl hover:bg-blue-50 hover:scale-105 transition-all relative z-10"
            >
              Book Your Free Strategy Call
            </a>
            <p className="text-sm text-blue-300 mt-6 font-medium relative z-10">
              Spots are limited. We only work with serious senders.
            </p>
          </div>

        </section>
      )}
      
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center">Loading Data...</div>}>
      <ReportApp />
    </Suspense>
  );
}