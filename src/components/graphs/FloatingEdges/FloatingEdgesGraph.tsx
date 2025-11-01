import { useCallback, useState, useEffect } from 'react';
import {
	ReactFlow,
	addEdge,
	Background,
	useNodesState,
	useEdgesState,
	MarkerType,
	MiniMap,
	Controls,
	type Connection,
	type Node,
	type Edge
} from '@xyflow/react';
import { Menu, Item, useContextMenu } from 'react-contexify';
import 'react-contexify/dist/ReactContexify.css';
import { User, Globe, Server, Building2 } from 'lucide-react';

import '@xyflow/react/dist/style.css';
import '../../../../xy-theme.css';

import FloatingEdge from './FloatingEdge';
import FloatingConnectionLine from './FloatingConnectionLine';
import { initialElements } from './initialElements';
import { Button } from '../../ui/button';
import { Button as Button2 } from '../../ui/button';
import { useTheme } from '../../../hooks/useTheme';
import { Input } from '../../ui/input';
import Label from '../../form/Label';
import { X } from 'lucide-react';

const { nodes: initialNodes, edges: initialEdges } = initialElements();

const edgeTypes = {
	floating: FloatingEdge
};

// Entity type to icon mapping
const ENTITY_ICONS: Record<string, React.ReactNode> = {
	Person: <User className="mr-1 inline-block" size={16} />,
	Domain: <Globe className="mr-1 inline-block" size={16} />,
	'IP Address': <Server className="mr-1 inline-block" size={16} />,
	Company: <Building2 className="mr-1 inline-block" size={16} />,
	Email: <span className="mr-1 inline-block">📧</span>,
	'Social Profile': <span className="mr-1 inline-block">👤</span>,
	Address: <span className="mr-1 inline-block">🏠</span>,
	MX: <span className="mr-1 inline-block">📬</span>,
	WHOIS: <span className="mr-1 inline-block">🔍</span>,
	Breach: <span className="mr-1 inline-block">⚠️</span>,
	'Breach Details': <span className="mr-1 inline-block">📝</span>,
	'MX Record': <span className="mr-1 inline-block">📬</span>,
	Unknown: <span className="mr-1 inline-block">?</span>
};

// If you see a type error for 'react-contexify', install types with:
// npm install --save-dev @types/react-contexify

// Define a type for transform output
interface TransformResult {
	nodes: Node<NodeData>[];
	edges: Edge<NodeData>[];
}

// Expanded mock transform registry
const TRANSFORMS: Record<
	string,
	{ name: string; run: (node: NodeData & { id: string; x: number; y: number }) => TransformResult }
