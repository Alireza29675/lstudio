import { createServer, IncomingMessage, ServerResponse } from 'http';
import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { getTowerEndpoints } from '../config';
import { ApiError, PlaygroundController } from './controller';
import { attachMidi } from './midi';

const BODY_LIMIT = 16 * 1024;
const staticFiles: Record<string, { name: string; type: string }> = {
  '/': { name: 'index.html', type: 'text/html; charset=utf-8' },
  '/index.html': { name: 'index.html', type: 'text/html; charset=utf-8' },
  '/style.css': { name: 'style.css', type: 'text/css; charset=utf-8' },
  '/app.js': { name: 'app.js', type: 'text/javascript; charset=utf-8' },
};

function readBody(request: IncomingMessage): Promise<unknown> {
  return new Promise((resolveBody, reject) => {
    let size = 0;
    let overflow = false;
    const chunks: Buffer[] = [];
    request.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > BODY_LIMIT) {
        if (!overflow) reject(new ApiError('Request body exceeds 16 KiB', 413));
        overflow = true;
        chunks.length = 0;
      } else if (!overflow) chunks.push(chunk);
    });
    request.on('end', () => {
      if (overflow) return;
      try { resolveBody(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch { reject(new ApiError('Request body must be valid JSON')); }
    });
    request.on('error', () => reject(new ApiError('Could not read request body')));
    request.on('aborted', () => reject(new ApiError('Request aborted')));
  });
}

function sendJson(response: ServerResponse, status: number, value: unknown) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(value));
}

export function createPlaygroundServer(controller: PlaygroundController) {
  const server = createServer(async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
    try {
      const address = server.address();
      const port = address && typeof address !== 'string' ? address.port : 3210;
      const hosts = [`127.0.0.1:${port}`, `localhost:${port}`];
      if (!hosts.includes(request.headers.host ?? '')) throw new ApiError('Local Host required', 403);
      const origin = request.headers.origin;
      if (origin && !hosts.map(host => `http://${host}`).includes(origin)) throw new ApiError('Local Origin required', 403);
      if (request.headers['sec-fetch-site'] === 'cross-site') throw new ApiError('Cross-site requests are not allowed', 403);
      const path = request.url ?? '/';
      if (request.method === 'GET' && path === '/api/state') {
        sendJson(response, 200, controller.getState());
        return;
      }
      if (request.method === 'GET' && staticFiles[path]) {
        const file = staticFiles[path];
        const content = await readFile(resolve(__dirname, 'public', file.name));
        response.writeHead(200, { 'Content-Type': file.type });
        response.end(content);
        return;
      }
      if (request.method !== 'POST' || !['/api/preview', '/api/play', '/api/stop', '/api/tap', '/api/tempo', '/api/blackout'].includes(path)) {
        throw new ApiError('Not found', 404);
      }
      if (!/^application\/json(?:;\s*charset=utf-8)?$/i.test(request.headers['content-type'] ?? '')) {
        throw new ApiError('Content-Type must be application/json', 415);
      }
      if (path === '/api/play' && controller.getState().busy) throw new ApiError('A pattern is already being sent', 409);
      const stopVersion = controller.getStopVersion();
      const body = await readBody(request);
      if (path === '/api/preview') {
        try { sendJson(response, 200, controller.updateDraft(body)); }
        catch (error) { throw new ApiError((error as Error).message); }
      } else if (path === '/api/play') {
        if (controller.getStopVersion() !== stopVersion) throw new ApiError('Play cancelled by Stop', 409);
        sendJson(response, 200, await controller.play(body));
      } else if (path === '/api/tempo') {
        sendJson(response, 200, controller.updateTempo(body));
      } else if (path === '/api/blackout') {
        if (controller.getStopVersion() !== stopVersion) throw new ApiError('Blackout gesture cancelled by Stop', 409);
        sendJson(response, 200, controller.updateBlackout(body));
      } else if (path === '/api/tap') {
        if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => key !== 'atMs')) {
          throw new ApiError('Expected an optional atMs timestamp');
        }
        const input = body as { atMs?: unknown };
        if ('atMs' in input && typeof input.atMs !== 'number') throw new ApiError('atMs must be a number');
        sendJson(response, 200, controller.tap(input.atMs as number | undefined));
      }
      else {
        if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).length) throw new ApiError('Expected an empty object');
        sendJson(response, 200, controller.stop());
      }
    } catch (error) {
      if (!response.headersSent) sendJson(response, error instanceof ApiError ? error.status : 500, {
        ...controller.getState(), error: error instanceof ApiError ? error.message : 'Local server error',
      });
    }
  });
  server.requestTimeout = 5000;
  server.headersTimeout = 5000;
  return server;
}

async function main() {
  const controller = new PlaygroundController(getTowerEndpoints());
  const server = createPlaygroundServer(controller);
  let closeMidi = () => {};
  server.once('error', error => {
    console.error(`Playground could not start: ${error.message}`);
    closeMidi();
    controller.close();
    process.exitCode = 1;
  });
  server.listen(3210, '127.0.0.1', async () => {
    console.log('Club playground: http://127.0.0.1:3210 — edit a draft, then Send & play.');
    try {
      const { default: midi } = await import('../common/midimix');
      const detach = attachMidi(controller, midi);
      closeMidi = () => { detach(); midi.close(); };
    } catch {
      console.warn('MIDI is unavailable; manual BPM and browser controls remain available.');
    }
  });
  const shutdown = () => {
    controller.close();
    closeMidi();
    server.close();
    setTimeout(() => process.exit(0), 150).unref();
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
