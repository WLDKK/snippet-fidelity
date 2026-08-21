import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("../fixtures/site/", import.meta.url)));
const port = Number(process.env.SNIPPET_FIDELITY_FIXTURE_PORT ?? "4173");
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("SNIPPET_FIDELITY_FIXTURE_PORT must be a valid TCP port.");
}

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

const server = createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url ?? "/", "http://fixture.invalid");
    const pathname = requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname;
    const path = resolve(root, `.${decodeURIComponent(pathname)}`);
    if (path !== root && !path.startsWith(`${root}${sep}`)) {
      response.writeHead(403).end("Forbidden");
      return;
    }
    const body = await readFile(path);
    response.writeHead(200, {
      "content-type": contentTypes[extname(path)] ?? "application/octet-stream",
      "cache-control": "no-store",
    });
    response.end(body);
  } catch {
    response.writeHead(404).end("Not found");
  }
});

server.listen(port, "127.0.0.1", () => {
  process.stdout.write(`Snippet Fidelity fixture: http://127.0.0.1:${port}/\n`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
