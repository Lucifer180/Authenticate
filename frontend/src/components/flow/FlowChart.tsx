import "@xyflow/react/dist/style.css";

import {
  Background,
  Controls,
  MarkerType,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
} from "@xyflow/react";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { Flow } from "../../auth-types/types";
import CodeBlock from "../CodeBlock";
import { ACTOR_LABEL, KIND_LABEL } from "./actors";
import FlowNodeView, { type FlowNodeType, type NodeState } from "./FlowNodeView";
import { layoutFlow, NODE_SIZE } from "./layout";
import { useMediaQuery } from "../../lib/useMediaQuery";

const nodeTypes = { auth: FlowNodeView };

interface Props {
  flow: Flow;
  /** Height of the canvas in px. */
  height?: number;
}

const FlowChartInner = ({ flow, height = 560 }: Props) => {
  const direction = flow.direction ?? "TB";
  const positions = useMemo(() => layoutFlow(flow), [flow]);
  const [progress, setProgress] = useState(0);
  const [selectedId, setSelectedId] = useState(flow.walkthrough[0]);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const centered = useRef(false);
  const { setCenter, getZoom } = useReactFlow();
  // On touch screens one-finger drags must scroll the page, not pan the chart.
  const isTouch = useMediaQuery("(pointer: coarse)");
  const isNarrow = useMediaQuery("(max-width: 640px)");

  const visited = useMemo(() => new Set(flow.walkthrough.slice(0, progress + 1)), [flow, progress]);
  const traversed = useMemo(() => {
    const pairs = new Set<string>();
    for (let i = 0; i < progress; i++) pairs.add(`${flow.walkthrough[i]}->${flow.walkthrough[i + 1]}`);
    return pairs;
  }, [flow, progress]);

  const nodes: FlowNodeType[] = useMemo(
    () =>
      flow.nodes.map((def) => {
        const state: NodeState = def.id === selectedId ? "active" : visited.has(def.id) ? "visited" : "idle";
        return {
          id: def.id,
          type: "auth",
          position: positions.get(def.id) ?? { x: 0, y: 0 },
          data: { def, state, direction },
          draggable: false,
          connectable: false,
        };
      }),
    [flow, positions, selectedId, visited, direction]
  );

  const edges: Edge[] = useMemo(() => {
    const kindOf = new Map(flow.nodes.map((n) => [n.id, n.kind]));
    return flow.edges.map((edge) => {
      const isTraversed = traversed.has(`${edge.from}->${edge.to}`);
      const toError = kindOf.get(edge.to) === "error";
      return {
        id: `${edge.from}->${edge.to}`,
        source: edge.from,
        target: edge.to,
        label: edge.label,
        type: "smoothstep",
        animated: isTraversed,
        className: `fedge ${isTraversed ? "fedge--on" : ""} ${toError ? "fedge--error" : ""}`,
        markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
        labelBgPadding: [6, 3] as [number, number],
        labelBgBorderRadius: 4,
      };
    });
  }, [flow, traversed]);

  // Keep the selected step in view (at a readable zoom) as the walkthrough moves.
  useEffect(() => {
    if (!ready) return;
    const pos = positions.get(selectedId);
    const def = flow.nodes.find((n) => n.id === selectedId);
    if (!pos || !def) return;
    const size = NODE_SIZE[def.kind];
    // Wait a frame so the canvas has its final size before the viewport moves.
    const frame = requestAnimationFrame(() => {
      setCenter(pos.x + size.width / 2, pos.y + size.height / 2, {
        zoom: Math.max(getZoom(), isNarrow ? 0.75 : 1),
        // Jump straight to the first step on load; animate between later steps.
        duration: centered.current ? 450 : 0,
      });
      centered.current = true;
    });
    return () => cancelAnimationFrame(frame);
  }, [ready, selectedId, positions, flow, setCenter, getZoom, isNarrow]);

  const goTo = (index: number) => {
    const clamped = Math.min(Math.max(index, 0), flow.walkthrough.length - 1);
    setProgress(clamped);
    setSelectedId(flow.walkthrough[clamped]);
  };

  useEffect(() => {
    if (!playing || progress >= flow.walkthrough.length - 1) return;
    const timer = setTimeout(() => {
      const next = progress + 1;
      setProgress(next);
      setSelectedId(flow.walkthrough[next]);
      if (next >= flow.walkthrough.length - 1) setPlaying(false);
    }, 2600);
    return () => clearTimeout(timer);
  }, [playing, progress, flow]);

  const selected = flow.nodes.find((n) => n.id === selectedId) ?? flow.nodes[0];
  const stepIndex = flow.walkthrough.indexOf(selected.id);

  return (
    <div className={`flowchart ${isTouch ? "flowchart--touch" : ""}`}>
      <div
        className="flowchart__canvas"
        style={{ "--canvas-h": `${height}px` } as CSSProperties}
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") goTo(progress + 1);
          if (event.key === "ArrowLeft") goTo(progress - 1);
        }}
        aria-label={`Flowchart: ${flow.title}. Use left and right arrow keys to step through.`}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          defaultViewport={{ x: 0, y: 0, zoom: isNarrow ? 0.75 : 1 }}
          onInit={() => setReady(true)}
          minZoom={0.3}
          maxZoom={1.6}
          nodesDraggable={false}
          nodesConnectable={false}
          panOnDrag={!isTouch}
          proOptions={{ hideAttribution: true }}
          onNodeClick={(_, node) => {
            const index = flow.walkthrough.indexOf(node.id);
            if (index >= 0) setProgress(index);
            setSelectedId(node.id);
            setPlaying(false);
          }}
        >
          <Background gap={20} size={1} />
          <Controls showInteractive={false} />
        </ReactFlow>

        <div className="legend" aria-hidden>
          {(["browser", "middleware", "server", "crypto", "database"] as const).map((actor) => (
            <span key={actor} className={`legend__item actor--${actor}`}>
              <i /> {ACTOR_LABEL[actor]}
            </span>
          ))}
        </div>
      </div>

      <aside className="flowchart__panel">
        <div className="walk">
          <button className="btn btn--ghost" onClick={() => goTo(progress - 1)} disabled={progress === 0}>
            ← Prev
          </button>
          <button
            className="btn"
            onClick={() => {
              if (playing) return setPlaying(false);
              if (progress >= flow.walkthrough.length - 1) goTo(0);
              setPlaying(true);
            }}
          >
            {playing ? "Pause" : progress >= flow.walkthrough.length - 1 ? "Replay" : "Play"}
          </button>
          <button
            className="btn btn--ghost"
            onClick={() => goTo(progress + 1)}
            disabled={progress >= flow.walkthrough.length - 1}
          >
            Next →
          </button>
        </div>
        <div className="walk__progress" aria-hidden>
          <span style={{ width: `${((progress + 1) / flow.walkthrough.length) * 100}%` }} />
        </div>

        <div className="step">
          <div className="step__meta">
            <span className={`chip actor--${selected.actor}`}>{ACTOR_LABEL[selected.actor]}</span>
            <span className={`chip chip--kind chip--${selected.kind}`}>{KIND_LABEL[selected.kind]}</span>
            <span className="step__count">
              {stepIndex >= 0 ? `Step ${stepIndex + 1} of ${flow.walkthrough.length}` : "Branch (not on the main path)"}
            </span>
          </div>
          <h3 className="step__title">{selected.label}</h3>
          <p className="step__detail">{selected.detail}</p>
          {selected.code && <CodeBlock file={selected.code.file} code={selected.code.snippet} />}
          <p className="hint">Tip: click any box in the chart, including the red ones, to see why a request gets rejected.</p>
        </div>
      </aside>
    </div>
  );
};

const FlowChart = (props: Props) => (
  <ReactFlowProvider>
    <FlowChartInner key={props.flow.id} {...props} />
  </ReactFlowProvider>
);

export default FlowChart;
