import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = JSON.parse(await readFile(join(repositoryRoot, "package.json"), "utf8"));
const npm = process.platform === "win32" ? process.execPath : "npm";
const npmPrefix =
  process.platform === "win32"
    ? [join(dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js")]
    : [];
const scratch = await mkdtemp(join(tmpdir(), "snippet-fidelity-package-"));
const npmCache = join(scratch, "npm-cache");

function run(command, args, options = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? repositoryRoot,
      env: process.env,
      shell: false,
      stdio: options.capture ? ["ignore", "pipe", "inherit"] : "inherit",
    });
    let stdout = "";
    if (options.capture) {
      child.stdout.setEncoding("utf8");
      child.stdout.on("data", (chunk) => {
        stdout += chunk;
      });
    }
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolvePromise(stdout);
      } else {
        reject(new Error(`${command} exited with ${code ?? signal}`));
      }
    });
  });
}

try {
  const archiveName = `${packageJson.name}-${packageJson.version}.tgz`;
  const archivePath = join(scratch, archiveName);
  const consumer = join(scratch, "consumer");
  await run(npm, [
    ...npmPrefix,
    "pack",
    repositoryRoot,
    "--pack-destination",
    scratch,
    "--cache",
    npmCache,
    "--silent",
  ]);
  await access(archivePath);

  await mkdir(consumer);
  await writeFile(
    join(consumer, "package.json"),
    `${JSON.stringify({ private: true }, null, 2)}\n`,
    "utf8",
  );
  await run(
    npm,
    [
      ...npmPrefix,
      "install",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      "--cache",
      npmCache,
      archivePath,
      "--prefix",
      consumer,
    ],
    { cwd: consumer },
  );

  const installedRoot = join(consumer, "node_modules", packageJson.name);
  await access(join(installedRoot, "schema", "config.schema.json"));
  await access(join(installedRoot, "docs", "architecture.md"));
  const cliPath = join(installedRoot, "dist", "cli.js");
  const version = await run(process.execPath, [cliPath, "--version"], {
    cwd: consumer,
    capture: true,
  });
  if (version.trim() !== packageJson.version) {
    throw new Error(`Installed CLI reported ${version.trim()}, expected ${packageJson.version}`);
  }

  process.stdout.write(
    `Verified clean install of ${packageJson.name}@${packageJson.version} from ${archiveName}.\n`,
  );
} finally {
  await rm(scratch, { recursive: true, force: true });
}
