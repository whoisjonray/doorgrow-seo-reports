const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const PORT = process.env.PORT || 3000;

// Moz API: shared with WhoIsJonRay infrastructure. Set MOZ_API_KEY env var to override.
const MOZ_API_KEY = process.env.MOZ_API_KEY ||
  'bW96c2NhcGUtcXJuZEozZlZrbTo3bXZuQ3Y3eUFQNWdNQUx3M2ZqdmhGa0pCWU53MXRmYw==';

// Optional: POST lead data to this webhook (e.g., HubSpot, Make, Zapier)
const LEAD_WEBHOOK_URL = process.env.LEAD_WEBHOOK_URL || '';

const HTML_HEADERS = {
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'no-cache, no-store, must-revalidate',
};
const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-cache',
};

const STATIC_ROUTES = {
  '/seo': 'seo-plain.html',
  '/seo/': 'seo-plain.html',
  '/seo-tiers': 'seo-plain.html',
  '/seo-tiers/': 'seo-plain.html',
  '/seo-plain': 'seo-plain.html',
  '/seo-plain/': 'seo-plain.html',
  '/seo-simple': 'seo-plain.html',
  '/seo-simple/': 'seo-plain.html',
  '/ga': 'growth-accelerator.html',
  '/ga/': 'growth-accelerator.html',
  '/growth-accelerator': 'growth-accelerator.html',
  '/growth-accelerator/': 'growth-accelerator.html',
  '/mastermind': 'growth-accelerator.html',
  '/mastermind/': 'growth-accelerator.html',
  '/propspecific': 'propspecific.html',
  '/propspecific/': 'propspecific.html',
  '/cedarsprings': 'cedarsprings.html',
  '/cedarsprings/': 'cedarsprings.html',
};

