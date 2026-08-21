import { createHash } from "node:crypto";

import type {
  CharacterDescription,
  Finding,
  FirstDifference,
  LineEndingCounts,
  TextComparison,
  TextFingerprint,
} from "./types.js";

const INVISIBLE_CODE_POINTS = new Set([
  0x00a0, 0x200b, 0x200c, 0x200d, 0x200e, 0x200f, 0x202f, 0x2060, 0xfeff,
]);

const PUNCTUATION_EQUIVALENTS = new Map<string, string>([
  ["\u2018", "'"],
  ["\u2019", "'"],
  ["\u201c", '"'],
  ["\u201d", '"'],
  ["\u2013", "-"],
  ["\u2014", "-"],
  ["\uff02", '"'],
  ["\uff07", "'"],
  ["\uff08", "("],
  ["\uff09", ")"],
  ["\uff0c", ","],
  ["\uff0e", "."],
  ["\uff1a", ":"],
  ["\uff1b", ";"],
]);

export function normalizeLineEndings(value: string): string {
  return value.replace(/\r\n?/g, "\n");
}

function countLineEndings(value: string): LineEndingCounts {
  const crlf = value.match(/\r\n/g)?.length ?? 0;
  const withoutCrlf = value.replace(/\r\n/g, "");
  return {
    crlf,
    lf: withoutCrlf.match(/\n/g)?.length ?? 0,
    cr: withoutCrlf.match(/\r/g)?.length ?? 0,
  };
}

export function fingerprintText(value: string): TextFingerprint {
  const normalized = normalizeLineEndings(value);
  return {
    sha256: createHash("sha256").update(value, "utf8").digest("hex"),
    utf8Bytes: Buffer.byteLength(value, "utf8"),
    codePoints: Array.from(value).length,
    lines: value.length === 0 ? 0 : normalized.split("\n").length,
    hasTrailingLineBreak: /(?:\r\n|\r|\n)$/.test(value),
    lineEndings: countLineEndings(value),
  };
}

function terminalLineBreakCount(value: string): number {
  return normalizeLineEndings(value).match(/\n+$/)?.[0].length ?? 0;
}

function stripTerminalLineBreaks(value: string): string {
  return normalizeLineEndings(value).replace(/\n+$/, "");
}

function normalizeIndentation(value: string): string {
  return normalizeLineEndings(value)
    .split("\n")
    .map((line) => line.trimStart())
    .join("\n");
}

function normalizeTabs(value: string): string {
  return normalizeLineEndings(value).replace(/\t/g, "    ");
}

function normalizePunctuation(value: string): string {
  return Array.from(value, (character) => PUNCTUATION_EQUIVALENTS.get(character) ?? character).join(
    "",
  );
}

function invisibleCounts(value: string): Map<number, number> {
  const counts = new Map<number, number>();
  for (const character of value) {
    const codePoint = character.codePointAt(0);
    if (codePoint !== undefined && INVISIBLE_CODE_POINTS.has(codePoint)) {
      counts.set(codePoint, (counts.get(codePoint) ?? 0) + 1);
    }
  }
  return counts;
}

function mapsEqual(left: Map<number, number>, right: Map<number, number>): boolean {
  if (left.size !== right.size) return false;
  return [...left].every(([key, value]) => right.get(key) === value);
}

function codePointLabel(codePoint: number): string {
  return `U+${codePoint.toString(16).toUpperCase().padStart(4, "0")}`;
}

function describeCharacter(character: string | undefined): CharacterDescription | null {
  if (character === undefined) return null;
  const codePoint = character.codePointAt(0);
  return {
    escaped: JSON.stringify(character).slice(1, -1),
    codePoint: codePoint === undefined ? "UNKNOWN" : codePointLabel(codePoint),
  };
}

function escapedContext(characters: string[], index: number): string {
  const radius = 12;
  const start = Math.max(0, index - radius);
  const end = Math.min(characters.length, index + radius + 1);
  return JSON.stringify(characters.slice(start, end).join(""));
}

