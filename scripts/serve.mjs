import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
const root = path.resolve(process.argv.includes("--dist") ? "dist" : ".");
const port = Number(process.env.PORT || 4173);
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
};
http
  .createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://localhost");
      const requested = decodeURIComponent(url.pathname);
      const file = path.resolve(
        root,
        "." + (requested === "/" ? "/index.html" : requested),
      );
      if (
        !file.startsWith(root + path.sep) ||
        requested.split("/").some((p) => p.startsWith(".")) ||
        !Object.hasOwn(types, path.extname(file))
      ) {
        res.writeHead(403);
        res.end("Acceso denegado");
        return;
      }
      const body = await readFile(file);
      res.writeHead(200, {
        "Content-Type": `${types[path.extname(file)]}; charset=utf-8`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store",
      });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end("No encontrado");
    }
  })
  .listen(port, "127.0.0.1", () =>
    console.log(`Hotel Expert: http://127.0.0.1:${port}`),
  );
