export { audit } from "./audit.js";
export { compareText, fingerprintText, normalizeLineEndings } from "./compare.js";
export { loadConfig, validateConfig } from "./config.js";
export {
  renderJson,
  renderJunit,
  renderMarkdown,
  writeReports,
  type ReporterName,
} from "./reporters/index.js";
export type * from "./types.js";
