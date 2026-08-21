export type ProbeMode = "clipboard" | "handler" | "both";
export type ProbeKind = "browser-clipboard" | "handler-payload";
export type CheckStatus = "passed" | "failed" | "error";
export type EvidenceSource = "canonical-text" | "canonical-file" | "rendered-dom";

export interface InlineExpectedConfig {
  text: string;
}

export interface FileExpectedConfig {
  file: string;
}

export interface SelectorExpectedConfig {
  selector: string;
}

export type ExpectedConfig = InlineExpectedConfig | FileExpectedConfig | SelectorExpectedConfig;

export interface CheckConfig {
  id: string;
  button: string;
  expected: ExpectedConfig;
  probe?: ProbeMode;
  timeoutMs?: number;
}

export interface DiscoveryConfig {
  blockSelector?: string;
  codeSelector?: string;
  buttonSelector?: string;
  buttonNamePattern?: string;
  ancestorDepth?: number;
  probe?: ProbeMode;
  timeoutMs?: number;
}

export interface PageConfig {
  url: string;
  checks?: CheckConfig[];
  discover?: DiscoveryConfig;
}

export interface BrowserConfig {
  headless?: boolean;
  timeoutMs?: number;
}

export interface AuditConfig {
  version: 1;
  baseUrl?: string;
  browser?: BrowserConfig;
  pages: PageConfig[];
}

export interface ResolvedCheck {
  id: string;
  button: string;
  expectedText: string;
  expectedSource: EvidenceSource;
  probe: ProbeMode;
  timeoutMs: number;
}

export interface Finding {
  code: string;
  message: string;
}

export interface LineEndingCounts {
  crlf: number;
  lf: number;
  cr: number;
}

export interface TextFingerprint {
  sha256: string;
  utf8Bytes: number;
  codePoints: number;
  lines: number;
  hasTrailingLineBreak: boolean;
  lineEndings: LineEndingCounts;
}

export interface CharacterDescription {
  escaped: string;
  codePoint: string;
}

export interface FirstDifference {
  codePointIndex: number;
  expectedLine: number;
  expectedColumn: number;
  expected: CharacterDescription | null;
  actual: CharacterDescription | null;
  expectedContext: string;
  actualContext: string;
}

export interface TextComparison {
  exact: boolean;
  findings: Finding[];
  firstDifference: FirstDifference | null;
}

export interface ProbeResult {
  kind: ProbeKind;
  available: boolean;
  fingerprint: TextFingerprint | null;
  comparison: TextComparison | null;
  error: string | null;
}

export interface ExpectedEvidence {
  source: EvidenceSource;
  fingerprint: TextFingerprint;
}

export interface CheckResult {
  id: string;
  pageUrl: string;
  buttonSelector: string | null;
  status: CheckStatus;
  expected: ExpectedEvidence | null;
  probes: ProbeResult[];
  error: string | null;
  durationMs: number;
}

export interface AuditSummary {
  total: number;
  passed: number;
  failed: number;
  errors: number;
}

export interface AuditEnvironment {
  browser: string;
  browserVersion: string;
  node: string;
  platform: string;
  architecture: string;
}

export interface AuditReport {
  schemaVersion: 1;
  tool: {
    name: string;
    version: string;
  };
  generatedAt: string;
  environment: AuditEnvironment;
  summary: AuditSummary;
  checks: CheckResult[];
}

export interface AuditOptions {
  configDirectory?: string;
}
