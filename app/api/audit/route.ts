import { NextResponse } from 'next/server';

const CRITICAL_LISTS = ['zen.spamhaus.org', 'b.barracudacentral.org', 'bl.spamcop.net'];
const ALL_LISTS = [
  'zen.spamhaus.org', 'b.barracudacentral.org', 'bl.spamcop.net', 'dnsbl.sorbs.net',
  'cbl.abuseat.org', 'psbl.surriel.com', 'dnsbl-1.uceprotect.net', 'dnsbl-2.uceprotect.net',
  'dnsbl-3.uceprotect.net', 'bl.nordspam.com', 'bl.mailspike.net', 'z.mailspike.net',
  'ix.dnsbl.manitu.net', 'dnsbl.dronebl.org', 'bl.suomispam.net', 'db.wpbl.info',
  'all.s5h.net', 'bl.blocklist.de', 'bl.score.senderscore.com', 'dnsbl.anticaptcha.net',
  'dnsbl.cyberlogic.net', 'dnsbl.justspam.org', 'dnsbl.kempt.net', 'dnsbl.tornevall.org',
  'dnsbl.rv-soft.info', 'dnsbl.zapbl.net', 'dul.dnsbl.sorbs.net', 'http.dnsbl.sorbs.net',
  'misc.dnsbl.sorbs.net', 'smtp.dnsbl.sorbs.net', 'socks.dnsbl.sorbs.net', 'spam.dnsbl.sorbs.net',
  'web.dnsbl.sorbs.net', 'zombie.dnsbl.sorbs.net', 'dyna.spamrats.com', 'noptr.spamrats.com',
  'spam.spamrats.com', 'orvedb.aupads.org', 'relays.nether.net', 'singapore.blackholes.us',
  'spam.dnsbl.anonmails.de', 'spamguard.leadmon.net', 'spamsources.fabel.dk', 'swl.spamhaus.org',
  'virbl.bit.nl', 'wormrbl.imp.ch', 'rbl.interserver.net', 'rbl.megarbl.net',
  'rbl.realtimeblacklist.com', 'hostkarma.junkemailfilter.com'
];

export async function POST(req: Request) {
  try {
    const { domain, dkimSelector, openRate, dailyVolume } = await req.json();
    const cleanDomain = domain.toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');

    const aReq = await fetch(`https://dns.google/resolve?name=${cleanDomain}&type=A`);
    const aRes = await aReq.json();
    const ip = aRes.Answer?.[0]?.data;

    let spf = 'Fail';
    let dmarc = 'Fail';
    let dmarcStrict = false;
    let dkim = 'Not Checked';
    let bimi = 'Fail';
    let mx = 'Fail';
    let mtasts = 'Fail';

    const mxReq = await fetch(`https://dns.google/resolve?name=${cleanDomain}&type=MX`);
    const mxRes = await mxReq.json();
    if (mxRes.Answer && mxRes.Answer.length > 0) mx = 'Pass';

    const txtReq = await fetch(`https://dns.google/resolve?name=${cleanDomain}&type=TXT`);
    const txtRes = await txtReq.json();
    if (txtRes.Answer) {
      txtRes.Answer.forEach((record: any) => {
        if (record.data.includes('v=spf1')) spf = 'Pass';
      });
    }

    const dmarcReq = await fetch(`https://dns.google/resolve?name=_dmarc.${cleanDomain}&type=TXT`);
    const dmarcRes = await dmarcReq.json();
    if (dmarcRes.Answer) {
      dmarcRes.Answer.forEach((record: any) => {
        if (record.data.includes('v=DMARC1')) {
          dmarc = 'Pass';
          if (record.data.includes('p=quarantine') || record.data.includes('p=reject')) {
            dmarcStrict = true;
          }
        }
      });
    }
    // --- NEW DKIM CODE STARTS HERE ---
    if (dkimSelector) {
      dkim = 'Fail';
      try {
        const dkimReq = await fetch(`https://dns.google/resolve?name=${dkimSelector}._domainkey.${cleanDomain}&type=TXT`);
        const dkimRes = await dkimReq.json();
        if (dkimRes.Answer) {
          dkimRes.Answer.forEach((record: any) => {
            if (record.data.includes('v=DKIM1') || record.data.includes('p=')) {
              dkim = 'Pass';
            }
          });
        }
      } catch (e) {
        // Leave as Fail if the fetch errors out
      }
    }

    const bimiReq = await fetch(`https://dns.google/resolve?name=default._bimi.${cleanDomain}&type=TXT`);
    const bimiRes = await bimiReq.json();
    if (bimiRes.Answer) {
      bimiRes.Answer.forEach((record: any) => {
        if (record.data.includes('v=BIMI1')) bimi = 'Pass';
      });
    }

    const mtaReq = await fetch(`https://dns.google/resolve?name=_mta-sts.${cleanDomain}&type=TXT`);
    const mtaRes = await mtaReq.json();
    if (mtaRes.Answer) {
      mtaRes.Answer.forEach((record: any) => {
        if (record.data.includes('v=STSv1')) mtasts = 'Pass';
      });
    }

    let ageDays = 0;
    try {
      const rdapReq = await fetch(`https://rdap.org/domain/${cleanDomain}`);
      const rdapRes = await rdapReq.json();
      const registrationEvent = rdapRes.events.find((e: any) => e.eventAction === 'registration');
      if (registrationEvent) {
        const regDate = new Date(registrationEvent.eventDate);
        ageDays = Math.floor((Date.now() - regDate.getTime()) / (1000 * 60 * 60 * 24));
      }
    } catch (e) {
      ageDays = 1500;
    }

    let hitCount = 0;
    let score = 100;

    if (ip) {
      const reversedIp = ip.split('.').reverse().join('.');
      const checks = ALL_LISTS.map(async (list) => {
        try {
          const req = await fetch(`https://dns.google/resolve?name=${reversedIp}.${list}&type=A`);
          const res = await req.json();
          if (res.Answer) {
            hitCount++;
            if (CRITICAL_LISTS.includes(list)) {
              score -= 50;
            } else {
              score -= 2;
            }
          }
        } catch (e) { }
      });
      await Promise.all(checks);
    }

    // Core Technical Penalties Only
    if (spf === 'Fail') score -= 25;
    if (dmarc === 'Fail') score -= 25;
    if (dkim === 'Fail') score -= 25;
    if (mx === 'Fail') score -= 25;
    if (dmarc === 'Pass' && !dmarcStrict) score -= 15;

    // BIMI and MTA-STS are no longer penalized in the score calculation.
    // They are simply reported as pass/fail for the UI to handle as "optional upgrades".

    // Spam Traps & Burner Domains
    if (ageDays > 0 && ageDays < 30 && score > 40) {
      score = 40;
    } else if (ageDays > 0 && ageDays < 90 && score > 70) {
      score = 70;
    }

    if (score < 0) score = 0;

    return NextResponse.json({
      domain: cleanDomain,
      score,
      authentication: { spf, dmarc, dkim, bimi, mx, dmarcStrict, mtasts },
      blacklists: { blacklistedCount: hitCount, totalChecked: ALL_LISTS.length },
      age: { days: ageDays },
      behavioral: { openRate: openRate || 'Unknown', dailyVolume: dailyVolume || 'Unknown' }
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}