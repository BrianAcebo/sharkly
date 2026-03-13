import { getBezierPath, useInternalNode } from '@xyflow/react';

import { getEdgeParams } from './initialElements';

interface FloatingEdgeProps {
	id: string;
	source: string;
	target: string;
	markerEnd?: string;
	style?: React.CSSProperties;
	data?: {
		tooltip?: string;
	};
}

function FloatingEdge({ id, source, target, markerEnd, style, data }: FloatingEdgeProps) {
	const sourceNode = useInternalNode(source);
	const targetNode = useInternalNode(target);

	if (!sourceNode || !targetNode) {
		return null;
	}

	// Ensure measured.width and measured.height are defined before passing to getEdgeParams
	const safeSourceNode = {
		...sourceNode,
		measured: {
			...sourceNode.measured,
			width: sourceNode.measured.width ?? 0,
			height: sourceNode.measured.height ?? 0
		}
	};
	const safeTargetNode = {
		...targetNode,
		measured: {
			...targetNode.measured,
			width: targetNode.measured.width ?? 0,
			height: targetNode.measured.height ?? 0
		}
	};

	const { sx, sy, tx, ty, sourcePos, targetPos } = getEdgeParams(safeSourceNode, safeTargetNode);

	const [edgePath] = getBezierPath({
		sourceX: sx,
		sourceY: sy,
		sourcePosition: sourcePos,
		targetPosition: targetPos,
		targetX: tx,
		targetY: ty
	});

	return (
		<path id={id} className="react-flow__edge-path" d={edgePath} markerEnd={markerEnd} style={style}>
			{data?.tooltip ? <title>{data.tooltip}</title> : null}
		</path>
	);
}

export default FloatingEdge;