> = {
	Person: {
		name: 'Find Email, Company, Social Profile',
		run: (node) => ({
			nodes: [
				{
					id: `${node.id}-email`,
					type: 'default',
					position: { x: node.x + 120, y: node.y },
					data: { label: 'john.doe@email.com', type: 'Email' }
				},
				{
					id: `${node.id}-company`,
					type: 'default',
					position: { x: node.x + 120, y: node.y + 60 },
					data: { label: 'Acme Corp', type: 'Company' }
				},
				{
					id: `${node.id}-twitter`,
					type: 'default',
					position: { x: node.x + 120, y: node.y - 60 },
					data: { label: '@johndoe', type: 'Social Profile' }
				}
			],
			edges: [
				{
					id: `${node.id}-email-edge`,
					source: node.id,
					target: `${node.id}-email`,
					type: 'floating'
				},
				{
					id: `${node.id}-company-edge`,
					source: node.id,
					target: `${node.id}-company`,
					type: 'floating'
				},
				{
					id: `${node.id}-twitter-edge`,
					source: node.id,
					target: `${node.id}-twitter`,
					type: 'floating'
				}
			]
		})
	},
	Domain: {
		name: 'Find IP, MX, WHOIS',
		run: (node) => ({
			nodes: [
				{
					id: `${node.id}-ip`,
					type: 'default',
					position: { x: node.x + 120, y: node.y },
					data: { label: '8.8.8.8', type: 'IP Address' }
				},
				{
					id: `${node.id}-mx`,
					type: 'default',
					position: { x: node.x + 120, y: node.y + 60 },
					data: { label: 'mail.example.com', type: 'MX Record' }
				},
				{
					id: `${node.id}-whois`,
					type: 'default',
					position: { x: node.x + 120, y: node.y - 60 },
					data: { label: 'Example Registrar', type: 'WHOIS' }
				}
			],
			edges: [
				{ id: `${node.id}-ip-edge`, source: node.id, target: `${node.id}-ip`, type: 'floating' },
				{ id: `${node.id}-mx-edge`, source: node.id, target: `${node.id}-mx`, type: 'floating' },
				{
					id: `${node.id}-whois-edge`,
					source: node.id,
					target: `${node.id}-whois`,
					type: 'floating'
				}
			]
		})
	},
	'IP Address': {
		name: 'Reverse DNS, Geolocate',
		run: (node) => ({
			nodes: [
				{
					id: `${node.id}-rdns`,
					type: 'default',
					position: { x: node.x + 120, y: node.y },
					data: { label: 'dns.google', type: 'Domain' }
				},
				{
					id: `${node.id}-geo`,
					type: 'default',
					position: { x: node.x + 120, y: node.y + 60 },
					data: { label: 'Mountain View, CA', type: 'Address' }
				}
			],
			edges: [
				{
					id: `${node.id}-rdns-edge`,
					source: node.id,
					target: `${node.id}-rdns`,
					type: 'floating'
				},
				{ id: `${node.id}-geo-edge`, source: node.id, target: `${node.id}-geo`, type: 'floating' }
			]
		})
	},
	Email: {
		name: 'Find Breaches, Social Profiles',
		run: (node) => ({
			nodes: [
				{
					id: `${node.id}-breach`,
					type: 'default',
					position: { x: node.x + 120, y: node.y },
					data: { label: 'Breach 2023', type: 'Breach' }
				},
				{
					id: `${node.id}-linkedin`,
					type: 'default',
					position: { x: node.x + 120, y: node.y + 60 },
					data: { label: 'linkedin.com/in/johndoe', type: 'Social Profile' }
				}
			],
			edges: [
				{
					id: `${node.id}-breach-edge`,
					source: node.id,
					target: `${node.id}-breach`,
					type: 'floating'
				},
				{
					id: `${node.id}-linkedin-edge`,
					source: node.id,
					target: `${node.id}-linkedin`,
					type: 'floating'
				}
			]
		})
	},
	Company: {
		name: 'Find Employees, Domains',
		run: (node) => ({
			nodes: [
				{
					id: `${node.id}-employee`,
					type: 'default',
					position: { x: node.x + 120, y: node.y },
					data: { label: 'Jane Smith', type: 'Person' }
				},
				{
					id: `${node.id}-domain`,
					type: 'default',
					position: { x: node.x + 120, y: node.y + 60 },
					data: { label: 'acme.com', type: 'Domain' }
				}
			],
			edges: [
				{
					id: `${node.id}-employee-edge`,
					source: node.id,
					target: `${node.id}-employee`,
					type: 'floating'
				},
				{
					id: `${node.id}-domain-edge`,
					source: node.id,
					target: `${node.id}-domain`,
					type: 'floating'
				}
			]
		})
	},
	'Social Profile': {
		name: 'Find Related Profiles',
		run: (node) => ({
			nodes: [
				{
					id: `${node.id}-profile2`,
					type: 'default',
					position: { x: node.x + 120, y: node.y },
					data: { label: '@doe_john', type: 'Social Profile' }
				}
			],
			edges: [
				{
					id: `${node.id}-profile2-edge`,
					source: node.id,
					target: `${node.id}-profile2`,
					type: 'floating'
				}
			]
		})
	},
	Address: {
		name: 'Find Residents',
		run: (node) => ({
			nodes: [
				{
					id: `${node.id}-resident`,
					type: 'default',
					position: { x: node.x + 120, y: node.y },
					data: { label: 'John Doe', type: 'Person' }
				}
			],
			edges: [
				{
					id: `${node.id}-resident-edge`,
					source: node.id,
					target: `${node.id}-resident`,
					type: 'floating'
				}
			]
		})
	},
	Breach: {
		name: 'Find Breach Details',
		run: (node) => ({
			nodes: [
				{
					id: `${node.id}-breach-details`,
					type: 'default',
					position: { x: node.x + 120, y: node.y },
					data: { label: 'Password leaked', type: 'Breach Details' }
				}
			],
			edges: [
				{
					id: `${node.id}-breach-details-edge`,
					source: node.id,
					target: `${node.id}-breach-details`,
					type: 'floating'
				}
			]
		})
	}
};

// Update NodeData type
type NodeData = {
	label: string;
	type: string;
	[key: string]: unknown;
};

