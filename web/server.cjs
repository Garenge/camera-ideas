const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');

const root = __dirname;
const port = Number(process.env.PORT || 8080);
const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.data': 'application/octet-stream',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.wasm': 'application/wasm',
};

const server = http.createServer(async (request, response) => {
  const urlPath = decodeURIComponent(request.url.split('?')[0]);
  const relativePath = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
  const filePath = path.resolve(root, relativePath);

  if (!filePath.startsWith(`${root}${path.sep}`)) {
    response.writeHead(403).end('Forbidden');
    return;
  }

  try {
    const body = await fs.readFile(filePath);
    response.writeHead(200, {
      'Cache-Control': 'no-store',
      'Content-Type': mimeTypes[path.extname(filePath)] || 'application/octet-stream',
    });
    response.end(body);
  } catch (error) {
    const status = error.code === 'ENOENT' ? 404 : 500;
    console.error(`[server.cjs][request] ${status}: ${relativePath}`);
    response.writeHead(status).end(status === 404 ? 'Not Found' : 'Server Error');
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`[server.cjs][listen] http://localhost:${port}`);
});

const shutdown = () => server.close(() => process.exit(0));
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
