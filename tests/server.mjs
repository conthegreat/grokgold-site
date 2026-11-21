/**
 * Static server that mimics GitHub Pages for this project site:
 * files are available at / and at /grokgold-site/, and unknown paths
 * return 404.html with status 404 (the URL the browser shows stays put).
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.PORT || 4173);
const PREFIX = "/grokgold-site";
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".rules": "text/plain; charset=utf-8",
};

function fileFor(urlPath) {
  let decoded;
  try { decoded = decodeURIComponent(urlPath); } catch { return null; }
  if (decoded.includes("\0")) return null;
  if (decoded.endsWith("/")) decoded += "index.html";
  const file = path.resolve(ROOT, "." + decoded);
  const rel = path.relative(ROOT, file);
  if (rel.startsWith("..") || path.isAbsolute(rel)) return null;
  return file;
}

function sendFile(res, file, status) {
  const type = TYPES[path.extname(file)] || "application/octet-stream";
  res.writeHead(status, { "Content-Type": type, "Cache-Control": "no-store" });
  fs.createReadStream(file).pipe(res);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", "http://127.0.0.1");
  let pathname = url.pathname;
  if (pathname === PREFIX) {
    res.writeHead(302, { Location: PREFIX + "/" + url.search });
    return res.end();
  }
  let rel = pathname;
  if (pathname === PREFIX || pathname.startsWith(PREFIX + "/")) {
    rel = pathname.slice(PREFIX.length) || "/";
  }
  const file = fileFor(rel);
  if (file && fs.existsSync(file) && fs.statSync(file).isFile()) {
    return sendFile(res, file, 200);
  }
  return sendFile(res, path.join(ROOT, "404.html"), 404);
});

server.listen(PORT, "127.0.0.1", () => {
  console.log("http://127.0.0.1:" + PORT + PREFIX + "/");
});
