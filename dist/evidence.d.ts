import type { CheckStatus, EvidenceGraph, EvidenceNodeState, EvidenceSource, EvidenceStage } from "./types.js";
export interface EvidenceObservation {
    stage: EvidenceStage;
    state: EvidenceNodeState;
    required: boolean;
    source: EvidenceSource | null;
    text: string | null;
    detail: string | null;
}
export declare function buildEvidenceGraph(observations: EvidenceObservation[], baseline: EvidenceStage): EvidenceGraph;
export declare function statusFromEvidenceGraph(graph: EvidenceGraph): CheckStatus;
//# sourceMappingURL=evidence.d.ts.map