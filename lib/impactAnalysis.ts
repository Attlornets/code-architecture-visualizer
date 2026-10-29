import { ArchitectureNode, ArchitectureEdge, ImpactAnalysisResult } from '@/types/architecture';

/**
 * Calculates deterministic direct and indirect change impact by traversing directed dependency edges
 */
export function calculateImpactAnalysis(
  targetNode: ArchitectureNode,
  allNodes: ArchitectureNode[],
  edges: ArchitectureEdge[]
): ImpactAnalysisResult {
  const directDependentsSet = new Set<string>();
  const indirectDependentsSet = new Set<string>();
  const impactPathSet = new Set<string>([targetNode.id]);
  const nodesById = new Map(allNodes.map((node) => [node.id, node]));

  // Edges point from the importing/calling node to the dependency.
  edges.forEach((edge) => {
    if (edge.target === targetNode.id) {
      const callerNode = nodesById.get(edge.source);
      if (callerNode) {
        directDependentsSet.add(callerNode.label);
        impactPathSet.add(callerNode.id);
      }
    }
  });

  const queue = edges
    .filter((edge) => edge.target === targetNode.id && nodesById.has(edge.source))
    .map((edge) => edge.source);
  const visited = new Set<string>([targetNode.id, ...queue]);

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const currentNode = nodesById.get(currentId);
    if (!currentNode) continue;

    edges.forEach((edge) => {
      if (edge.target === currentNode.id) {
        const upstreamNode = nodesById.get(edge.source);
        if (upstreamNode && !visited.has(upstreamNode.id)) {
          visited.add(upstreamNode.id);
          indirectDependentsSet.add(upstreamNode.label);
          impactPathSet.add(upstreamNode.id);
          queue.push(upstreamNode.id);
        }
      }
    });
  }

  // Identify affected API endpoints
  const affectedEndpoints: string[] = [];
  impactPathSet.forEach((nodeId) => {
    const node = allNodes.find((n) => n.id === nodeId);
    if (node?.endpoints && node.endpoints.length > 0) {
      affectedEndpoints.push(...node.endpoints);
    }
  });

  // Calculate Risk Level
  let riskLevel: ImpactAnalysisResult['riskLevel'] = 'LOW';
  if (targetNode.changeability === 'CONTRACT_SENSITIVE' || affectedEndpoints.length > 0) {
    riskLevel = 'CRITICAL';
  } else if (directDependentsSet.size >= 2 || targetNode.category === 'database' || targetNode.category === 'queue') {
    riskLevel = 'HIGH';
  } else if (directDependentsSet.size === 1) {
    riskLevel = 'MEDIUM';
  }

  const rationale =
    riskLevel === 'CRITICAL'
      ? `High impact: ${targetNode.label} has a public contract or detected endpoint${affectedEndpoints.length ? ` (${affectedEndpoints.join(', ')})` : ''}. Review downstream dependents before changing it.`
      : riskLevel === 'HIGH'
      ? `Multi-caller dependency: ${directDependentsSet.size} direct upstream components rely on exports from ${targetNode.label}.`
      : riskLevel === 'MEDIUM'
      ? `Isolated dependency: 1 upstream component depends on ${targetNode.label}. Test verification recommended.`
      : `Localized component: Internal domain logic with zero external import bindings detected.`;

  return {
    targetId: targetNode.id,
    targetLabel: targetNode.label,
    directDependents: Array.from(directDependentsSet),
    indirectDependents: Array.from(indirectDependentsSet),
    affectedEndpoints: Array.from(new Set(affectedEndpoints)),
    contractSensitiveCalls: targetNode.dataContracts || [],
    riskLevel,
    rationale,
    impactPathNodeIds: Array.from(impactPathSet),
  };
}
