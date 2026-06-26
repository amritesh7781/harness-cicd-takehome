const http = require('http');
const os   = require('os');

const PORT    = process.env.PORT    || 8080;
const VERSION = process.env.APP_VERSION || 'v1';

http.createServer((req, res) => {
  if (req.url === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', version: VERSION, pod: os.hostname() }));
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`<!doctype html>
<html>
  <head><title>Harness CI/CD Demo</title></head>
  <body style="font-family:system-ui,sans-serif;padding:2rem">
    <h1>Harness CI/CD Demo</h1>
    <p><strong>Version:</strong> ${VERSION}</p>
    <p><strong>Pod:</strong> ${os.hostname()}</p>
  </body>
</html>`);
}).listen(PORT, () => console.log(`listening on :${PORT}  version=${VERSION}`));
