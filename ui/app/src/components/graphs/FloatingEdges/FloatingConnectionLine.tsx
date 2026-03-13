import { getBezierPath, Position } from '@xyflow/react';
import { getEdgeParams } from './initialElements';

interface FloatingConnectionLineProps {
	toX: number;
	toY: number;
	fromPosition: Position;
	toPosition: Position;
	fromNode: {
		id: string;
		measured: {
			width?: number;
			height?: number;
		};
		internals: {
			positionAbsolute: { x: number; y: number };
		};
	};
}

function FloatingConnectionLine({
	toX,
	toY,
	fromPosition,
	toPosition,
	fromNode
}: FloatingConnectionLineProps) {
	if (!fromNode) {
		return null;
	}

	// Ensure measured.width and measured.height are numbers for both nodes
	const safeFromNode = {
		...fromNode,
		measured: {
			width: fromNode.measured.width ?? 1,
			height: fromNode.measured.height ?? 1
		}
	};

	// Create a mock target node at the cursor position
	const targetNode = {
		id: 'connection-target',
		measured: {
			width: 1,
			height: 1
		},
		internals: {
			positionAbsolute: { x: toX, y: toY }
		}
	};

	const { sx, sy, tx, ty, sourcePos, targetPos } = getEdgeParams(safeFromNode, targetNode);

	const [edgePath] = getBezierPath({
		sourceX: sx,
		sourceY: sy,
		sourcePosition: sourcePos || fromPosition,
		targetPosition: targetPos || toPosition,
		targetX: tx || toX,
		targetY: ty || toY
	});

	return (
		<g>
			<path fill="none" stroke="#222" strokeWidth={1.5} className="animated" d={edgePath} />
			<circle cx={tx || toX} cy={ty || toY} fill="#fff" r={3} stroke="#222" strokeWidth={1.5} />
		</g>
	);
}

export default FloatingConnectionLine;
