import { Position, MarkerType, Node as FlowNode, Edge as FlowEdge } from '@xyflow/react';

// this helper function returns the intersection point
// of the line between the center of the intersectionNode and the target node
interface PositionAbsolute {
	x: number;
	y: number;
}

interface Measured {
	width: number;
	height: number;
}

interface Node {
	measured: Measured;
	internals: {
		positionAbsolute: PositionAbsolute;
	};
	[key: string]: unknown;
}

interface Point {
	x: number;
	y: number;
}

interface NodeData extends Record<string, unknown> {
	label: string;
}

function getNodeIntersection(intersectionNode: Node, targetNode: Node): Point {
	// https://math.stackexchange.com/questions/1724792/an-algorithm-for-finding-the-intersection-point-between-a-center-of-vision-and-a
	const { width: intersectionNodeWidth, height: intersectionNodeHeight } =
		intersectionNode.measured;
	const intersectionNodePosition = intersectionNode.internals.positionAbsolute;
	const targetPosition = targetNode.internals.positionAbsolute;

	const w = intersectionNodeWidth / 2;
	const h = intersectionNodeHeight / 2;

	const x2 = intersectionNodePosition.x + w;
	const y2 = intersectionNodePosition.y + h;
	const x1 = targetPosition.x + targetNode.measured.width / 2;
	const y1 = targetPosition.y + targetNode.measured.height / 2;

	const xx1 = (x1 - x2) / (2 * w) - (y1 - y2) / (2 * h);
	const yy1 = (x1 - x2) / (2 * w) + (y1 - y2) / (2 * h);
	const a = 1 / (Math.abs(xx1) + Math.abs(yy1));
	const xx3 = a * xx1;
	const yy3 = a * yy1;
	const x = w * (xx3 + yy3) + x2;
	const y = h * (-xx3 + yy3) + y2;

	return { x, y };
}

// returns the position (top,right,bottom or right) passed node compared to the intersection point
interface EdgePositionNode extends Node {
	id?: string;
	data?: unknown;
}

function getEdgePosition(node: EdgePositionNode, intersectionPoint: Point): Position {
	const n = { ...node.internals.positionAbsolute, ...node };
	const nx: number = Math.round(n.x);
	const ny: number = Math.round(n.y);
	const px: number = Math.round(intersectionPoint.x);
	const py: number = Math.round(intersectionPoint.y);

	if (px <= nx + 1) {
		return Position.Left;
	}
	if (px >= nx + n.measured.width - 1) {
		return Position.Right;
	}
	if (py <= ny + 1) {
		return Position.Top;
	}
	if (py >= n.y + n.measured.height - 1) {
		return Position.Bottom;
	}

	return Position.Top;
}

// returns the parameters (sx, sy, tx, ty, sourcePos, targetPos) you need to create an edge
interface EdgeParams {
	sx: number;
	sy: number;
	tx: number;
	ty: number;
	sourcePos: Position;
	targetPos: Position;
}

export function getEdgeParams(source: Node, target: Node): EdgeParams {
	const sourceIntersectionPoint: Point = getNodeIntersection(source, target);
	const targetIntersectionPoint: Point = getNodeIntersection(target, source);

	const sourcePos: Position = getEdgePosition(source, sourceIntersectionPoint);
	const targetPos: Position = getEdgePosition(target, targetIntersectionPoint);

	return {
		sx: sourceIntersectionPoint.x,
		sy: sourceIntersectionPoint.y,
		tx: targetIntersectionPoint.x,
		ty: targetIntersectionPoint.y,
		sourcePos,
		targetPos
	};
}

// Add a helper to assign types to demo nodes
const DEMO_TYPES = [
	'Person',
	'Domain',
	'IP Address',
	'Email',
	'Company',
	'Social Profile',
	'Address',
	'Breach'
];

// Function to create nodes and edges for a circle
const createCircle = (
	prefix: string,
	nodeCount: number,
	radius: number,
	centerX: number,
	centerY: number
): { nodes: FlowNode<NodeData>[]; edges: FlowEdge[] } => {
	const nodes: FlowNode<NodeData>[] = [];
	const edges: FlowEdge[] = [];

	// Assign a demo type to the center node
	const centerType = DEMO_TYPES[Math.floor(Math.random() * DEMO_TYPES.length)];
	nodes.push({
		id: `${prefix}-center`,
		data: { label: `${prefix} Center`, type: centerType },
		position: { x: centerX, y: centerY }
	});

	// Add surrounding nodes
	for (let i = 0; i < nodeCount; i++) {
		const degrees = i * (360 / nodeCount);
		const radians = degrees * (Math.PI / 180);
		const x = radius * Math.cos(radians) + centerX;
		const y = radius * Math.sin(radians) + centerY;

		const nodeId = `${prefix}-${i}`;
		// Assign a demo type to the first node, others generic
		const nodeType =
			i === 0 ? DEMO_TYPES[Math.floor(Math.random() * DEMO_TYPES.length)] : undefined;
		nodes.push({
			id: nodeId,
			data: nodeType
				? { label: `${prefix} Node ${i + 1}`, type: nodeType }
				: { label: `${prefix} Node ${i + 1}` },
			position: { x, y }
		});

		edges.push({
			id: `edge-${prefix}-${i}`,
			target: `${prefix}-center`,
			source: nodeId,
			type: 'floating',
			markerEnd: {
				type: MarkerType.Arrow
			}
		});
	}

	return { nodes, edges };
};

// Function to generate initial elements
export const initialElements = () => {
	const windowWidth = window.innerWidth;
	const windowHeight = window.innerHeight;

	// Define circles with their properties
	const circles = [
		{ prefix: 'circle1', nodeCount: 6, radius: 350 },
		{ prefix: 'circle2', nodeCount: 8, radius: 400 },
		{ prefix: 'circle3', nodeCount: 5, radius: 320 }
	];

	const allNodes: FlowNode<NodeData>[] = [];
	const allEdges: FlowEdge[] = [];

	// Position circles with offsets to prevent overlap
	circles.forEach((circle, index) => {
		// Calculate offset based on index
		const xOffset = index * (windowWidth * 0.4); // 40% of window width
		const yOffset = index * (windowHeight * 0.3); // 30% of window height

		// Create circle at offset position
		const { nodes, edges } = createCircle(
			circle.prefix,
			circle.nodeCount,
			circle.radius,
			windowWidth * 0.2 + xOffset, // Start at 20% of window width
			windowHeight * 0.2 + yOffset // Start at 20% of window height
		);

		allNodes.push(...nodes);
		allEdges.push(...edges);
	});

	return { nodes: allNodes, edges: allEdges };
};