const MENU_ID = 'node-context-menu';

const NodeAsHandleFlow = () => {
	const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
	const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
	const { theme } = useTheme();

	const [selectedDataset, setSelectedDataset] = useState<string>('all');
	const [selectedNode, setSelectedNode] = useState<Node<NodeData> | null>(null);
	const [contextNode, setContextNode] = useState<Node<NodeData> | null>(null);
	const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
	const [openTabSelector, setOpenTabSelector] = useState<boolean>(false);
	const [isMobile, setIsMobile] = useState<boolean>(false);
	const { show } = useContextMenu({ id: MENU_ID });

	useEffect(() => {
		const mediaQuery = window.matchMedia('(max-width: 768px)');
		setIsMobile(mediaQuery.matches);

		const handleChange = () => {
			setIsMobile(mediaQuery.matches);
		};

		mediaQuery.addEventListener('change', handleChange);

		return () => {
			mediaQuery.removeEventListener('change', handleChange);
		};
	}, []);

	useEffect(() => {
		if (isMobile) {
			setOpenTabSelector(false);
		}
	}, [isMobile]);

	const toggleTabSelector = useCallback(() => {
		setOpenTabSelector(!openTabSelector);
	}, [openTabSelector]);

	const onConnect = useCallback(
		(params: Connection) =>
			setEdges((eds) =>
				addEdge(
					{
						...params,
						type: 'floating',
						markerEnd: { type: MarkerType.Arrow }
					},
					eds
				)
			),
		[setEdges]
	);

	const onNodeContextMenu = useCallback(
		(event: React.MouseEvent, node: Node<NodeData>) => {
			event.preventDefault();
			setContextNode(node);
			show({ event });
			setSelectedNode(node);
			setIsDrawerOpen(true);
		},
		[show]
	);

	const onPaneContextMenu = useCallback((event: MouseEvent | React.MouseEvent) => {
		event.preventDefault();
		setIsDrawerOpen(false);
		setSelectedNode(null);
	}, []);

	const updateNodeData = useCallback(
		(newData: Partial<NodeData>) => {
			if (selectedNode) {
				setNodes((nds) =>
					nds.map((node) =>
						node.id === selectedNode.id ? { ...node, data: { ...node.data, ...newData } } : node
					)
				);
			}
		},
		[selectedNode, setNodes]
	);

	// Filter nodes and edges based on selected dataset
	const filteredNodes =
		selectedDataset === 'all' ? nodes : nodes.filter((node) => node.id.startsWith(selectedDataset));

	const filteredEdges =
		selectedDataset === 'all'
			? edges
			: edges.filter(
					(edge) =>
						edge.source.startsWith(selectedDataset) || edge.target.startsWith(selectedDataset)
				);

	// Simulate async transform call (like a real API)
	const runTransform = (node: Node<NodeData>) => {
		const transform = TRANSFORMS[node.data.type];
		if (!transform) return;
		// Simulate network delay (1 second)
		setTimeout(() => {
			const { nodes: newNodes, edges: newEdges } = transform.run({
				...node.data,
				id: node.id,
				x: node.position.x,
				y: node.position.y
			});
			setNodes((nds) => [
				...nds,
				...newNodes.filter((n) => !nds.some((existing) => existing.id === n.id))
			]);
			setEdges((eds) => [
				...eds,
				...newEdges.filter((e) => !eds.some((existing) => existing.id === e.id))
			]);
		}, 1000);
		// In the future, replace setTimeout with a real API call here
	};

	return (
		<div className="flex h-full w-full flex-grow-1 flex-col gap-3 md:flex-row">
			<Button className="block md:hidden" size="sm" variant="flat" onClick={toggleTabSelector}>
				View Datasets
			</Button>
			{/* Vertical Tab Selector */}
			<div
				className={`h-screen-visible top-header-height fixed left-0 z-999 flex w-full -translate-x-full transform flex-col gap-3 border bg-white p-4 transition-transform duration-300 ease-in-out md:static md:z-0 md:h-full md:w-48 md:translate-x-0 md:bg-transparent dark:border-gray-700 dark:bg-gray-800 md:dark:bg-transparent ${
					openTabSelector ? 'translate-x-0' : ''
				}`}
			>
				<Button2 className="md:hidden" size="icon" variant="outline" onClick={toggleTabSelector}>
					<X className="size-4" />
				</Button2>

				<Button
					size="sm"
					variant={selectedDataset === 'all' ? 'outline' : 'flat'}
					onClick={() => setSelectedDataset('all')}
				>
					View All
				</Button>
				<Button
					size="sm"
					variant={selectedDataset === 'circle1' ? 'outline' : 'flat'}
					onClick={() => setSelectedDataset('circle1')}
				>
					Circle 1
				</Button>
				<Button
					size="sm"
					variant={selectedDataset === 'circle2' ? 'outline' : 'flat'}
					onClick={() => setSelectedDataset('circle2')}
				>
					Circle 2
				</Button>
				<Button
					size="sm"
					variant={selectedDataset === 'circle3' ? 'outline' : 'flat'}
					onClick={() => setSelectedDataset('circle3')}
				>
					Circle 3
				</Button>
			</div>

			{/* Graph View */}
			<div className="relative flex-grow border dark:border-gray-700">
				<div className="absolute top-2 right-4 z-10">
					<p className="text-xs text-gray-500 italic">Right click node for properties</p>
				</div>

				<ReactFlow
					nodes={filteredNodes.map((node) => ({
						...node,
						data: {
							...node.data,
							type: typeof node.data.type === 'string' ? node.data.type : 'Unknown',
							icon: ENTITY_ICONS[typeof node.data.type === 'string' ? node.data.type : 'Unknown']
						}
					}))}
					edges={filteredEdges}
					onNodesChange={onNodesChange}
					onEdgesChange={onEdgesChange}
					onConnect={onConnect}
					onNodeContextMenu={onNodeContextMenu}
					onPaneContextMenu={onPaneContextMenu}
					nodesDraggable={true}
					fitView
					minZoom={0.1}
					maxZoom={2}
					edgeTypes={edgeTypes}
					connectionLineComponent={FloatingConnectionLine}
					colorMode={theme}
				>
					<Background />
					{!isMobile && (
						<>
							<MiniMap />
							<Controls />
						</>
					)}
				</ReactFlow>
				{/* Context Menu for Transforms */}
				<Menu id={MENU_ID} theme="light">
					{contextNode && TRANSFORMS[contextNode.data.type] ? (
						<Item onClick={() => runTransform(contextNode!)}>
							{`Run: ${TRANSFORMS[contextNode.data.type].name}`}
						</Item>
					) : (
						<Item disabled>No transforms available</Item>
					)}
				</Menu>
				{/* Slide-out Drawer */}
				<div
					className={`h-screen-visible top-header-height fixed right-0 z-999 w-80 transform bg-white shadow-lg transition-transform duration-300 ease-in-out dark:border-gray-700 dark:bg-gray-800 ${
						isDrawerOpen ? 'translate-x-0' : 'translate-x-full'
					}`}
				>
					<div className="p-4">
						<div className="mb-4 flex items-center justify-between">
							<h2 className="text-lg font-semibold">Node Properties</h2>
							<button
								onClick={() => {
									setIsDrawerOpen(false);
									setSelectedNode(null);
								}}
								className="group rounded-full p-2 transition-colors duration-200 hover:bg-gray-100"
								title="Close"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									className="h-5 w-5 text-gray-500 group-hover:text-gray-700 dark:text-gray-400 group-hover:dark:text-gray-900"
									viewBox="0 0 20 20"
									fill="currentColor"
								>
									<path
										fillRule="evenodd"
										d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
										clipRule="evenodd"
									/>
								</svg>
							</button>
						</div>
						{selectedNode && (
							<div className="space-y-4">
								<div className="flex w-full items-center gap-2">
									{ENTITY_ICONS[selectedNode.data.type]}
									<span className="font-bold">{selectedNode.data.type}</span>
								</div>
								{Object.entries(selectedNode.data).map(
									([key, value]) =>
										key !== 'icon' &&
										key !== 'type' && (
											<div key={key}>
												<Label>{key.charAt(0).toUpperCase() + key.slice(1)}</Label>
												<Input
													type="text"
													value={value as string}
													onChange={(e) => updateNodeData({ [key]: e.target.value })}
												/>
											</div>
										)
								)}
								{/* List available transforms */}
								{TRANSFORMS[selectedNode.data.type] && (
									<Button variant="outline" onClick={() => runTransform(selectedNode!)}>
										{`Run: ${TRANSFORMS[selectedNode.data.type].name}`}
									</Button>
								)}
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};

export default NodeAsHandleFlow;
