import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import type { FlowNode } from "../../auth-types/types";
import { ACTOR_LABEL } from "./actors";
import { NODE_SIZE } from "./layout";

export type NodeState = "active" | "visited" | "idle";

export type FlowNodeData = {
  def: FlowNode;
  state: NodeState;
  direction: "TB" | "LR";
};

export type FlowNodeType = Node<FlowNodeData, "auth">;

const FlowNodeView = ({ data }: NodeProps<FlowNodeType>) => {
  const { def, state, direction } = data;
  const size = NODE_SIZE[def.kind];
  const target = direction === "LR" ? Position.Left : Position.Top;
  const source = direction === "LR" ? Position.Right : Position.Bottom;

  return (
    <div
      className={`fnode fnode--${def.kind} actor--${def.actor} is-${state}`}
      style={{ width: size.width, height: size.height }}
      title={def.detail}
    >
      <Handle type="target" position={target} className="fnode__handle" />
      {def.kind === "decision" && <div className="fnode__diamond" aria-hidden />}
      <div className="fnode__body">
        <span className="fnode__actor">{ACTOR_LABEL[def.actor]}</span>
        <span className="fnode__label">{def.label}</span>
      </div>
      <Handle type="source" position={source} className="fnode__handle" />
    </div>
  );
};

export default FlowNodeView;