function findFirstDifference(expected: string, actual: string): FirstDifference | null {
  if (expected === actual) return null;

  const expectedCharacters = Array.from(expected);
  const actualCharacters = Array.from(actual);
  const limit = Math.max(expectedCharacters.length, actualCharacters.length);
  let index = 0;
  while (index < limit && expectedCharacters[index] === actualCharacters[index]) index += 1;

  const prefix = expectedCharacters.slice(0, index).join("");
  const normalizedPrefix = normalizeLineEndings(prefix);
  const lastLineBreak = normalizedPrefix.lastIndexOf("\n");

  return {
    codePointIndex: index,
    expectedLine: normalizedPrefix.split("\n").length,
    expectedColumn: Array.from(normalizedPrefix.slice(lastLineBreak + 1)).length + 1,
    expected: describeCharacter(expectedCharacters[index]),
    actual: describeCharacter(actualCharacters[index]),
    expectedContext: escapedContext(expectedCharacters, index),
    actualContext: escapedContext(actualCharacters, index),
  };
}

function invisibleFinding(expected: string, actual: string): Finding | null {
  const expectedCounts = invisibleCounts(expected);
  const actualCounts = invisibleCounts(actual);
  if (mapsEqual(expectedCounts, actualCounts)) return null;

  const changed = new Set([...expectedCounts.keys(), ...actualCounts.keys()]);
  const details = [...changed]
    .sort((left, right) => left - right)
    .map(
      (codePoint) =>
        `${codePointLabel(codePoint)} ${expectedCounts.get(codePoint) ?? 0}->${actualCounts.get(codePoint) ?? 0}`,
    )
    .join(", ");
  return {
    code: "invisible-characters-changed",
    message: `Invisible or non-breaking characters changed: ${details}.`,
  };
}

export function compareText(expected: string, actual: string): TextComparison {
  if (expected === actual) {
    return { exact: true, findings: [], firstDifference: null };
  }

  const findings: Finding[] = [];
  const normalizedExpected = normalizeLineEndings(expected);
  const normalizedActual = normalizeLineEndings(actual);

  if (normalizedExpected === normalizedActual) {
    findings.push({
      code: "line-endings-changed",
      message: "Only line-ending encoding changed (LF, CRLF, or CR).",
    });
  }

  if (
    stripTerminalLineBreaks(expected) === stripTerminalLineBreaks(actual) &&
    terminalLineBreakCount(expected) !== terminalLineBreakCount(actual)
  ) {
    findings.push({
      code: "terminal-line-breaks-changed",
      message: `Terminal line-break count changed from ${terminalLineBreakCount(expected)} to ${terminalLineBreakCount(actual)}.`,
    });
  }

  if (
    normalizeIndentation(expected) === normalizeIndentation(actual) &&
    normalizedExpected !== normalizedActual
  ) {
    findings.push({
      code: "indentation-changed",
      message: "Line content is unchanged after removing leading indentation.",
    });
  }

  if (
    normalizeTabs(expected) === normalizeTabs(actual) &&
    normalizedExpected !== normalizedActual
  ) {
    findings.push({
      code: "tabs-spaces-changed",
      message: "Tabs and four-space indentation were substituted.",
    });
  }

  if (expected.normalize("NFC") === actual.normalize("NFC")) {
    findings.push({
      code: "unicode-normalization-changed",
      message: "Text differs only by Unicode normalization form.",
    });
  }

  const invisible = invisibleFinding(expected, actual);
  if (invisible !== null) findings.push(invisible);

  if (normalizePunctuation(expected) === normalizePunctuation(actual)) {
    findings.push({
      code: "punctuation-width-or-style-changed",
      message: "Straight, smart, dash, or full-width punctuation was substituted.",
    });
  }

  if (
    normalizedExpected.replace(/\s/gu, "") === normalizedActual.replace(/\s/gu, "") &&
    findings.length === 0
  ) {
    findings.push({
      code: "whitespace-changed",
      message: "Non-whitespace content is unchanged, but whitespace differs.",
    });
  }

  if (findings.length === 0) {
    findings.push({
      code: "content-changed",
      message: "Copied text differs from the expected text.",
    });
  }

  return {
    exact: false,
    findings,
    firstDifference: findFirstDifference(expected, actual),
  };
}
