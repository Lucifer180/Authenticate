import dagre from "@dagrejs/dagre";
import type { Flow, NodeKind } from "../../auth-types/types";

export const NODE_SIZE: Record<NodeKind, { width: number; height: number }> = {
  start: { width: 230, height: 62 },
  step: { width: 250, height: 70 },
  decision: { width: 220, height: 92 },
  storage: { width: 250, height: 70 },
  success: { width: 230, height: 62 },
  error: { width: 200, height: 58 },
};

/** Ask dagre for x/y positions so flows can be written as plain node/edge lists. */
export const layoutFlow = (flow: Flow) => {
  const graph = new dagre.graphlib.Graph();
  graph.setGraph({ rankdir: flow.direction ?? "TB", nodesep: 46, ranksep: 54, marginx: 20, marginy: 20 });
  graph.setDefaultEdgeLabel(() => ({}));

  for (const node of flow.nodes) {
    graph.setNode(node.id, { ...NODE_SIZE[node.kind] });
  }
  for (const edge of flow.edges) {
    graph.setEdge(edge.from, edge.to);
  }

  dagre.layout(graph);

  const positions = new Map<string, { x: number; y: number }>();
  for (const node of flow.nodes) {
    const { x, y } = graph.node(node.id);
    const size = NODE_SIZE[node.kind];
    // dagre gives the centre; React Flow wants the top-left corner.
    positions.set(node.id, { x: x - size.width / 2, y: y - size.height / 2 });
  }
  return positions;
};
