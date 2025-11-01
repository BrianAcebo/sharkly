import { Case } from './types/case';

export const mockCases: Case[] = [
	{
		id: '1',
		title: 'Case involving Aiden Smith',
		description: 'Investigate activity linked to Aiden Smith (asmith@example.com)',
		category: 'Cyber Security',
		status: 'active',
		priority: 'low',
		tags: ['osint', 'phishing', 'email'],
		assignedTo: [
			{
				id: '12345',
				role: 'admin',
				organizationId: '12345',
				profile: {
					id: '12345',
					first_name: 'John',
					last_name: 'Doe',
					avatar: 'https://i.pravatar.cc/150?u=john.doe',
					completed_onboarding: true
				}
			}
		],
		createdAt: new Date(),
		updatedAt: new Date(),
		graphId: '13396b24-b82b-48e3-ad0e-640bbd28b258',
		entity: {
			id: '1c311155-1594-40a3-8b07-6e941b7197ea',
			type: 'person',
			name: 'Aiden Smith',
			email: 'asmith@example.com',
			location: {
				city: 'Springfield',
				country: 'USA',
				ip: '192.168.122.249'
			},
			devices: [
				{
					type: 'Desktop',
					os: 'Windows 10',
					lastUsed: '2025-06-11T21:27:27.140435'
				}
			],
			socialProfiles: [
				{
					platform: 'LinkedIn',
					username: 'asmith',
					url: 'https://linkedin.com/asmith'
				}
			],
			avatar: 'https://i.pravatar.cc/150?u=asmith'
		}
	},
	{
		id: '2',
		title: 'Case involving Jackson Walker',
		description: 'Investigate activity linked to Jackson Walker (jwalker@example.com)',
		category: 'Cyber Security',
		status: 'closed',
		priority: 'high',
		tags: ['malware', 'ransomware', 'critical'],
		assignedTo: [],
		createdAt: new Date(),
		updatedAt: new Date(),
		graphId: '7b3e60ae-4863-454a-b72c-bb483b586d65',
		entity: {
			id: 'fecafc82-7807-4fc8-9681-448cbe222656',
			type: 'person',
			name: 'Jackson Walker',
			email: 'jwalker@example.com',
			location: {
				city: 'Lakeview',
				country: 'France',
				ip: '192.168.233.207'
			},
			devices: [
				{
					type: 'Desktop',
					os: 'Ubuntu 22.04',
					lastUsed: '2025-06-11T21:27:27.140704'
				}
			],
			socialProfiles: [
				{
					platform: 'Instagram',
					username: 'jwalker',
					url: 'https://instagram.com/jwalker'
				}
			],
			avatar: 'https://i.pravatar.cc/150?u=jwalker'
		}
	},
	{
		id: '3',
		title: 'Case involving Sophia Smith',
		description: 'Investigate activity linked to Sophia Smith (ssmith@example.com)',
		category: 'Cyber Security',
		status: 'active',
		priority: 'critical',
		tags: ['insider', 'fraud', 'finance'],
		assignedTo: [],
		createdAt: new Date(),
		updatedAt: new Date(),
		graphId: '01571776-f1f6-4705-9d9b-449b3a96b7f2',
		entity: {
			id: '5d25d0a6-cf4b-4a90-9ba5-43e2e949a413',
			type: 'person',
			name: 'Sophia Smith',
			email: 'ssmith@example.com',
			location: {
				city: 'Fairview',
				country: 'France',
				ip: '192.168.21.170'
			},
			devices: [
				{
					type: 'Desktop',
					os: 'Fedora 39',
					lastUsed: '2025-06-11T21:27:27.141233'
				}
			],
			socialProfiles: [
				{
					platform: 'GitHub',
					username: 'ssmith',
					url: 'https://github.com/ssmith'
				}
			],
			avatar: 'https://i.pravatar.cc/150?u=ssmith'
		}
	},
	{
		id: '4',
		title: 'Case involving Jackson Garcia',
		description: 'Investigate activity linked to Jackson Garcia (jgarcia@example.com)',
		category: 'Cyber Security',
		status: 'in_progress',
		priority: 'low',
		tags: ['social', 'impersonation', 'urgent'],
		assignedTo: [],
		createdAt: new Date(),
		updatedAt: new Date(),
		graphId: '933d9308-6e6c-48ab-89ad-6cb6d87b97c5',
		entity: {
			id: 'a78f0815-111c-4cf9-b0e7-d1bdd01ecd02',
			type: 'person',
			name: 'Jackson Garcia',
			email: 'jgarcia@example.com',
			location: {
				city: 'Riverside',
				country: 'Canada',
				ip: '192.168.203.90'
			},
			devices: [
				{
					type: 'Desktop',
					os: 'Fedora 39',
					lastUsed: '2025-06-11T21:27:27.141697'
				}
			],
			socialProfiles: [
				{
					platform: 'Instagram',
					username: 'jgarcia',
					url: 'https://instagram.com/jgarcia'
				}
			],
			avatar: 'https://i.pravatar.cc/150?u=jgarcia'
		}
	},
	{
		id: '5',
		title: 'Case involving Sophia Walker',
		description: 'Investigate activity linked to Sophia Walker (swalker@example.com)',
		category: 'Cyber Security',
		status: 'in_progress',
		priority: 'low',
		tags: ['osint', 'investigation', 'compliance'],
		assignedTo: [],
		createdAt: new Date(),
		updatedAt: new Date(),
		graphId: '8fb9dace-0eb8-4a83-8503-4138d97bbe62',
		entity: {
			id: '9494853f-1e1f-4af8-87f5-7417e3d1f6cd',
			type: 'person',
			name: 'Sophia Walker',
			email: 'swalker@example.com',
			location: {
				city: 'Mapleton',
				country: 'USA',
				ip: '192.168.8.240'
			},
			devices: [
				{
					type: 'Desktop',
					os: 'Fedora 39',
					lastUsed: '2025-06-11T21:27:27.141762'
				}
			],
			socialProfiles: [
				{
					platform: 'Facebook',
					username: 'swalker',
					url: 'https://facebook.com/swalker'
				}
			],
			avatar: 'https://i.pravatar.cc/150?u=swalker'
		}
	},
	{
		id: '6',
		title: 'Case involving Olivia Rodriguez',
		description: 'Investigate activity linked to Olivia Rodriguez (orodriguez@example.com)',
		category: 'Cyber Security',
		status: 'active',
		priority: 'high',
		tags: ['threat', 'APT', 'espionage'],
		assignedTo: [],
		createdAt: new Date(),
		updatedAt: new Date(),
		graphId: '8846b583-dad7-44d3-921e-5e960785817f',
		entity: {
			id: 'e69b27f6-be79-4957-a3db-ea525ff78b98',
			type: 'person',
			name: 'Olivia Rodriguez',
			email: 'orodriguez@example.com',
			location: {
				city: 'Hill Valley',
				country: 'France',
				ip: '192.168.120.57'
			},
			devices: [
				{
					type: 'Desktop',
					os: 'Fedora 39',
					lastUsed: '2025-06-11T21:27:27.141841'
				}
			],
			socialProfiles: [
				{
					platform: 'LinkedIn',
					username: 'orodriguez',
					url: 'https://linkedin.com/orodriguez'
				}
			],
			avatar: 'https://i.pravatar.cc/150?u=orodriguez'
		}
	},
	{
		id: '7',
		title: 'Case involving Olivia Walker',
		description: 'Investigate activity linked to Olivia Walker (owalker@example.com)',
		category: 'Cyber Security',
		status: 'closed',
		priority: 'high',
		tags: ['phishing', 'email', 'user-report'],
		assignedTo: [],
		createdAt: new Date(),
		updatedAt: new Date(),
		graphId: '77e4b2da-6174-44c3-ae14-fa89a843082a',
		entity: {
			id: 'b1c6bfdb-9089-4add-9e6e-38030b6b9833',
			type: 'person',
			name: 'Olivia Walker',
			email: 'owalker@example.com',
			location: {
				city: 'Springfield',
				country: 'Argentina',
				ip: '192.168.102.139'
			},
			devices: [
				{
					type: 'Desktop',
					os: 'Windows 10',
					lastUsed: '2025-06-11T21:27:27.141878'
				}
			],
			socialProfiles: [
				{
					platform: 'Twitter',
					username: 'owalker',
					url: 'https://twitter.com/owalker'
				}
			],
			avatar: 'https://i.pravatar.cc/150?u=owalker'
		}
	},
	{
		id: '8',
		title: 'Case involving Olivia Johnson',
		description: 'Investigate activity linked to Olivia Johnson (ojohnson@example.com)',
		category: 'Cyber Security',
		status: 'active',
		priority: 'high',
		tags: ['malware', 'trojan', 'network'],
		assignedTo: [],
		createdAt: new Date(),
		updatedAt: new Date(),
		graphId: '0b8469b2-2d54-41f2-81e2-3c86a01ebe17',
		entity: {
			id: '5a44fb8a-9f38-4b4c-bfff-92c287ea8eca',
			type: 'person',
			name: 'Olivia Johnson',
			email: 'ojohnson@example.com',
			location: {
				city: 'Springfield',
				country: 'Brazil',
				ip: '192.168.91.105'
			},
			devices: [
				{
					type: 'Desktop',
					os: 'macOS Ventura',
					lastUsed: '2025-06-11T21:27:27.141925'
				}
			],
			socialProfiles: [
				{
					platform: 'Instagram',
					username: 'ojohnson',
					url: 'https://instagram.com/ojohnson'
				}
			],
			avatar: 'https://i.pravatar.cc/150?u=ojohnson'
		}
	},
	{
		id: '9',
		title: 'Case involving Lucas Rodriguez',
		description: 'Investigate activity linked to Lucas Rodriguez (lrodriguez@example.com)',
		category: 'Cyber Security',
		status: 'closed',
		priority: 'critical',
		tags: ['fraud', 'account-takeover', 'banking'],
		assignedTo: [],
		createdAt: new Date(),
		updatedAt: new Date(),
		graphId: '84040c00-301a-4743-8638-74c25baa7573',
		entity: {
			id: '9bc905ec-3639-43d2-a55a-fe7703835463',
			type: 'person',
			name: 'Lucas Rodriguez',
			email: 'lrodriguez@example.com',
			location: {
				city: 'Fairview',
				country: 'Argentina',
				ip: '192.168.14.104'
			},
			devices: [
				{
					type: 'Desktop',
					os: 'Windows 10',
					lastUsed: '2025-06-11T21:27:27.141964'
				}
			],
			socialProfiles: [
				{
					platform: 'LinkedIn',
					username: 'lrodriguez',
					url: 'https://linkedin.com/lrodriguez'
				}
			],
			avatar: 'https://i.pravatar.cc/150?u=lrodriguez'
		}
	},
	{
		id: '10',
		title: 'Case involving Olivia Johnson',
		description: 'Investigate activity linked to Olivia Johnson (ojohnson@example.com)',
		category: 'Cyber Security',
		status: 'in_progress',
		priority: 'high',
		tags: ['osint', 'investigation', 'insider'],
		assignedTo: [],
		createdAt: new Date(),
		updatedAt: new Date(),
		graphId: 'a8d52413-993d-4c82-9879-675baee0b648',
		entity: {
			id: '70fd73e4-8da5-4dfe-8d56-f3ed647d3494',
			type: 'person',
			name: 'Olivia Johnson',
			email: 'ojohnson@example.com',
			location: {
				city: 'Clinton',
				country: 'Canada',
				ip: '192.168.87.15'
			},
			devices: [
				{
					type: 'Desktop',
					os: 'Fedora 39',
					lastUsed: '2025-06-11T21:27:27.142000'
				}
			],
			socialProfiles: [
				{
					platform: 'GitHub',
					username: 'ojohnson',
					url: 'https://github.com/ojohnson'
				}
			],
			avatar: 'https://i.pravatar.cc/150?u=ojohnson'
		}
	}
];
