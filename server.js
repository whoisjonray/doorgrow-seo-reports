const http = require('http');
const fs = require('fs');
const path = require('path');
const PORT = process.env.PORT || 3000;

const HTML_HEADERS = {
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'no-cache, no-store, must-revalidate',
};

const ROUTES = {
  '/seo': 'seo-tiers.html',
  '/seo-tiers': 'seo-tiers.html',
  '/seo/': 'seo-tiers.html',
  '/seo-tiers/': 'seo-tiers.html',
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
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #f8f9fa;
    color: #021f42;
    margin: 0;
    padding: 60px 24px;
    line-height: 1.6;
  }
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

  <div class="section-label">Public Pages</div>
  <div class="card">
    <h2><a href="/seo">Search Dominance Pricing &rarr;</a></h2>
    <p>The three-tier SEO/AEO offer for property managers. Lives at /seo and /seo-tiers.</p>
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

const server = http.createServer((req, res) => {
  // Strip query strings for routing
  const reqPath = req.url.split('?')[0];

  if (reqPath === '/' || reqPath === '') {
    res.writeHead(200, HTML_HEADERS);
    res.end(INDEX_HTML);
    return;
  }

  const file = ROUTES[reqPath];
  if (file) {
    const filePath = path.join(__dirname, file);
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(500);
        res.end('Error loading page');
        return;
      }
      res.writeHead(200, HTML_HEADERS);
      res.end(data);
    });
    return;
  }

  res.writeHead(404, HTML_HEADERS);
  res.end('<h1>404 - Page not found</h1><p><a href="/">Back to index</a></p>');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`DoorGrow SEO server listening on 0.0.0.0:${PORT}`);
});