const INDEX_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>DoorGrow SEO</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8f9fa; color: #021f42; margin: 0; padding: 60px 24px; line-height: 1.6; }
  .wrap { max-width: 720px; margin: 0 auto; }
  h1 { font-size: 32px; margin-bottom: 8px; letter-spacing: -0.5px; }
  .sub { color: #6c757d; margin-bottom: 32px; font-size: 16px; }
  .card { background: #fff; border-radius: 12px; padding: 24px; box-shadow: 0 2px 8px rgba(2,31,66,0.08); margin-bottom: 16px; border-left: 4px solid #4bd137; }
  .card h2 { font-size: 18px; margin-bottom: 4px; }
  .card a { color: #021f42; text-decoration: none; font-weight: 700; }
  .card p { color: #6c757d; font-size: 14px; }
  .section-label { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #6c757d; margin: 32px 0 12px; }
</style>
</head>
<body>
<div class="wrap">
  <h1>DoorGrow SEO</h1>
  <p class="sub">Public landing pages and per-client audit reports.</p>

  <div class="section-label">Public Landing Pages</div>
  <div class="card">
    <h2><a href="/seo">Search Dominance Pricing &rarr;</a></h2>
    <p>The three-tier SEO/AEO offer for property managers, with a live Domain Authority checker. Served at /seo, /seo-tiers, /seo-plain, and /seo-simple.</p>
  </div>
  <div class="card">
    <h2><a href="/ga">Growth Accelerator Mastermind &rarr;</a></h2>
    <p>The in-person mastermind offer. $4,000 launch + $1,100/month. Includes a lead-capturing Door Math Calculator. Served at /ga, /growth-accelerator, and /mastermind.</p>
  </div>

  <div class="section-label">Client Audit Reports</div>
  <div class="card">
    <h2><a href="/propspecific">Property Specific Management Audit &rarr;</a></h2>
    <p>SEO audit and recommendations.</p>
  </div>
  <div class="card">
    <h2><a href="/cedarsprings">Cedar Springs Realty Audit &rarr;</a></h2>
    <p>SEO audit and recommendations.</p>
  </div>
</div>
</body>
</html>`;

function serveStaticFile(file, res) {
  const filePath = path.join(__dirname, file);
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(500); res.end('Error loading page'); return; }
    res.writeHead(200, HTML_HEADERS);
    res.end(data);
  });
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1e5) { reject(new Error('Body too large')); req.destroy(); }
    });
    req.on('end', () => {
      if (!body) { resolve({}); return; }
      try { resolve(JSON.parse(body)); }
      catch (e) { reject(new Error('Invalid JSON body')); }
    });
    req.on('error', reject);
  });
}

function jsonResponse(res, status, payload) {
  res.writeHead(status, JSON_HEADERS);
  res.end(JSON.stringify(payload));
}

function cleanDomain(input) {
  return String(input)
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\/.*$/, '')
    .toLowerCase();
}

function isEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s));
}

function callMozApi(domain) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ targets: [domain] });
    const req = https.request({
      hostname: 'lsapi.seomoz.com',
      path: '/v2/url_metrics',
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + MOZ_API_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
      timeout: 15000,
    }, (mozRes) => {
      let chunks = '';
      mozRes.on('data', c => chunks += c);
      mozRes.on('end', () => {
        try {
          const parsed = JSON.parse(chunks);
          if (parsed.error || !parsed.results || !parsed.results.length) {
            reject(new Error(parsed.error || 'No data returned for that domain.'));
            return;
          }
          resolve(parsed.results[0]);
        } catch (e) {
          reject(new Error('Could not parse Moz response.'));
        }
      });
    });
    req.on('timeout', () => { req.destroy(new Error('Moz API timeout')); });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function tierFromDA(da) {
  if (da >= 26) {
    return {
      tier: 'authority',
      interpretation: "Strong base. Domination plan is built for PMs at this level. You can target competitive keywords across multiple metros and start owning the AI search results in your category.",
    };
  }
  if (da >= 11) {
    return {
      tier: 'growth',
      interpretation: "Solid foundation. The Growth plan is the sweet spot here. You can compete in your market with consistent execution and the right keyword strategy. Most clients in this range hit page 1 for major commercial keywords within 6 months.",
    };
  }
  return {
    tier: 'starter',
    interpretation: "Most DoorGrow PMs start here. The Foundation plan is built for this. Real authority work first (directories, schema, voice-aligned content), then content scales as your trust score climbs. Expect to gain 3-8 DA points in the first 6 months.",
  };
}

function postLeadWebhook(payload) {
  if (!LEAD_WEBHOOK_URL) return;
  try {
    const url = new URL(LEAD_WEBHOOK_URL);
    const body = JSON.stringify(payload);
    const lib = url.protocol === 'http:' ? http : https;
    const req = lib.request({
      hostname: url.hostname,
      path: url.pathname + url.search,
      port: url.port || (url.protocol === 'http:' ? 80 : 443),
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      timeout: 5000,
    });
    req.on('error', err => console.error('Lead webhook error:', err.message));
    req.on('timeout', () => req.destroy());
    req.write(body);
    req.end();
  } catch (e) {
    console.error('Lead webhook URL invalid:', e.message);
  }
}

async function handleDoorMath(req, res) {
  let body;
  try { body = await readJsonBody(req); }
  catch (e) { jsonResponse(res, 400, { success: false, error: e.message }); return; }

  const rent = parseFloat(body.rent);
  const fee = parseFloat(body.fee);
  const doors = parseInt(body.doors, 10);
  const name = (body.name || '').toString().trim();
  const email = (body.email || '').toString().trim();
  const phone = (body.phone || '').toString().trim();

  if (!name || !email || !rent || !fee || !doors) {
    jsonResponse(res, 400, { success: false, error: 'Rent, fee, doors, name, and email are required.' });
    return;
  }
  if (!isEmail(email)) {
    jsonResponse(res, 400, { success: false, error: 'Please provide a valid email address.' });
    return;
  }
  if (rent < 100 || fee < 1 || fee > 50 || doors < 1) {
    jsonResponse(res, 400, { success: false, error: 'Numbers look off. Rent should be at least $100, fee 1-50%, doors at least 1.' });
    return;
  }

  const per_door_monthly = rent * (fee / 100);
  const monthly_revenue = per_door_monthly * doors;
  const annual_revenue = monthly_revenue * 12;
  // Assume half the new doors come with a vacancy needing a placement, leasing fee = 50% of one month's rent
  const leasing_revenue = (doors / 2) * (rent * 0.5);
  const program_year_one = 4000 + (1100 * 12);
  const total_first_year_value = annual_revenue + leasing_revenue;
  // Payback in months (program runs $1,100/mo after launch; new MRR pays it down after launch is recovered)
  const launch_recovery_months = leasing_revenue >= 4000 ? 1 : Math.ceil(4000 / Math.max(leasing_revenue / 6, 1));
  const monthly_recovery_months = monthly_revenue > 0 ? Math.ceil(1100 / monthly_revenue) : 999;
  const payback_months = Math.max(1, Math.min(12, launch_recovery_months + monthly_recovery_months - 1));

  let interpretation;
  if (monthly_revenue >= 5000) {
    interpretation = "These numbers say the program pays for itself many times over. The bigger question is whether you're actually willing to fly to Austin and do the work. If yes, text Jason and let's talk timing.";
  } else if (monthly_revenue >= 1500) {
    interpretation = "Cash-positive territory. Once you hit your door target, the membership pays for itself and you're netting the rest. This is where most of our clients land in their first 6-12 months.";
  } else if (monthly_revenue >= 500) {
    interpretation = "You're close to break-even on the monthly. The leasing fees from your first wave will likely cover the launch package. Worth a conversation about whether the alternative payment plan fits better.";
  } else {
    interpretation = "Those numbers are tight. We'd want to talk through whether a smaller starting program (or our free Clarity Assessment first) makes more sense for you right now.";
  }

  const lead = {
    timestamp: new Date().toISOString(),
    source: 'doorgrow-ga-door-math',
    name, email, phone,
    rent, fee, doors,
    monthly_revenue, annual_revenue, leasing_revenue, payback_months,
  };

  console.log('[GA-DOOR-MATH LEAD]', JSON.stringify(lead));
  postLeadWebhook(lead);

  jsonResponse(res, 200, {
    success: true,
    monthly_revenue,
    annual_revenue,
    leasing_revenue,
    payback_months,
    program_year_one,
    total_first_year_value,
    interpretation,
  });
}

async function handleDomainCheck(req, res) {
  let body;
  try { body = await readJsonBody(req); }
  catch (e) { jsonResponse(res, 400, { success: false, error: e.message }); return; }

  const name = (body.name || '').toString().trim();
  const email = (body.email || '').toString().trim();
  const phone = (body.phone || '').toString().trim();
  const rawDomain = (body.domain || '').toString().trim();

  if (!name || !email || !rawDomain) {
    jsonResponse(res, 400, { success: false, error: 'Domain, name, and email are required.' });
    return;
  }
  if (!isEmail(email)) {
    jsonResponse(res, 400, { success: false, error: 'Please provide a valid email address.' });
    return;
  }

  const domain = cleanDomain(rawDomain);
  if (!domain || !domain.includes('.')) {
    jsonResponse(res, 400, { success: false, error: 'Please provide a valid domain (like example.com).' });
    return;
  }

  let mozData;
  try { mozData = await callMozApi(domain); }
  catch (e) {
    console.error('Moz API failed:', e.message, 'domain=' + domain);
    jsonResponse(res, 500, { success: false, error: 'Could not check that domain right now. Please try again in a moment, or text Jon at 512-785-9160.' });
    return;
  }

  const rank = Math.round(mozData.domain_authority || mozData.rank || 0);
  const linking_domains = mozData.root_domains_to_root_domain || mozData.linking_domains || 0;
  const page_authority = Math.round(mozData.page_authority || 0);
  const spam_score = Math.round(mozData.spam_score || 0);

  const { tier, interpretation } = tierFromDA(rank);

  const lead = {
    timestamp: new Date().toISOString(),
    source: 'doorgrow-seo-da-checker',
    name, email, phone, domain,
    da: rank, linking_domains, page_authority, spam_score, tier,
  };

  console.log('[DA-CHECK LEAD]', JSON.stringify(lead));
  postLeadWebhook(lead);

  jsonResponse(res, 200, {
    success: true,
    domain,
    rank,
    linking_domains,
    page_authority,
    spam_score,
    tier,
    interpretation,
  });
}

const server = http.createServer((req, res) => {
  const reqPath = req.url.split('?')[0];

  if (req.method === 'POST' && reqPath === '/api/domain-check') {
    handleDomainCheck(req, res);
    return;
  }

  if (req.method === 'POST' && reqPath === '/api/door-math') {
    handleDoorMath(req, res);
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, JSON_HEADERS);
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  if (reqPath === '/' || reqPath === '') {
    res.writeHead(200, HTML_HEADERS);
    res.end(INDEX_HTML);
    return;
  }

  const file = STATIC_ROUTES[reqPath];
  if (file) {
    serveStaticFile(file, res);
    return;
  }

  res.writeHead(404, HTML_HEADERS);
  res.end('<h1>404 - Page not found</h1><p><a href="/">Back to index</a></p>');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`DoorGrow SEO server listening on 0.0.0.0:${PORT}`);
  console.log(`Lead webhook: ${LEAD_WEBHOOK_URL ? 'configured' : 'NOT SET (leads logged to stdout only)'}`);
});
