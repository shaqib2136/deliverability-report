import { NextResponse } from 'next/server';
import dns from 'dns/promises';

const BLACKLISTS = [
  'zen.spamhaus.org', 'b.barracudacentral.org', 'bl.spamcop.net', 'dnsbl.sorbs.net',
  'cbl.abuseat.org', 'psbl.surriel.com', 'dnsbl-1.uceprotect.net', 'dnsbl-2.uceprotect.net',
  'dnsbl-3.uceprotect.net', 'bl.nordspam.com', 'bl.mailspike.net', 'z.mailspike.net',
  'ix.dnsbl.manitu.net', 'dnsbl.dronebl.org', 'bl.suomispam.net', 'db.wpbl.info',
  'all.s5h.net', 'b.barracudacentral.org', 'bl.blocklist.de', 'bl.score.senderscore.com',
  'dnsbl.anticaptcha.net', 'dnsbl.cyberlogic.net', 'dnsbl.justspam.org', 'dnsbl.kempt.net',
  'dnsbl.tornevall.org', 'dnsbl.rv-soft.info', 'dnsbl.zapbl.net', 'dul.dnsbl.sorbs.net',
  'http.dnsbl.sorbs.net', 'misc.dnsbl.sorbs.net', 'smtp.dnsbl.sorbs.net', 'socks.dnsbl.sorbs.net',
  'spam.dnsbl.sorbs.net', 'web.dnsbl.sorbs.net', 'zombie.dnsbl.sorbs.net', 'dyna.spamrats.com',
  'noptr.spamrats.com', 'spam.spamrats.com', 'orvedb.aupads.org', 'relays.nether.net',
  'singapore.blackholes.us', 'spam.dnsbl.anonmails.de', 'spamguard.leadmon.net',
  'spamsources.fabel.dk', 'swl.spamhaus.org', 'virbl.bit.nl', 'wormrbl.imp.ch',
  'rbl.interserver.net', 'rbl.megarbl.net', 'rbl.realtimeblacklist.com'
];

const resolveWithTimeout = (hostname: string, timeoutMs = 2000) => {
  return Promise.race([
    dns.resolve4(hostname),
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs))
  ]);
};

// Helper: Bypass local network limits by using Google's Free DNS-over-HTTPS
async function checkTxtRecordViaGoogle(domain: string, searchString: string) {
  try {
    const res = await fetch(`https://dns.google/resolve?name=${domain}&type=TXT`);
    if (!res.ok) return false;
    const data = await res.json();
    if (!data.Answer) return false;
    return data.Answer.some((record: any) => record.data.includes(searchString));
  } catch (error) {
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const { domain } = await request.json();
    const cleanDomain = domain.replace(/^(?:https?:\/\/)?(?:www\.)?/i, "").split('/')[0];

    // 1. Authentication Checks via Google DNS API
    const hasSpf = await checkTxtRecordViaGoogle(cleanDomain, 'v=spf1');
    const spfStatus = hasSpf ? 'Pass' : 'Fail';

    const hasDmarc = await checkTxtRecordViaGoogle(`_dmarc.${cleanDomain}`, 'v=DMARC1');
    const dmarcStatus = hasDmarc ? 'Pass' : 'Fail';

    // 2. Resolve IP 
    let ipAddress = null;
    try {
      const lookupData = await dns.lookup(cleanDomain);
      ipAddress = lookupData.address;
    } catch (error) {
      return NextResponse.json({ error: 'Could not resolve domain to an IP address.' }, { status: 400 });
    }

    // 3. Blacklist Checks
    const reversedIp = ipAddress.split('.').reverse().join('.');
    const blacklistPromises = BLACKLISTS.map(async (list) => {
      const query = `${reversedIp}.${list}`;
      try {
        await resolveWithTimeout(query);
        return { list, status: 'Fail' };
      } catch (error: any) {
        return { list, status: 'Pass' };
      }
    });

    const blacklistResults = await Promise.all(blacklistPromises);
    const blacklistedCount = blacklistResults.filter(r => r.status === 'Fail').length;
    const cleanCount = blacklistResults.length - blacklistedCount;

    // 4. Domain Age via RDAP
    let domainAgeInDays = 0;
    let registrationDate = 'Unknown';
    try {
      const rdapResponse = await fetch(`https://rdap.org/domain/${cleanDomain}`, { cache: 'no-store' });
      if (rdapResponse.ok) {
        const rdapData = await rdapResponse.json();
        const regEvent = rdapData.events?.find((e: any) => e.eventAction === 'registration');
        if (regEvent && regEvent.eventDate) {
          registrationDate = regEvent.eventDate;
          const regDate = new Date(regEvent.eventDate);
          const today = new Date();
          const diffTime = Math.abs(today.getTime() - regDate.getTime());
          domainAgeInDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }
      }
    } catch (e) {}

    // 5. Reputation Scoring Logic
    let score = 100;
    
    if (spfStatus === 'Fail') score -= 20;
    if (dmarcStatus === 'Fail') score -= 20;
    
    score -= (blacklistedCount * 10);
    
    if (domainAgeInDays > 0 && domainAgeInDays < 30) {
      score -= 20;
    } else if (domainAgeInDays > 0 && domainAgeInDays < 180) {
      score -= 10;
    }

    score = Math.max(0, score);

    return NextResponse.json({
      domain: cleanDomain,
      ip: ipAddress,
      age: {
        days: domainAgeInDays,
        registered: registrationDate
      },
      score: score,
      authentication: {
        spf: spfStatus,
        dmarc: dmarcStatus,
        dkim: 'Manual Check Required'
      },
      blacklists: {
        totalChecked: BLACKLISTS.length,
        blacklistedCount,
        cleanCount,
        details: blacklistResults
      }
    });

  } catch (error) {
    return NextResponse.json({ error: 'Failed to run the audit.' }, { status: 500 });
  }
}