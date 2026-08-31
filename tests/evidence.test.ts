import { describe, expect, it } from "vitest";

import {
  buildEvidenceGraph,
  statusFromEvidenceGraph,
  type EvidenceObservation,
} from "../src/evidence.js";
import type { EvidenceStage } from "../src/types.js";

function available(stage: EvidenceStage, text: string, required: boolean): EvidenceObservation {
  return {
    stage,
    state: "available",
    required,
    source:
      stage === "canonical-source"
        ? "canonical-text"
        : stage === "rendered-dom"
          ? "rendered-dom"
          : null,
    text,
    detail: null,
  };
}

function unavailable(stage: EvidenceStage, required: boolean): EvidenceObservation {
  return {
    stage,
    state: "unavailable",
    required,
    source: null,
    text: null,
    detail: `${stage} could not be captured.`,
  };
}

describe("proof graph", () => {
  it("compares every available evidence pair while retaining unobserved stages", () => {
    const graph = buildEvidenceGraph(
      [
        available("canonical-source", "npm install\n", true),
        available("handler-payload", "npm install\n", true),
        available("browser-clipboard", "npm install\n", true),
      ],
      "canonical-source",
    );

    expect(graph.nodes).toHaveLength(4);
    expect(graph.comparisons).toHaveLength(6);
    expect(graph.nodes.find((node) => node.stage === "rendered-dom")?.state).toBe("not-observed");
    expect(
      graph.comparisons.find(
        (comparison) =>
          comparison.from === "handler-payload" && comparison.to === "browser-clipboard",
      ),
    ).toMatchObject({ status: "exact", required: false });
    expect(statusFromEvidenceGraph(graph)).toBe("passed");
  });

  it("keeps an optional unavailable handler visible without failing clipboard mode", () => {
    const graph = buildEvidenceGraph(
      [
        available("canonical-source", "copy me", true),
        unavailable("handler-payload", false),
        available("browser-clipboard", "copy me", true),
      ],
      "canonical-source",
    );

    expect(statusFromEvidenceGraph(graph)).toBe("passed");
    expect(
      graph.comparisons.find(
        (comparison) =>
          comparison.from === "canonical-source" && comparison.to === "handler-payload",
      ),
    ).toMatchObject({ status: "not-comparable", required: false });
  });

  it("returns an error when a required evidence stage is unavailable", () => {
    const graph = buildEvidenceGraph(
      [
        available("canonical-source", "copy me", true),
        unavailable("handler-payload", true),
        available("browser-clipboard", "copy me", true),
      ],
      "canonical-source",
    );

    expect(statusFromEvidenceGraph(graph)).toBe("error");
  });

  it("records pairwise line-ending drift across handler and clipboard evidence", () => {
    const graph = buildEvidenceGraph(
      [
        available("canonical-source", "line one\n", true),
        available("handler-payload", "line one\n", true),
        available("browser-clipboard", "line one\r\n", true),
      ],
      "canonical-source",
    );
    const handlerToClipboard = graph.comparisons.find(
      (comparison) =>
        comparison.from === "handler-payload" && comparison.to === "browser-clipboard",
    );

    expect(statusFromEvidenceGraph(graph)).toBe("failed");
    expect(handlerToClipboard?.status).toBe("mismatch");
    expect(handlerToClipboard?.comparison?.findings.map((finding) => finding.code)).toContain(
      "line-endings-changed",
    );
  });

  it("rejects contradictory node state and text input", () => {
    expect(() =>
      buildEvidenceGraph(
        [
          {
            stage: "canonical-source",
            state: "available",
            required: true,
            source: "canonical-text",
            text: null,
            detail: null,
          },
        ],
        "canonical-source",
      ),
    ).toThrow("must include text");
  });
});
