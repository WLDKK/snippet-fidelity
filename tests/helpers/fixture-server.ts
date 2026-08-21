import { createServer, type Server } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const testDirectory = dirname(fileURLToPath(import.meta.url));
export const fixtureRoot = resolve(testDirectory, "../../fixtures/site");

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

export interface FixtureServer {
  baseUrl: string;
  close: () => Promise<void>;
}

function closeServer(server: Server): Promise<void> {
  return new Promise((resolveClose, reject) => {
    server.close((error) => (error === undefined ? resolveClose() : reject(error)));
  });
}

export async function startFixtureServer(): Promise<FixtureServer> {
  const server = createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url ?? "/", "http://fixture.invalid");
      const pathname = requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname;
      const path = resolve(fixtureRoot, `.${decodeURIComponent(pathname)}`);
      if (path !== fixtureRoot && !path.startsWith(`${fixtureRoot}${sep}`)) {
        response.writeHead(403).end("Forbidden");
        return;
      }
      const body = await readFile(path);
      response.writeHead(200, {
        "content-type": CONTENT_TYPES[extname(path)] ?? "application/octet-stream",
        "cache-control": "no-store",
      });
      response.end(body);
    } catch {
      response.writeHead(404).end("Not found");
    }
  });

  await new Promise<void>((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolveListen());
  });
  const address = server.address();
  if (address === null || typeof address === "string") {
    await closeServer(server);
    throw new Error("Fixture server did not expose a TCP port.");
  }
  return {
    baseUrl: `http://127.0.0.1:${address.port}/`,
    close: () => closeServer(server),
  };
}
