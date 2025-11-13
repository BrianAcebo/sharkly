/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useState, useEffect, useMemo } from 'react';
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
import {
	User,
	Globe,
	Server,
	Building2,
	Coins,
	Pencil,
	Link2,
	Trash2,
	ExternalLink,
	Mail,
	AlertCircle,
	Home,
	Phone,
	ImageIcon,
	FileIcon,
	HelpCircle
} from 'lucide-react';

import '@xyflow/react/dist/style.css';
import '../../../../xy-theme.css';

import FloatingEdge from './FloatingEdge';
import FloatingConnectionLine from './FloatingConnectionLine';
import { initialElements } from './initialElements';
import { Button } from '../../ui/button';
import { Button as Button2 } from '../../ui/button';
import { useTheme } from '../../../hooks/useTheme';
// import { Input } from '../../ui/input';
import Label from '../../form/Label';
import { X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { getActionCost, ENABLE_ACTION_FLAGS, ActionKey } from '../../../constants/costs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';
import { Textarea } from '../../ui/textarea';
import { supabase } from '../../../utils/supabaseClient';

const { nodes: defaultNodes, edges: defaultEdges } = initialElements();

const edgeTypes = {
	floating: FloatingEdge
};

// Entity type to icon mapping
const ENTITY_ICONS: Record<string, React.ReactNode> = {
	Person: <User className="mr-1 inline-block" size={16} />,
	Domain: <Globe className="mr-1 inline-block" size={16} />,
	'IP Address': <Server className="mr-1 inline-block" size={16} />,
	Company: <Building2 className="mr-1 inline-block" size={16} />,
	Email: <Mail className="mr-1 inline-block" size={16} />,
	Phone: <Phone className="mr-1 inline-block" size={16} />,
	Username: <User className="mr-1 inline-block" size={16} />,
	Image: <ImageIcon className="mr-1 inline-block" size={16} />,
	Document: <FileIcon className="mr-1 inline-block" size={16} />,
	Property: <Home className="mr-1 inline-block" size={16} />,
	Leak: <AlertCircle className="mr-1 inline-block" size={16} />,
	'Social Profile': <User className="mr-1 inline-block" size={16} />,
	Unknown: <HelpCircle className="mr-1 inline-block" size={16} />
};

// If you see a type error for 'react-contexify', install types with:
// npm install --save-dev @types/react-contexify

// (legacy transform types and registry removed)

// Update NodeData type
type NodeData = {
	label: string;
	type: string;
	entityId?: string;
	slugType?: import('../../../types/entities').EntityType;
	[key: string]: unknown;
};

const MENU_ID = 'node-context-menu';

type ProvidedNode = Node<NodeData>;
type ProvidedEdge = Edge<NodeData>;

export default function FloatingEdgesGraph(props: {
	nodes?: ProvidedNode[];
	edges?: ProvidedEdge[];
}) {
	// If props are provided (even empty arrays), honor them. Fall back to defaults only when undefined.
	const startNodes = props.nodes !== undefined ? props.nodes : defaultNodes;
	const startEdges = props.edges !== undefined ? props.edges : defaultEdges;

	const [nodes, setNodes, onNodesChange] = useNodesState(startNodes);
	const [edges, setEdges, onEdgesChange] = useEdgesState(startEdges);
	// keep component name for devtools (removed alias to satisfy linter)
	const { theme } = useTheme();

	const [selectedNode, setSelectedNode] = useState<Node<NodeData> | null>(null);
	const [contextNode, setContextNode] = useState<Node<NodeData> | null>(null);
	const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
	const [openTabSelector, setOpenTabSelector] = useState<boolean>(false);
	const [isMobile, setIsMobile] = useState<boolean>(false);
	const { show } = useContextMenu({ id: MENU_ID });
	const [recordLoading, setRecordLoading] = useState<boolean>(false);
	const [nodeRecord, setNodeRecord] = useState<unknown | null>(null);
	const [imageSrc, setImageSrc] = useState<string | null>(null);
	const [docSignedUrl, setDocSignedUrl] = useState<string | null>(null);
	const [editOpen, setEditOpen] = useState(false);
	const [ef, setEf] = useState<Record<string, string>>({});
	const [savingEdit, setSavingEdit] = useState(false);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const [creatingOpen, setCreatingOpen] = useState(false);
	const [createType, setCreateType] = useState<
		| 'email'
		| 'phone'
		| 'username'
		| 'social_profile'
		| 'image'
		| 'domain'
		| 'document'
		| 'property'
		| 'ip'
	>('email');
	const [createValue, setCreateValue] = useState<string>('');
	const [creating, setCreating] = useState(false);
	const [searchQuery, setSearchQuery] = useState('');
	const [searching, setSearching] = useState(false);
	const [searchResults, setSearchResults] = useState<Array<{ id: string; label: string }>>([]);
	const [attaching, setAttaching] = useState(false);
	// helpers
	const updateCurrent = useCallback(async () => {
		if (!selectedNode) return;
		const t = (selectedNode.data as NodeData).slugType;
		const id = (selectedNode.data as NodeData).entityId!;
		// payload built inline per type; no generic payload needed here
		setSavingEdit(true);
		try {
			if (t === 'person') {
				const m = await import('../../../api/people');
				if ((m as any).updatePerson)
					await (m as any).updatePerson(id, {
						name: { first: ef.first || null, last: ef.last || null },
						confidence: ef.confidence ? Number(ef.confidence) : null
					});
			} else if (t === 'business') {
				const m = await import('../../../api/businesses');
				if ((m as any).updateBusiness)
					await (m as any).updateBusiness(id, {
						name: ef.name || null,
						ein_tax_id: ef.ein || null
					});
			} else if (t === 'email') {
				const m = await import('../../../api/emails');
				if ((m as any).updateEmail)
					await (m as any).updateEmail(id, { address: ef.address || null });
			} else if (t === 'phone') {
				const m = await import('../../../api/phones');
				if ((m as any).updatePhone)
					await (m as any).updatePhone(id, {
						number_e164: ef.number_e164 || null,
						carrier: ef.carrier || null,
						line_type: ef.line_type || null
					});
			} else if (t === 'username') {
				const m = await import('../../../api/usernames');
				if ((m as any).updateUsername)
					await (m as any).updateUsername(id, { username: { value: ef.value || '' } });
			} else if (t === 'social_profile') {
				const m = await import('../../../api/social_profiles');
				if ((m as any).updateSocialProfile)
					await (m as any).updateSocialProfile(id, {
						profile: {
							platform: ef.platform || '',
							handle: ef.handle || '',
							profile_url: ef.profile_url || null,
							display_name: ef.display_name || null,
							bio: ef.bio || null
						}
					});
			} else if (t === 'image') {
				const m = await import('../../../api/images');
				if ((m as any).updateImage)
					await (m as any).updateImage(id, {
						title: ef.title || null,
						description: ef.description || null
					});
			} else if (t === 'domain') {
				const m = await import('../../../api/domains');
				if ((m as any).updateDomain) await (m as any).updateDomain(id, { name: ef.name || '' });
			} else if (t === 'document') {
				const m = await import('../../../api/documents');
				if ((m as any).updateDocument)
					await (m as any).updateDocument(id, {
						doc: { type: (ef.doc_type as any) || 'other' },
						metadata: { author: ef.author || null, date: ef.date || null },
						source_url: ef.source_url || null,
						text: ef.text || null
					});
			} else if (t === 'property') {
				const m = await import('../../../api/properties');
				if ((m as any).updateProperty)
					await (m as any).updateProperty(id, { address_full: ef.address_full || null });
			} else if (t === 'ip') {
				const m = await import('../../../api/ips');
				if ((m as any).updateIP)
					await (m as any).updateIP(id, {
						ip: { address: ef.address || null },
						asn: ef.asn || null,
						organization: ef.organization || null
					});
			}
			toast.success('Updated.');
			setEditOpen(false);
			// refresh record
			setSelectedNode({ ...selectedNode });
		} catch (e) {
			console.error(e);
			toast.error('Update failed.');
		} finally {
			setSavingEdit(false);
		}
	}, [
		selectedNode,
		ef.first,
		ef.last,
		ef.confidence,
		ef.name,
		ef.ein,
		ef.address,
		ef.number_e164,
		ef.carrier,
		ef.line_type,
		ef.value,
		ef.platform,
		ef.handle,
		ef.profile_url,
		ef.display_name,
		ef.bio,
		ef.title,
		ef.description,
		ef.doc_type,
		ef.author,
		ef.date,
		ef.source_url,
		ef.text,
		ef.address_full,
		ef.asn,
		ef.organization
	]);

	const deleteCurrent = useCallback(async () => {
		if (!selectedNode) return;
		const t = (selectedNode.data as NodeData).slugType;
		const id = (selectedNode.data as NodeData).entityId!;
		try {
			if (t === 'person') {
				const m = await import('../../../api/people');
				if ((m as any).deletePerson) await (m as any).deletePerson(id);
			} else if (t === 'business') {
				const m = await import('../../../api/businesses');
				if ((m as any).deleteBusiness) await (m as any).deleteBusiness(id);
			} else if (t === 'email') {
				const m = await import('../../../api/emails');
				if ((m as any).deleteEmail) await (m as any).deleteEmail(id);
			} else if (t === 'phone') {
				const m = await import('../../../api/phones');
				if ((m as any).deletePhone) await (m as any).deletePhone(id);
			} else if (t === 'username') {
				const m = await import('../../../api/usernames');
				if ((m as any).deleteUsername) await (m as any).deleteUsername(id);
			} else if (t === 'social_profile') {
				const m = await import('../../../api/social_profiles');
				if ((m as any).deleteSocialProfile) await (m as any).deleteSocialProfile(id);
			} else if (t === 'image') {
				const m = await import('../../../api/images');
				if ((m as any).deleteImage) await (m as any).deleteImage(id);
			} else if (t === 'domain') {
				const m = await import('../../../api/domains');
				if ((m as any).deleteDomain) await (m as any).deleteDomain(id);
			} else if (t === 'document') {
				const m = await import('../../../api/documents');
				if ((m as any).deleteDocument) await (m as any).deleteDocument(id);
			} else if (t === 'property') {
				const m = await import('../../../api/properties');
				if ((m as any).deleteProperty) await (m as any).deleteProperty(id);
			} else if (t === 'ip') {
				const m = await import('../../../api/ips');
				if ((m as any).deleteIP) await (m as any).deleteIP(id);
			}
			toast.success('Deleted.');
			setDeleteOpen(false);
			setIsDrawerOpen(false);
			// remove from current graph
			setNodes((nds) => nds.filter((n) => n.id !== `${t}:${id}`));
			setEdges((eds) => eds.filter((e) => e.source !== `${t}:${id}` && e.target !== `${t}:${id}`));
		} catch (e) {
			console.error(e);
			toast.error('Delete failed.');
		}
	}, [selectedNode, setNodes, setEdges]);

	const allowedCreateFor = useCallback((ownerType: NodeData['slugType']) => {
		switch (ownerType) {
			case 'person':
				return [
					'email',
					'phone',
					'username',
					'social_profile',
					'image',
					'document',
					'property'
				] as const;
			case 'business':
				return ['domain', 'document'] as const;
			case 'email':
				return ['social_profile', 'username', 'domain'] as const;
			case 'domain':
				return ['ip'] as const;
			case 'social_profile':
				return ['email', 'username', 'image'] as const;
			case 'property':
				return ['image', 'document'] as const;
			case 'username':
				return ['email', 'social_profile', 'image'] as const;
			default:
				return ['image', 'document'] as const;
		}
	}, []);

	const createAndLink = useCallback(async () => {
		if (!selectedNode) return;
		const ownerType = (selectedNode.data as NodeData).slugType!;
		const ownerId = (selectedNode.data as NodeData).entityId!;
		const orgId = (pickValue(nodeRecord, ['organization_id']) as string | undefined) ?? '';
		setCreating(true);
		try {
			let newId = '';
			if (createType === 'email') {
				const m = await import('../../../api/emails');
				const created = await (m as any).createEmail({
					organization_id: orgId,
					address: createValue
				});
				newId = created?.id ?? created?.email?.id ?? created?.email_id ?? '';
				if (ownerType === 'person') {
					const people = await import('../../../api/people');
					await (people as any).addEmailToPerson(ownerId, orgId, {
						id: newId,
						email: { address: createValue }
					});
				} else if (ownerType === 'username') {
					const u = await import('../../../api/usernames');
					await (u as any).attachEmailToUsername(ownerId, newId, {
						transform_type: 'manual_create'
					});
				} else if (ownerType === 'social_profile') {
					const p = await import('../../../api/social_profiles');
					await (p as any).attachProfileToEmail(ownerId, newId, {
						transform_type: 'manual_create'
					});
				}
			} else if (createType === 'phone') {
				const m = await import('../../../api/phones');
				const created = await (m as any).createPhone({
					organization_id: orgId,
					number_e164: createValue,
					line_type: 'unknown',
					messaging_apps: [],
					spam_reports: 0
				});
				newId = created?.id ?? '';
				if (ownerType === 'person') {
					await (m as any).attachPhoneToPerson(newId, ownerId, { transform_type: 'manual_create' });
				}
			} else if (createType === 'username') {
				const m = await import('../../../api/usernames');
				const created = await (m as any).createUsername({
					organization_id: orgId,
					username: { value: createValue }
				});
				newId = created?.id ?? '';
				if (ownerType === 'email') {
					await (m as any).attachEmailToUsername(ownerId, newId, {
						transform_type: 'manual_create'
					});
				} else if (ownerType === 'social_profile') {
					const p = await import('../../../api/social_profiles');
					await (p as any).attachProfileToUsername(ownerId, newId, {
						transform_type: 'manual_create'
					});
				}
			} else if (createType === 'domain') {
				const m = await import('../../../api/domains');
				const created = await (m as any).createDomain({
					organization_id: orgId,
					name: createValue
				});
				newId = created?.id ?? '';
				if (ownerType === 'business') {
					await (m as any).attachDomainToBusiness(ownerId, newId, {
						transform_type: 'manual_create'
					});
				} else if (ownerType === 'email') {
					await (m as any).attachEmailToDomain(ownerId, newId, { transform_type: 'manual_create' });
				}
			} else if (createType === 'ip') {
				const m = await import('../../../api/ips');
				const created = await (m as any).createIP({
					organization_id: orgId,
					ip: { address: createValue }
				});
				newId = created?.id ?? '';
				if (ownerType === 'domain') {
					await (m as any).attachIPToDomain(newId, ownerId, { transform_type: 'manual_create' });
				}
			} else if (createType === 'image') {
				const m = await import('../../../api/images');
				const created = await (m as any).createImage({
					organization_id: orgId,
					url: createValue,
					source: 'url'
				});
				newId = created?.id ?? '';
				if (ownerType === 'person') {
					await (m as any).attachImageToPerson(newId, ownerId, { transform_type: 'manual_create' });
				} else if (ownerType === 'social_profile') {
					await (m as any).attachImageToProfile(newId, ownerId, {
						transform_type: 'manual_create'
					});
				} else if (ownerType === 'username') {
					await (m as any).attachImageToUsername(newId, ownerId, {
						transform_type: 'manual_create'
					});
				} else if (ownerType === 'property') {
					await (m as any).attachImageToProperty(newId, ownerId, {
						transform_type: 'manual_create'
					});
				}
			} else if (createType === 'document') {
				const m = await import('../../../api/documents');
				const created = await (m as any).createDocument({
					organization_id: orgId,
					doc: { type: 'other' },
					source_url: createValue
				});
				newId = created?.id ?? '';
				if (ownerType === 'person') {
					await (m as any).attachDocumentToPerson(newId, ownerId, {
						transform_type: 'manual_create'
					});
				} else if (ownerType === 'property') {
					await (m as any).attachDocumentToProperty(newId, ownerId, {
						transform_type: 'manual_create'
					});
				} else if (ownerType === 'business') {
					await (m as any).attachDocumentToBusiness(newId, ownerId, {
						transform_type: 'manual_create'
					});
				}
			} else if (createType === 'property') {
				const m = await import('../../../api/properties');
				const created = (m as any).createProperty
					? await (m as any).createProperty({ organization_id: orgId, address_full: createValue })
					: null;
				newId = created?.id ?? '';
				if (newId && ownerType === 'person') {
					await (m as any).attachPropertyToPerson(newId, ownerId, {
						transform_type: 'manual_create'
					});
				}
			}
			if (newId) {
				toast.success('Created and linked.');
				setCreatingOpen(false);
				// reflect in graph (adds node and edge)
				const newNodeId = `${createType}:${newId}`;
				setNodes((nds) =>
					nds.some((n) => n.id === newNodeId)
						? nds
						: nds.concat({
								id: newNodeId,
								type: 'default',
								position: { x: 200, y: 0 },
								data: {
									label: `${createType}: ${newId.slice(0, 6)}…`,
									type: createType,
									slugType: createType,
									entityId: newId
								}
							} as any)
				);
				const ownerNodeId = `${ownerType}:${ownerId}`;
				setEdges((eds) =>
					eds.concat({
						id: `${ownerNodeId}__${newNodeId}`,
						source: ownerNodeId,
						target: newNodeId,
						type: 'floating'
					} as any)
				);
			} else {
				toast.error('Create failed.');
			}
		} catch (e) {
			console.error(e);
			toast.error('Create/link failed.');
		} finally {
			setCreating(false);
		}
	}, [selectedNode, createType, createValue, nodeRecord, setNodes, setEdges]);

	const runSearchExisting = useCallback(async () => {
		if (!selectedNode) return;
		const orgId = (pickValue(nodeRecord, ['organization_id']) as string | undefined) ?? '';
		const q = searchQuery.trim();
		if (!orgId || q.length < 2) {
			setSearchResults([]);
			return;
		}
		setSearching(true);
		try {
			let results: Array<{ id: string; label: string }> = [];
			if (createType === 'email') {
				const m = await import('../../../api/emails');
				const rows = await (m as any).searchEmails(orgId, q, 10);
				results = (rows || []).map((r: any) => ({
					id: r.id,
					label: r.address || r?.email?.address || ''
				}));
			} else if (createType === 'phone') {
				const m = await import('../../../api/phones');
				const rows = await (m as any).searchPhones(orgId, q, 10);
				results = (rows || []).map((r: any) => ({
					id: r.id,
					label: r.number_e164 || r?.phone?.number_e164 || ''
				}));
			} else if (createType === 'username') {
				const m = await import('../../../api/usernames');
				const rows = await (m as any).searchUsernames(orgId, q, 10);
				results = (rows || []).map((r: any) => ({
					id: r.id,
					label: `@${r.value || r?.username?.value || ''}`
				}));
			} else if (createType === 'social_profile') {
				const m = await import('../../../api/social_profiles');
				const rows = await (m as any).searchSocialProfiles(orgId, q, 10);
				results = (rows || []).map((r: any) => ({
					id: r.id,
					label: `${r.platform} · @${r.handle}`
				}));
			} else if (createType === 'image') {
				const m = await import('../../../api/images');
				const rows = await (m as any).searchImages(orgId, q, 10);
				results = (rows || []).map((r: any) => ({ id: r.id, label: r.url || r.title || '' }));
			} else if (createType === 'domain') {
				const m = await import('../../../api/domains');
				const rows = await (m as any).searchDomains(orgId, q, 10);
				results = (rows || []).map((r: any) => ({ id: r.id, label: r.name || '' }));
			} else if (createType === 'document') {
				const m = await import('../../../api/documents');
				const rows = await (m as any).searchDocuments(orgId, q, 10);
				results = (rows || []).map((r: any) => ({
					id: r.id,
					label: r.title || r?.metadata?.author || r?.source_url || ''
				}));
			} else if (createType === 'ip') {
				const m = await import('../../../api/ips');
				const rows = await (m as any).searchIPs(orgId, q, 10);
				results = (rows || []).map((r: any) => ({
					id: r.id,
					label: r.address || r?.ip?.address || ''
				}));
			} else {
				results = [];
			}
			setSearchResults(results);
		} catch (e) {
			console.error('Search failed', e);
			setSearchResults([]);
		} finally {
			setSearching(false);
		}
	}, [selectedNode, nodeRecord, createType, searchQuery]);

	const attachExisting = useCallback(
		async (targetId: string) => {
			if (!selectedNode) return;
			setAttaching(true);
			try {
				const ownerType = (selectedNode.data as NodeData).slugType!;
				const ownerId = (selectedNode.data as NodeData).entityId!;
				if (createType === 'email') {
					if (ownerType === 'person') {
						const m = await import('../../../api/people');
						await (m as any).addEmailToPerson(
							ownerId,
							(pickValue(nodeRecord, ['organization_id']) as string) ?? '',
							{ id: targetId }
						);
					} else if (ownerType === 'username') {
						const m = await import('../../../api/usernames');
						await (m as any).attachEmailToUsername(ownerId, targetId, {
							transform_type: 'manual_link'
						});
					} else if (ownerType === 'social_profile') {
						const m = await import('../../../api/social_profiles');
						await (m as any).attachProfileToEmail(ownerId, targetId, {
							transform_type: 'manual_link'
						});
					}
				} else if (createType === 'phone') {
					if (ownerType === 'person') {
						const m = await import('../../../api/phones');
						await (m as any).attachPhoneToPerson(targetId, ownerId, {
							transform_type: 'manual_link'
						});
					}
				} else if (createType === 'username') {
					if (ownerType === 'email') {
						const m = await import('../../../api/usernames');
						await (m as any).attachEmailToUsername(ownerId, targetId, {
							transform_type: 'manual_link'
						});
					} else if (ownerType === 'social_profile') {
						const m = await import('../../../api/social_profiles');
						await (m as any).attachProfileToUsername(ownerId, targetId, {
							transform_type: 'manual_link'
						});
					}
				} else if (createType === 'social_profile') {
					const m = await import('../../../api/social_profiles');
					if (ownerType === 'person')
						await (m as any).attachProfileToPerson(ownerId, targetId, {
							transform_type: 'manual_link'
						});
					else if (ownerType === 'email')
						await (m as any).attachProfileToEmail(ownerId, targetId, {
							transform_type: 'manual_link'
						});
					else if (ownerType === 'phone')
						await (m as any).attachProfileToPhone(ownerId, targetId, {
							transform_type: 'manual_link'
						});
					else if (ownerType === 'username')
						await (m as any).attachProfileToUsername(ownerId, targetId, {
							transform_type: 'manual_link'
						});
				} else if (createType === 'image') {
					const m = await import('../../../api/images');
					if (ownerType === 'person')
						await (m as any).attachImageToPerson(targetId, ownerId, {
							transform_type: 'manual_link'
						});
					else if (ownerType === 'social_profile')
						await (m as any).attachImageToProfile(targetId, ownerId, {
							transform_type: 'manual_link'
						});
					else if (ownerType === 'username')
						await (m as any).attachImageToUsername(targetId, ownerId, {
							transform_type: 'manual_link'
						});
					else if (ownerType === 'property')
						await (m as any).attachImageToProperty(targetId, ownerId, {
							transform_type: 'manual_link'
						});
				} else if (createType === 'domain') {
					const m = await import('../../../api/domains');
					if (ownerType === 'business')
						await (m as any).attachDomainToBusiness(ownerId, targetId, {
							transform_type: 'manual_link'
						});
					else if (ownerType === 'email')
						await (m as any).attachEmailToDomain(ownerId, targetId, {
							transform_type: 'manual_link'
						});
				} else if (createType === 'ip') {
					if (ownerType === 'domain') {
						const m = await import('../../../api/ips');
						await (m as any).attachIPToDomain(targetId, ownerId, { transform_type: 'manual_link' });
					}
				} else if (createType === 'document') {
					const m = await import('../../../api/documents');
					if (ownerType === 'person')
						await (m as any).attachDocumentToPerson(targetId, ownerId, {
							transform_type: 'manual_link'
						});
					else if (ownerType === 'property')
						await (m as any).attachDocumentToProperty(targetId, ownerId, {
							transform_type: 'manual_link'
						});
					else if (ownerType === 'business')
						await (m as any).attachDocumentToBusiness(targetId, ownerId, {
							transform_type: 'manual_link'
						});
				}
				toast.success('Linked.');
				setCreatingOpen(false);
			} catch (e) {
				console.error('Attach failed', e);
				toast.error('Failed to link.');
			} finally {
				setAttaching(false);
			}
		},
		[selectedNode, createType, nodeRecord]
	);
	const truncate = useCallback((v?: string | null, n = 60) => {
		if (!v) return '—';
		return v.length > n ? `${v.slice(0, n - 1)}…` : v;
	}, []);
	const isHttp = (u?: string | null) => typeof u === 'string' && /^https?:\/\//i.test(u);
	// Hoisted helper to safely access nested properties
	function pickValue(obj: unknown, path: string[]): unknown {
		let cur: unknown = obj;
		for (const key of path) {
			if (typeof cur === 'object' && cur !== null && key in (cur as Record<string, unknown>)) {
				cur = (cur as Record<string, unknown>)[key];
			} else {
				return undefined;
			}
		}
		return cur;
	}

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

	// Sync internal nodes/edges when props change to avoid showing mock defaults
	useEffect(() => {
		if (props.nodes !== undefined) {
			setNodes(props.nodes as ProvidedNode[]);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [props.nodes && (props.nodes as ProvidedNode[]).map((n) => n.id).join('|')]);
	useEffect(() => {
		if (props.edges !== undefined) {
			setEdges(props.edges as ProvidedEdge[]);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [props.edges && (props.edges as ProvidedEdge[]).map((e) => e.id).join('|')]);

	// Load full record for the selected node to show rich detail
	useEffect(() => {
		let cancelled = false;
		async function run() {
			if (!selectedNode) {
				setNodeRecord(null);
				return;
			}
			const data = selectedNode.data as NodeData;
			const id = data.entityId;
			const t = data.slugType;
			if (!id || !t) {
				setNodeRecord(null);
				return;
			}
			setRecordLoading(true);
			try {
				let rec: unknown | null = null;
				if (t === 'person') {
					const mod = await import('../../../api/people');
					rec = await mod.getPersonById(id);
				} else if (t === 'business') {
					const mod = await import('../../../api/businesses');
					rec = await mod.getBusinessById(id);
				} else if (t === 'email') {
					const mod = await import('../../../api/emails');
					rec = await mod.getEmailById(id);
				} else if (t === 'phone') {
					const mod = await import('../../../api/phones');
					rec = await mod.getPhoneById(id);
				} else if (t === 'username') {
					const mod = await import('../../../api/usernames');
					rec = await mod.getUsernameById(id);
				} else if (t === 'social_profile') {
					const mod = await import('../../../api/social_profiles');
					rec = await mod.getSocialProfileById(id);
				} else if (t === 'image') {
					const mod = await import('../../../api/images');
					rec = await mod.getImageById(id);
				} else if (t === 'domain') {
					const mod = await import('../../../api/domains');
					rec = await mod.getDomainById(id);
				} else if (t === 'property') {
					const mod = await import('../../../api/properties');
					rec = await mod.getPropertyById?.(id);
				} else if (t === 'document') {
					const mod = await import('../../../api/documents');
					rec = await mod.getDocumentById(id);
				} else if (t === 'ip') {
					const mod = await import('../../../api/ips');
					rec = await mod.getIPById(id);
				}
				if (!cancelled) setNodeRecord(rec);
				// If image, sign path if needed
				if (!cancelled && t === 'image') {
					const url: string | undefined =
						(pickValue(rec, ['url']) as string | undefined) ??
						(pickValue(rec, ['image', 'url']) as string | undefined) ??
						(pickValue(rec, ['path']) as string | undefined);
					if (!url) {
						setImageSrc(null);
					} else if (isHttp(url)) {
						setImageSrc(url);
					} else {
						try {
							const resp = await fetch('/api/images/sign-url', {
								method: 'POST',
								headers: { 'Content-Type': 'application/json' },
								body: JSON.stringify({ path: url, expiresIn: 600 })
							});
							if (resp.ok) {
								const j = await resp.json();
								setImageSrc(j?.signedUrl ?? null);
							} else {
								setImageSrc(null);
							}
						} catch {
							setImageSrc(null);
						}
					}
				} else if (!cancelled) {
					setImageSrc(null);
				}
				// Document: sign source_url if it is a storage path (evidence bucket)
				if (!cancelled && t === 'document') {
					const srcUrl = (pickValue(rec, ['source_url']) as string | undefined) ?? '';
					if (!srcUrl) {
						setDocSignedUrl(null);
					} else if (isHttp(srcUrl)) {
						setDocSignedUrl(srcUrl);
					} else {
						try {
							const { data, error } = await supabase.storage
								.from('evidence')
								.createSignedUrl(srcUrl, 600);
							setDocSignedUrl(error ? null : (data?.signedUrl ?? null));
						} catch {
							setDocSignedUrl(null);
						}
					}
				} else if (!cancelled) {
					setDocSignedUrl(null);
				}
			} catch (e) {
				console.error('Failed to load node record', e);
				if (!cancelled) setNodeRecord(null);
			} finally {
				if (!cancelled) setRecordLoading(false);
			}
		}
		void run();
		return () => {
			cancelled = true;
		};
	}, [selectedNode]);

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
			// Right-click should NOT open the drawer; actions only
		},
		[show]
	);

	const onNodeClick = useCallback(
		(_: React.MouseEvent, node: Node<NodeData>) => {
			setSelectedNode(node);
			setIsDrawerOpen(true);
			// seed edit form from record
			const t = (node.data as NodeData).slugType;
			const rec = nodeRecord;
			if (!t || !rec) {
				setEf({});
				return;
			}
			if (t === 'person') {
				setEf({
					first: (pickValue(rec, ['name', 'first']) as string) || '',
					last: (pickValue(rec, ['name', 'last']) as string) || '',
					confidence: String(pickValue(rec, ['confidence']) ?? '')
				});
			} else if (t === 'business') {
				setEf({
					name: String(pickValue(rec, ['name']) ?? ''),
					ein: String(pickValue(rec, ['ein_tax_id']) ?? '')
				});
			} else if (t === 'email') {
				setEf({
					address: String(
						(pickValue(rec, ['email', 'address']) as string) ??
							(pickValue(rec, ['address']) as string) ??
							''
					)
				});
			} else if (t === 'phone') {
				setEf({
					number_e164: String(
						(pickValue(rec, ['phone', 'number_e164']) as string) ??
							(pickValue(rec, ['number_e164']) as string) ??
							''
					),
					carrier: String(pickValue(rec, ['carrier']) ?? ''),
					line_type: String(pickValue(rec, ['line_type']) ?? '')
				});
			} else if (t === 'username') {
				setEf({ value: String((pickValue(rec, ['username', 'value']) as string) ?? '') });
			} else if (t === 'social_profile') {
				setEf({
					platform: String(pickValue(rec, ['profile', 'platform']) ?? ''),
					handle: String(pickValue(rec, ['profile', 'handle']) ?? ''),
					profile_url: String(pickValue(rec, ['profile', 'profile_url']) ?? ''),
					display_name: String(pickValue(rec, ['profile', 'display_name']) ?? ''),
					bio: String(pickValue(rec, ['profile', 'bio']) ?? '')
				});
			} else if (t === 'image') {
				setEf({
					title: String(pickValue(rec, ['title']) ?? ''),
					description: String(pickValue(rec, ['description']) ?? '')
				});
			} else if (t === 'domain') {
				setEf({ name: String(pickValue(rec, ['name']) ?? '') });
			} else if (t === 'document') {
				setEf({
					doc_type: String(pickValue(rec, ['doc', 'type']) ?? 'other'),
					author: String(pickValue(rec, ['metadata', 'author']) ?? ''),
					date: String(pickValue(rec, ['metadata', 'date']) ?? ''),
					source_url: String(pickValue(rec, ['source_url']) ?? ''),
					text: String(pickValue(rec, ['text']) ?? '')
				});
			} else if (t === 'property') {
				setEf({ address_full: String(pickValue(rec, ['address_full']) ?? '') });
			} else if (t === 'ip') {
				setEf({
					address: String(
						(pickValue(rec, ['ip', 'address']) as string) ??
							(pickValue(rec, ['address']) as string) ??
							''
					),
					asn: String(pickValue(rec, ['asn']) ?? ''),
					organization: String(pickValue(rec, ['organization']) ?? '')
				});
			} else {
				setEf({});
			}
		},
		[nodeRecord]
	);

	const onPaneContextMenu = useCallback((event: MouseEvent | React.MouseEvent) => {
		event.preventDefault();
		setIsDrawerOpen(false);
		setSelectedNode(null);
	}, []);

	// inline node editing removed for this view

	// Menu-style focus: find root (position 0,0) and organize neighbors by hop
	const rootNode = useMemo(
		() => nodes.find((n) => Math.abs(n.position.x) < 1e-3 && Math.abs(n.position.y) < 1e-3) || null,
		[nodes]
	);
	const adjacency = useMemo(() => {
		const map = new Map<string, Set<string>>();
		for (const edge of edges) {
			if (!map.has(edge.source)) map.set(edge.source, new Set());
			if (!map.has(edge.target)) map.set(edge.target, new Set());
			map.get(edge.source)!.add(edge.target);
			map.get(edge.target)!.add(edge.source);
		}
		return map;
	}, [edges]);
	const { hopMap, parentMap } = useMemo(() => {
		const hop = new Map<string, number>();
		const parent = new Map<string, string | null>();
		if (!rootNode) return { hopMap: hop, parentMap: parent };
		const queue: Array<{ id: string; dist: number }> = [{ id: rootNode.id, dist: 0 }];
		hop.set(rootNode.id, 0);
		parent.set(rootNode.id, null);
		while (queue.length) {
			const { id, dist } = queue.shift()!;
			if (dist >= 2) continue;
			const neighbors = adjacency.get(id);
			if (!neighbors) continue;
			for (const next of neighbors) {
				if (!hop.has(next)) {
					hop.set(next, dist + 1);
					parent.set(next, id);
					queue.push({ id: next, dist: dist + 1 });
				}
			}
		}
		return { hopMap: hop, parentMap: parent };
	}, [rootNode, adjacency]);
	const firstHopList = useMemo(
		() =>
			nodes
				.filter((n) => hopMap.get(n.id) === 1)
				.sort((a, b) =>
					String((a.data as NodeData)?.label ?? '').localeCompare(
						String((b.data as NodeData)?.label ?? '')
					)
				),
		[nodes, hopMap]
	);
	const secondHopList = useMemo(
		() =>
			nodes
				.filter((n) => hopMap.get(n.id) === 2)
				.sort((a, b) =>
					String((a.data as NodeData)?.label ?? '').localeCompare(
						String((b.data as NodeData)?.label ?? '')
					)
				),
		[nodes, hopMap]
	);
	const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);

	useEffect(() => {
		if (focusedNodeId && !hopMap.has(focusedNodeId)) {
			setFocusedNodeId(null);
		}
	}, [focusedNodeId, hopMap]);

	const visibleNodeIds = useMemo(() => {
		if (!focusedNodeId || !rootNode) return null;
		const ids = new Set<string>();
		let cur: string | null | undefined = focusedNodeId;
		while (cur) {
			ids.add(cur);
			cur = parentMap.get(cur) ?? null;
		}
		ids.add(rootNode.id);
		return ids;
	}, [focusedNodeId, rootNode, parentMap]);

	const filteredNodes = useMemo(() => {
		if (!visibleNodeIds) return nodes;
		return nodes.filter((n) => visibleNodeIds.has(n.id));
	}, [nodes, visibleNodeIds]);

	const filteredEdges = useMemo(() => {
		if (!visibleNodeIds) return edges;
		return edges.filter((e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target));
	}, [edges, visibleNodeIds]);

	// transforms are disabled in this view

	return (
		<div className="flex h-full w-full flex-grow-1 flex-col gap-3 md:flex-row">
			<Button className="block md:hidden" size="sm" variant="flat" onClick={toggleTabSelector}>
				View Datasets
			</Button>
			{/* Vertical Tab Selector */}
			<div
				className={`h-screen-height-visible top-header-height fixed left-0 z-999 flex w-full -translate-x-full transform flex-col gap-3 border bg-white px-4 py-6 transition-transform duration-300 ease-in-out md:static md:z-0 md:h-full md:w-64 md:translate-x-0 dark:border-gray-700 dark:bg-gray-800 ${
					openTabSelector ? 'translate-x-0' : ''
				}`}
			>
				<Button2 className="md:hidden" size="icon" variant="outline" onClick={toggleTabSelector}>
					<X className="size-4" />
				</Button2>
				<div className="space-y-6">
					{rootNode ? (
						<div className="space-y-4">
							<div>
								<div className="mb-2 text-xs font-semibold text-gray-500">Subject</div>
								<button
									className={`w-full rounded border px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800 ${
										focusedNodeId === null ? 'border-2 border-gray-300' : ''
									}`}
									onClick={() => setFocusedNodeId(null)}
								>
									{String((rootNode.data as NodeData)?.label ?? rootNode.id)}
								</button>
							</div>
							{firstHopList.length ? (
								<div>
									<div className="mt-3 text-xs font-semibold text-gray-500">1 hop</div>
									<ul className="mt-1 space-y-1">
										{firstHopList.map((n) => (
											<li key={n.id}>
												<button
													className={`w-full rounded border px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800 ${
														focusedNodeId === n.id ? 'border-2 border-gray-300' : ''
													}`}
													onClick={() => setFocusedNodeId(n.id)}
												>
													{String(((n.data as NodeData) ?? ({} as NodeData)).label ?? n.id)}
												</button>
											</li>
										))}
									</ul>
								</div>
							) : null}
							{secondHopList.length ? (
								<div>
									<div className="mt-3 text-xs font-semibold text-gray-500">2 hops</div>
									<ul className="mt-1 space-y-1">
										{secondHopList.map((n) => (
											<li key={n.id}>
												<button
													className={`w-full rounded border px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800 ${
														focusedNodeId === n.id ? 'border-2 border-gray-300' : ''
													}`}
													onClick={() => setFocusedNodeId(n.id)}
												>
													{String(((n.data as NodeData) ?? ({} as NodeData)).label ?? n.id)}
												</button>
											</li>
										))}
									</ul>
								</div>
							) : null}
						</div>
					) : null}
				</div>
			</div>

			{/* Graph View */}
			<div className="relative flex-grow border bg-white">
				<div className="absolute top-2 right-4 z-10">
					<p className="text-xs text-gray-500 italic">
						Left click opens properties. Right click for actions.
					</p>
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
					onNodeClick={onNodeClick}
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
					{contextNode ? (
						<>
							{(() => {
								const items: Array<{
									label: string;
									key: ActionKey;
									enabled: boolean;
									onClick: () => void;
									cost?: number;
								}> = [];
								const t = contextNode.data.slugType as string | undefined;
								const push = (label: string, key: ActionKey, cb: () => void) =>
									items.push({
										label,
										key,
										enabled: ENABLE_ACTION_FLAGS[key],
										onClick: cb,
										cost: getActionCost(key)
									});
								if (t === 'person') {
									push('Discover emails', ActionKey.DiscoverEmails, () =>
										toast.success('Queued: discover emails')
									);
									push('Discover phones', ActionKey.DiscoverPhones, () =>
										toast.success('Queued: discover phones')
									);
									push('Discover profiles', ActionKey.DiscoverProfiles, () =>
										toast.success('Queued: discover profiles')
									);
									push('Discover properties', ActionKey.DiscoverProperties, () =>
										toast.success('Queued: discover properties')
									);
								} else if (t === 'business') {
									push('Discover domains', ActionKey.DiscoverProperties, () =>
										toast.success('Queued: discover domains')
									);
									push('Search web mentions', ActionKey.SearchWebMentions, () =>
										toast.success('Queued: web mentions')
									);
								} else if (t === 'email') {
									push('Discover profiles', ActionKey.DiscoverProfiles, () =>
										toast.success('Queued: discover profiles')
									);
									push('Search web mentions', ActionKey.SearchWebMentions, () =>
										toast.success('Queued: web mentions')
									);
								} else if (t === 'username') {
									push('Discover profiles', ActionKey.DiscoverProfiles, () =>
										toast.success('Queued: discover profiles')
									);
								} else if (t === 'domain') {
									push('Search web mentions', ActionKey.SearchWebMentions, () =>
										toast.success('Queued: web mentions')
									);
								}
								return items.length ? (
									items.map((it) => (
										<Item key={it.label} disabled={!it.enabled} onClick={it.onClick}>
											<div className="flex w-full items-center justify-between gap-3">
												<span>{it.label}</span>
												<span className="text-sm text-gray-500">
													{it.cost} <Coins className="inline-block size-4" />
												</span>
											</div>
										</Item>
									))
								) : (
									<Item disabled>No actions available</Item>
								);
							})()}
						</>
					) : (
						<Item disabled>No node</Item>
					)}
				</Menu>
				{/* Slide-out Drawer */}
				<div
					className={`h-screen-height-visible top-header-height fixed right-0 z-99 w-80 transform bg-white shadow-lg transition-transform duration-300 ease-in-out dark:border-gray-700 dark:bg-gray-800 ${
						isDrawerOpen && !creatingOpen && !editOpen ? 'translate-x-0' : 'translate-x-full'
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
							<div className="space-y-6">
								<div className="flex w-full items-center gap-2">
									{ENTITY_ICONS[selectedNode.data.type]}
									<span className="font-bold">{selectedNode.data.type}</span>
								</div>
								{/* Rich, type-aware summary */}
								{recordLoading ? (
									<div className="text-sm text-gray-500">Loading…</div>
								) : (
									<>
										<div>
											<Label>Label</Label>
											<div className="rounded border px-2 py-1 text-sm">
												{String((selectedNode.data as NodeData).label ?? '')}
											</div>
										</div>
										{(() => {
											const t = (selectedNode.data as NodeData).slugType;
											const rec = nodeRecord;

											if (t === 'person') {
												const first = pickValue(rec, ['name', 'first']) as string | undefined;
												const last = pickValue(rec, ['name', 'last']) as string | undefined;
												const avatar = pickValue(rec, ['avatar']) as string | undefined;
												const tags = pickValue(rec, ['tags']) as unknown;
												return (
													<div className="space-y-6 text-sm">
														<div className="grid grid-cols-2 gap-2">
															<div>
																<Label>Name</Label>
																<div className="rounded border px-2 py-1">
																	{[first, last].filter(Boolean).join(' ') || '—'}
																</div>
															</div>
															<div>
																<Label>Confidence</Label>
																<div className="rounded border px-2 py-1">
																	{String(pickValue(rec, ['confidence']) ?? '—')}
																</div>
															</div>
														</div>
														{typeof avatar === 'string' ? (
															<img
																src={avatar}
																alt=""
																className="h-24 w-24 rounded-full border object-cover"
															/>
														) : null}
														{Array.isArray(tags) && tags.length > 0 && (
															<div>
																<Label>Tags</Label>
																<div className="rounded border px-2 py-1">
																	{(tags as string[]).join(', ')}
																</div>
															</div>
														)}
													</div>
												);
											}
											if (t === 'business') {
												return (
													<div className="space-y-6 text-sm">
														<div className="grid grid-cols-2 gap-2">
															<div>
																<Label>Name</Label>
																<div className="rounded border px-2 py-1">
																	{String(pickValue(rec, ['name']) ?? '—')}
																</div>
															</div>
															<div>
																<Label>EIN</Label>
																<div className="rounded border px-2 py-1">
																	{String(pickValue(rec, ['ein_tax_id']) ?? '—')}
																</div>
															</div>
														</div>
													</div>
												);
											}
											if (t === 'email') {
												const addr =
													(pickValue(rec, ['email', 'address']) as string | undefined) ??
													(pickValue(rec, ['address']) as string | undefined);
												const domain =
													(pickValue(rec, ['email', 'domain']) as string | undefined) ??
													(pickValue(rec, ['domain']) as string | undefined);
												return (
													<div className="space-y-6 text-sm">
														<div>
															<Label>Address</Label>
															<div className="rounded border px-2 py-1">{addr ?? '—'}</div>
														</div>
														<div>
															<Label>Domain</Label>
															<div className="rounded border px-2 py-1">{domain ?? '—'}</div>
														</div>
													</div>
												);
											}
											if (t === 'phone') {
												return (
													<div className="space-y-6 text-sm">
														<div>
															<Label>Number</Label>
															<div className="rounded border px-2 py-1">
																{(pickValue(rec, ['phone', 'number_e164']) as string | undefined) ??
																	(pickValue(rec, ['number_e164']) as string | undefined) ??
																	'—'}
															</div>
														</div>
														<div className="grid grid-cols-2 gap-2">
															<div>
																<Label>Carrier</Label>
																<div className="rounded border px-2 py-1">
																	{String(pickValue(rec, ['carrier']) ?? '—')}
																</div>
															</div>
															<div>
																<Label>Line type</Label>
																<div className="rounded border px-2 py-1">
																	{String(pickValue(rec, ['line_type']) ?? '—')}
																</div>
															</div>
														</div>
													</div>
												);
											}
											if (t === 'username') {
												return (
													<div className="space-y-6 text-sm">
														<div>
															<Label>Username</Label>
															<div className="rounded border px-2 py-1">
																{String(pickValue(rec, ['username', 'value']) ?? '—')}
															</div>
														</div>
													</div>
												);
											}
											if (t === 'social_profile') {
												const platform = pickValue(rec, ['profile', 'platform']) as
													| string
													| undefined;
												const handle = pickValue(rec, ['profile', 'handle']) as string | undefined;
												const profile_url = pickValue(rec, ['profile', 'profile_url']) as
													| string
													| undefined;
												const display_name = pickValue(rec, ['profile', 'display_name']) as
													| string
													| undefined;
												const bio = pickValue(rec, ['profile', 'bio']) as string | undefined;
												return (
													<div className="space-y-6 text-sm">
														<div className="grid grid-cols-2 gap-2">
															<div>
																<Label>Platform</Label>
																<div className="rounded border px-2 py-1">{platform ?? '—'}</div>
															</div>
															<div>
																<Label>Handle</Label>
																<div className="rounded border px-2 py-1">@{handle ?? '—'}</div>
															</div>
														</div>
														<div>
															<Label>URL</Label>
															<div className="rounded border px-2 py-1 text-xs break-all">
																{truncate(profile_url, 70)}
															</div>
														</div>
														{display_name ? (
															<div>
																<Label>Display name</Label>
																<div className="rounded border px-2 py-1">{display_name}</div>
															</div>
														) : null}
														{bio ? (
															<div>
																<Label>Bio</Label>
																<div className="rounded border px-2 py-1">{truncate(bio, 160)}</div>
															</div>
														) : null}
													</div>
												);
											}
											if (t === 'image') {
												return (
													<div className="space-y-6 text-sm">
														{imageSrc ? (
															<img
																src={imageSrc}
																alt=""
																className="h-40 w-full rounded object-cover"
															/>
														) : (
															<div className="h-40 w-full rounded border bg-gray-50" />
														)}
														<div>
															<Label>Title</Label>
															<div className="rounded border px-2 py-1">
																{String(pickValue(rec, ['title']) ?? '—')}
															</div>
														</div>
														<div>
															<Label>Description</Label>
															<div className="rounded border px-2 py-1">
																{truncate(
																	pickValue(rec, ['description']) as string | undefined,
																	160
																)}
															</div>
														</div>
													</div>
												);
											}
											if (t === 'domain') {
												return (
													<div className="space-y-6 text-sm">
														<div>
															<Label>Domain</Label>
															<div className="rounded border px-2 py-1">
																{String(pickValue(rec, ['name']) ?? '—')}
															</div>
														</div>
													</div>
												);
											}
											if (t === 'property') {
												return (
													<div className="space-y-6 text-sm">
														<div>
															<Label>Address</Label>
															<div className="rounded border px-2 py-1">
																{String(pickValue(rec, ['address_full']) ?? '—')}
															</div>
														</div>
													</div>
												);
											}
											if (t === 'document') {
												return (
													<div className="space-y-6 text-sm">
														<div>
															<Label>Title</Label>
															<div className="rounded border px-2 py-1">
																{truncate(pickValue(rec, ['title']) as string | undefined, 80)}
															</div>
														</div>
														<div className="grid grid-cols-2 gap-2">
															<div>
																<Label>Type</Label>
																<div className="rounded border px-2 py-1">
																	{String(pickValue(rec, ['doc', 'type']) ?? '—')}
																</div>
															</div>
															<div>
																<Label>Author</Label>
																<div className="truncate rounded border px-2 py-1">
																	{truncate(
																		pickValue(rec, ['metadata', 'author']) as string | undefined,
																		40
																	)}
																</div>
															</div>
														</div>
														{(() => {
															const raw = pickValue(rec, ['source_url']) as string | undefined;
															const href = isHttp(raw) ? raw : (docSignedUrl ?? undefined);
															if (href) {
																return (
																	<div>
																		<Label className="flex items-center gap-1">
																			<span>Source</span>{' '}
																			<ExternalLink className="inline-block size-3" />
																		</Label>
																		<a
																			href={href}
																			target="_blank"
																			rel="noopener noreferrer"
																			className="block truncate rounded border px-2 py-1 text-xs text-blue-600 hover:underline"
																			title={raw}
																		>
																			{truncate(raw || href, 70)}
																		</a>
																	</div>
																);
															}
															return (
																<div>
																	<Label>Source</Label>
																	<div className="rounded border px-2 py-1 text-xs break-all">
																		{truncate(raw, 70)}
																	</div>
																</div>
															);
														})()}
													</div>
												);
											}
											if (t === 'ip') {
												return (
													<div className="space-y-6 text-sm">
														<div>
															<Label>Address</Label>
															<div className="rounded border px-2 py-1">
																{(pickValue(rec, ['ip', 'address']) as string | undefined) ??
																	(pickValue(rec, ['address']) as string | undefined) ??
																	'—'}
															</div>
														</div>
														<div className="grid grid-cols-2 gap-2">
															<div>
																<Label>ASN</Label>
																<div className="rounded border px-2 py-1">
																	{String(pickValue(rec, ['asn']) ?? '—')}
																</div>
															</div>
															<div>
																<Label>Org</Label>
																<div className="rounded border px-2 py-1">
																	{String(pickValue(rec, ['organization']) ?? '—')}
																</div>
															</div>
														</div>
													</div>
												);
											}
											return <div className="text-sm text-gray-500">No detail available.</div>;
										})()}
									</>
								)}
								{selectedNode.data.entityId && selectedNode.data.slugType && (
									<Link
										to={(() => {
											const id = String(selectedNode.data.entityId);
											switch (selectedNode.data.slugType) {
												case 'person':
													return `/people/${id}`;
												case 'business':
													return `/businesses/${id}`;
												case 'email':
													return `/emails/${id}`;
												case 'phone':
													return `/phones/${id}`;
												case 'social_profile':
													return `/profiles/${id}`;
												case 'username':
													return `/usernames/${id}`;
												case 'image':
													return `/images/${id}`;
												case 'domain':
													return `/domains/${id}`;
												case 'document':
													return `/documents/${id}`;
												case 'property':
													return `/properties/${id}`;
												case 'ip':
													return `/ips/${id}`;
												case 'leak':
													return `/leaks/${id}`;
												default:
													return '#';
											}
										})()}
									>
										<Button variant="outline" className="w-full">
											Open detail
										</Button>
									</Link>
								)}
								{/* Actions footer */}
								<div className="mt-6 flex items-center justify-end gap-2 border-t pt-3">
									<Button
										size="icon"
										variant="outline"
										title="Edit"
										onClick={() => {
											setEditOpen(true);
										}}
									>
										<Pencil className="h-4 w-4" />
									</Button>
									<Button
										size="icon"
										variant="outline"
										title="Link…"
										onClick={() => {
											setCreateType('email');
											setCreateValue('');
											setSearchQuery('');
											setSearchResults([]);
											setCreatingOpen(true);
										}}
									>
										<Link2 className="h-4 w-4" />
									</Button>
									<Button
										size="icon"
										variant="destructive"
										title="Delete"
										onClick={() => setDeleteOpen(true)}
									>
										<Trash2 className="h-4 w-4" />
									</Button>
								</div>
							</div>
						)}
					</div>
				</div>
			</div>
			{/* Edit dialog */}
			<Dialog open={editOpen} onOpenChange={setEditOpen}>
				<DialogContent className="max-w-3xl">
					<DialogHeader>
						<DialogTitle>Edit</DialogTitle>
					</DialogHeader>
					<div className="space-y-4">
						{(() => {
							const t = (selectedNode?.data as any)?.slugType as string | undefined;
							if (!t)
								return <div className="text-muted-foreground text-sm">No editable fields.</div>;
							const set = (k: string) => (e: any) => setEf((p) => ({ ...p, [k]: e.target.value }));
							if (t === 'person') {
								return (
									<div className="grid grid-cols-2 gap-3">
										<div>
											<Label>First</Label>
											<input
												className="w-full rounded border px-2 py-2"
												value={ef.first || ''}
												onChange={set('first')}
											/>
										</div>
										<div>
											<Label>Last</Label>
											<input
												className="w-full rounded border px-2 py-2"
												value={ef.last || ''}
												onChange={set('last')}
											/>
										</div>
										<div className="col-span-2">
											<Label>Confidence</Label>
											<input
												className="w-full rounded border px-2 py-2"
												value={ef.confidence || ''}
												onChange={set('confidence')}
											/>
										</div>
									</div>
								);
							}
							if (t === 'business') {
								return (
									<div className="grid grid-cols-2 gap-3">
										<div>
											<Label>Name</Label>
											<input
												className="w-full rounded border px-2 py-2"
												value={ef.name || ''}
												onChange={set('name')}
											/>
										</div>
										<div>
											<Label>EIN</Label>
											<input
												className="w-full rounded border px-2 py-2"
												value={ef.ein || ''}
												onChange={set('ein')}
											/>
										</div>
									</div>
								);
							}
							if (t === 'email') {
								return (
									<div>
										<Label>Address</Label>
										<input
											className="w-full rounded border px-2 py-2"
											value={ef.address || ''}
											onChange={set('address')}
										/>
									</div>
								);
							}
							if (t === 'phone') {
								return (
									<div className="grid grid-cols-2 gap-3">
										<div className="col-span-2">
											<Label>Number (E.164)</Label>
											<input
												className="w-full rounded border px-2 py-2"
												value={ef.number_e164 || ''}
												onChange={set('number_e164')}
											/>
										</div>
										<div>
											<Label>Carrier</Label>
											<input
												className="w-full rounded border px-2 py-2"
												value={ef.carrier || ''}
												onChange={set('carrier')}
											/>
										</div>
										<div>
											<Label>Line type</Label>
											<input
												className="w-full rounded border px-2 py-2"
												value={ef.line_type || ''}
												onChange={set('line_type')}
											/>
										</div>
									</div>
								);
							}
							if (t === 'username') {
								return (
									<div>
										<Label>Username</Label>
										<input
											className="w-full rounded border px-2 py-2"
											value={ef.value || ''}
											onChange={set('value')}
										/>
									</div>
								);
							}
							if (t === 'social_profile') {
								return (
									<div className="grid grid-cols-2 gap-3">
										<div>
											<Label>Platform</Label>
											<input
												className="w-full rounded border px-2 py-2"
												value={ef.platform || ''}
												onChange={set('platform')}
											/>
										</div>
										<div>
											<Label>Handle</Label>
											<input
												className="w-full rounded border px-2 py-2"
												value={ef.handle || ''}
												onChange={set('handle')}
											/>
										</div>
										<div className="col-span-2">
											<Label>Profile URL</Label>
											<input
												className="w-full rounded border px-2 py-2"
												value={ef.profile_url || ''}
												onChange={set('profile_url')}
											/>
										</div>
										<div>
											<Label>Display name</Label>
											<input
												className="w-full rounded border px-2 py-2"
												value={ef.display_name || ''}
												onChange={set('display_name')}
											/>
										</div>
										<div className="col-span-2">
											<Label>Bio</Label>
											<Textarea rows={4} value={ef.bio || ''} onChange={(e) => set('bio')(e)} />
										</div>
									</div>
								);
							}
							if (t === 'image') {
								return (
									<div className="space-y-3">
										<div>
											<Label>Title</Label>
											<input
												className="w-full rounded border px-2 py-2"
												value={ef.title || ''}
												onChange={set('title')}
											/>
										</div>
										<div>
											<Label>Description</Label>
											<Textarea
												rows={4}
												value={ef.description || ''}
												onChange={(e) => set('description')(e)}
											/>
										</div>
									</div>
								);
							}
							if (t === 'domain') {
								return (
									<div>
										<Label>Domain</Label>
										<input
											className="w-full rounded border px-2 py-2"
											value={ef.name || ''}
											onChange={set('name')}
										/>
									</div>
								);
							}
							if (t === 'document') {
								return (
									<div className="space-y-3">
										<div className="grid grid-cols-2 gap-3">
											<div>
												<Label>Type</Label>
												<input
													className="w-full rounded border px-2 py-2"
													value={ef.doc_type || ''}
													onChange={set('doc_type')}
												/>
											</div>
											<div>
												<Label>Author</Label>
												<input
													className="w-full rounded border px-2 py-2"
													value={ef.author || ''}
													onChange={set('author')}
												/>
											</div>
										</div>
										<div>
											<Label>Date</Label>
											<input
												className="w-full rounded border px-2 py-2"
												value={ef.date || ''}
												onChange={set('date')}
											/>
										</div>
										<div>
											<Label>Source URL</Label>
											<input
												className="w-full rounded border px-2 py-2"
												value={ef.source_url || ''}
												onChange={set('source_url')}
											/>
										</div>
										<div>
											<Label>Text</Label>
											<Textarea rows={6} value={ef.text || ''} onChange={(e) => set('text')(e)} />
										</div>
									</div>
								);
							}
							if (t === 'property') {
								return (
									<div>
										<Label>Address</Label>
										<input
											className="w-full rounded border px-2 py-2"
											value={ef.address_full || ''}
											onChange={set('address_full')}
										/>
									</div>
								);
							}
							if (t === 'ip') {
								return (
									<div className="grid grid-cols-2 gap-3">
										<div className="col-span-2">
											<Label>Address</Label>
											<input
												className="w-full rounded border px-2 py-2"
												value={ef.address || ''}
												onChange={set('address')}
											/>
										</div>
										<div>
											<Label>ASN</Label>
											<input
												className="w-full rounded border px-2 py-2"
												value={ef.asn || ''}
												onChange={set('asn')}
											/>
										</div>
										<div>
											<Label>Organization</Label>
											<input
												className="w-full rounded border px-2 py-2"
												value={ef.organization || ''}
												onChange={set('organization')}
											/>
										</div>
									</div>
								);
							}
							return <div className="text-muted-foreground text-sm">No editable fields.</div>;
						})()}
						<div className="flex justify-end gap-2">
							<Button variant="outline" onClick={() => setEditOpen(false)}>
								Cancel
							</Button>
							<Button onClick={updateCurrent} disabled={savingEdit}>
								{savingEdit ? 'Saving…' : 'Save'}
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>
			{/* Delete confirm */}
			<Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle>Delete this node?</DialogTitle>
					</DialogHeader>
					<div className="space-y-3">
						<p className="text-muted-foreground text-sm">
							This will remove the entity and its edges.
						</p>
						<div className="flex justify-end gap-2">
							<Button variant="outline" onClick={() => setDeleteOpen(false)}>
								Cancel
							</Button>
							<Button variant="destructive" onClick={deleteCurrent}>
								Delete
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>
			{/* Link dialog (attach existing or create new) */}
			<Dialog open={creatingOpen} onOpenChange={setCreatingOpen}>
				<DialogContent className="max-w-2xl">
					<DialogHeader>
						<DialogTitle>Link</DialogTitle>
					</DialogHeader>
					<div className="space-y-3">
						<div>
							<Label>Type</Label>
							<select
								className="mt-1 w-full rounded border px-2 py-2 text-sm"
								value={createType}
								onChange={(e) => {
									setCreateType(e.target.value as any);
									setSearchResults([]);
									setSearchQuery('');
								}}
							>
								{allowedCreateFor((selectedNode?.data as any)?.slugType ?? 'person').map((t) => (
									<option key={t} value={t}>
										{t}
									</option>
								))}
							</select>
						</div>
						<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
							{/* Attach existing (left) */}
							<div className="space-y-6">
								<div className="text-sm font-medium">Search and attach</div>
								<input
									className="w-full rounded border px-2 py-2 text-sm"
									placeholder="Search…"
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									onKeyUp={async (e) => {
										if ((e as any).key === 'Enter') await runSearchExisting();
									}}
								/>
								<div className="flex justify-end">
									<Button
										size="sm"
										variant="outline"
										onClick={runSearchExisting}
										disabled={searching}
									>
										{searching ? 'Searching…' : 'Search'}
									</Button>
								</div>
								<div className="max-h-72 space-y-6 overflow-auto">
									{searchResults.map((r) => (
										<div
											key={r.id}
											className="flex items-center justify-between rounded border p-3"
										>
											<div className="min-w-0 truncate text-sm" title={r.label}>
												{r.label}
											</div>
											<Button
												size="sm"
												variant="outline"
												onClick={() => attachExisting(r.id)}
												disabled={attaching}
											>
												Attach
											</Button>
										</div>
									))}
									{!searching && searchResults.length === 0 ? (
										<div className="text-muted-foreground text-xs">No results.</div>
									) : null}
								</div>
							</div>
							{/* Create new (right) */}
							<div className="space-y-6">
								<div className="text-sm font-medium">Create new</div>
								<input
									className="w-full rounded border px-2 py-2 text-sm"
									placeholder={
										createType === 'email'
											? 'address@example.com'
											: createType === 'phone'
												? '+15551234567'
												: createType === 'domain'
													? 'example.com'
													: createType === 'ip'
														? '8.8.8.8'
														: createType === 'username'
															? 'handle'
															: createType === 'image'
																? 'https://…'
																: createType === 'document'
																	? 'https://…'
																	: createType === 'property'
																		? '123 Main St…'
																		: ''
									}
									value={createValue}
									onChange={(e) => setCreateValue(e.target.value)}
								/>
								<div className="bg-muted/40 text-muted-foreground rounded-md border border-dashed p-3 text-xs">
									This {createType} will be created and automatically linked to{' '}
									<span className="text-foreground font-medium">
										{(selectedNode?.data as any)?.label ?? 'selection'}
									</span>
									.
								</div>
								<div className="flex justify-end">
									<Button onClick={createAndLink} disabled={creating}>
										{creating ? 'Creating…' : 'Create'}
									</Button>
								</div>
							</div>
						</div>
						<div className="flex justify-end gap-2">
							<Button variant="outline" onClick={() => setCreatingOpen(false)}>
								Close
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}

// default export is already declared above

// Inline dialogs for Edit / Delete / Create Linked
// Placed after component to keep file simpler
