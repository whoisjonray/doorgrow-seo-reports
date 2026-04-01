const http = require('http');
const fs = require('fs');
const path = require('path');
const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  let filePath;
  if (req.url === '/propspecific' || req.url === '/propspecific.html') {
    filePath = path.join(__dirname, 'propspecific.html');
  } else if (req.url === '/cedarsprings' || req.url === '/cedarsprings.html') {
    filePath = path.join(__dirname, 'cedarsprings.html');
  } else if (req.url === '/') {
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end('<h1>DoorGrow SEO Audit Reports</h1><ul><li><a href="/propspecific">PropSpecific.com Audit</a></li><li><a href="/cedarsprings">Cedar Springs Realty Audit</a></li></ul>');
    return;
  } else {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(500); res.end('Error'); return; }
    res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
    res.end(data);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`SEO Reports server running on port ${PORT}`);
});
