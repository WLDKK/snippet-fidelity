import { compareText, fingerprintText } from "./compare.js";
const EVIDENCE_STAGES = [
    "canonical-source",
    "rendered-dom",
    "handler-payload",
    "browser-clipboard",
];
function defaultObservation(stage) {
    return {
        stage,
        state: "not-observed",
        required: false,
        source: null,
        text: null,
        detail: `${stage} was not observed for this check.`,
    };
}
function resolveObservation(observation) {
    if (observation.state === "available" && observation.text === null) {
        throw new Error(`Available evidence stage ${observation.stage} must include text.`);
    }
    if (observation.state !== "available" && observation.text !== null) {
        throw new Error(`Non-available evidence stage ${observation.stage} cannot include text.`);
    }
    return {
        ...observation,
        node: {
            stage: observation.stage,
            state: observation.state,
            required: observation.required,
            source: observation.source,
            fingerprint: observation.state === "available" ? fingerprintText(observation.text ?? "") : null,
            detail: observation.state === "available" ? null : observation.detail,
        },
    };
}
function unavailableDetail(observation) {
    return `${observation.stage} is ${observation.state}: ${observation.detail ?? "no detail available"}`;
}
function compareObservations(left, right, baseline) {
    const required = (left.stage === baseline && right.required) || (right.stage === baseline && left.required);
    if (left.state !== "available" || right.state !== "available") {
        const unavailable = [left, right]
            .filter((observation) => observation.state !== "available")
            .map(unavailableDetail)
            .join("; ");
        return {
            from: left.stage,
            to: right.stage,
            required,
            status: "not-comparable",
            comparison: null,
            detail: unavailable,
        };
    }
    const comparison = compareText(left.text ?? "", right.text ?? "");
    return {
        from: left.stage,
        to: right.stage,
        required,
        status: comparison.exact ? "exact" : "mismatch",
        comparison,
        detail: null,
    };
}
export function buildEvidenceGraph(observations, baseline) {
    const byStage = new Map();
    for (const observation of observations) {
        if (byStage.has(observation.stage)) {
            throw new Error(`Evidence stage ${observation.stage} was provided more than once.`);
        }
        byStage.set(observation.stage, observation);
    }
    const resolved = EVIDENCE_STAGES.map((stage) => resolveObservation(byStage.get(stage) ?? defaultObservation(stage)));
    const baselineNode = resolved.find((observation) => observation.stage === baseline);
    if (baselineNode?.state !== "available") {
        throw new Error(`Evidence baseline ${baseline} must be available.`);
    }
    const comparisons = [];
    for (let leftIndex = 0; leftIndex < resolved.length; leftIndex += 1) {
        for (let rightIndex = leftIndex + 1; rightIndex < resolved.length; rightIndex += 1) {
            const left = resolved[leftIndex];
            const right = resolved[rightIndex];
            if (left !== undefined && right !== undefined) {
                comparisons.push(compareObservations(left, right, baseline));
            }
        }
    }
    return {
        version: 1,
        baseline,
        nodes: resolved.map((observation) => observation.node),
        comparisons,
    };
}
export function statusFromEvidenceGraph(graph) {
    const required = graph.comparisons.filter((comparison) => comparison.required);
    if (required.length === 0)
        return "error";
    if (required.some((comparison) => comparison.status === "not-comparable"))
        return "error";
    if (required.some((comparison) => comparison.status === "mismatch"))
        return "failed";
    return "passed";
}
//# sourceMappingURL=evidence.js.map