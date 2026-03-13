/**
 * AI Tools for OpenAI Function Calling
 * Sharkly SEO Assistant — read project data, explain findings, suggest next actions.
 * Growth: read + explain + suggest. Scale: + trigger audits.
 */

import { supabase } from '../utils/supabaseClient.js';

// Tool definitions for OpenAI function calling
export const AI_TOOLS = [
	{
		type: 'function' as const,
		function: {
			name: 'get_sites_summary',
			description:
				'List all sites (projects) for the organization. Use this first to understand what sites exist. Each site has a name, niche, URL, and domain authority.',
			parameters: {
				type: 'object',
				properties: {},
				required: []
			}
		}
	},
	{
		type: 'function' as const,
		function: {
			name: 'get_site_details',
			description:
				'Get detailed info about a specific site: name, niche, URL, domain authority, competitor URLs, content settings. Use site_id from get_sites_summary.',
			parameters: {
				type: 'object',
				properties: {
					site_id: { type: 'string', description: 'UUID of the site' }
				},
				required: ['site_id']
			}
		}
	},
	{
		type: 'function' as const,
		function: {
			name: 'get_clusters_summary',
			description:
				'List content clusters for a site. Clusters are topic groups with a target keyword and destination page. Use site_id from get_sites_summary.',
			parameters: {
				type: 'object',
				properties: {
					site_id: { type: 'string', description: 'UUID of the site' }
				},
				required: ['site_id']
			}
		}
	},
	{
		type: 'function' as const,
		function: {
			name: 'get_cluster_details',
			description:
				'Get details about a cluster: target keyword, pages, funnel stages, cluster intelligence warnings. Use cluster_id from get_clusters_summary.',
			parameters: {
				type: 'object',
				properties: {
					cluster_id: { type: 'string', description: 'UUID of the cluster' }
				},
				required: ['cluster_id']
			}
		}
	},
	{
		type: 'function' as const,
		function: {
			name: 'get_page_summary',
			description:
				'Get a page summary: keyword, title, type, funnel stage, status, UPSA score. Use page_id from cluster or page list.',
			parameters: {
				type: 'object',
				properties: {
					page_id: { type: 'string', description: 'UUID of the page' }
				},
				required: ['page_id']
			}
		}
	},
	{
		type: 'function' as const,
		function: {
			name: 'get_audit_summary',
			description:
				'Get the latest technical audit summary for a site: health score, critical issues, recommendations. Use site_id.',
			parameters: {
				type: 'object',
				properties: {
					site_id: { type: 'string', description: 'UUID of the site' }
				},
				required: ['site_id']
			}
		}
	},
	{
		type: 'function' as const,
		function: {
			name: 'get_weekly_priority_stack',
			description:
				'Get the weekly priority stack for a site — top recommended actions ranked by impact. Use site_id.',
			parameters: {
				type: 'object',
				properties: {
					site_id: { type: 'string', description: 'UUID of the site' }
				},
				required: ['site_id']
			}
		}
	},
	{
		type: 'function' as const,
		function: {
			name: 'get_refresh_queue',
			description:
				'Get pages that need content refresh — stale pages with declining rankings. Use site_id.',
			parameters: {
				type: 'object',
				properties: {
					site_id: { type: 'string', description: 'UUID of the site' }
				},
				required: ['site_id']
			}
		}
	},
	{
		type: 'function' as const,
		function: {
			name: 'suggest_next_actions',
			description:
				'Analyze current data and suggest prioritized next actions for the user. Can take optional site_id or cluster_id for context. Free — no credits.',
			parameters: {
				type: 'object',
				properties: {
					site_id: {
						type: 'string',
						description: 'Optional — focus suggestions on this site'
					},
					cluster_id: {
						type: 'string',
						description: 'Optional — focus suggestions on this cluster'
					}
				},
				required: []
			}
		}
	},
	{
		type: 'function' as const,
		function: {
			name: 'trigger_technical_audit',
			description:
				'(Scale plan only) Trigger a full technical SEO audit for a site. Crawls the site, checks crawlability, Core Web Vitals, indexation. Costs credits. Use site_id.',
			parameters: {
				type: 'object',
				properties: {
					site_id: { type: 'string', description: 'UUID of the site to audit' }
				},
				required: ['site_id']
			}
		}
	}
];

// // Tool definitions for OpenAI function calling
// export const AI_TOOLS = [
//   {
//     type: 'function' as const,
//     function: {
//       name: 'run_public_presence',
//       description: 'Run a public presence scan to find social profiles, emails, and web mentions for a person or business. This searches the web for information about the subject. REQUIRES entity_type and entity_id - use find_subject_for_action first to get these.',
//       parameters: {
//         type: 'object',
//         properties: {
//           entity_type: {
//             type: 'string',
//             enum: ['person', 'business'],
//             description: 'The type of entity being scanned.',
//           },
//           entity_id: {
//             type: 'string',
//             description: 'The UUID of the person or business record to scan.',
//           },
//           full_name: {
//             type: 'string',
//             description: 'The full name of the person or business name.',
//           },
//           location: {
//             type: 'string',
//             description: 'Optional location to narrow down the search (city, state).',
//           },
//           company: {
//             type: 'string',
//             description: 'Optional company/employer for person searches.',
//           },
//           domain: {
//             type: 'string',
//             description: 'Optional website domain for business searches.',
//           },
//         },
//         required: ['entity_type', 'entity_id', 'full_name'],
//       },
//     },
//   },
//   {
//     type: 'function' as const,
//     function: {
//       name: 'lookup_phone',
//       description: 'Look up information about a phone number including carrier, type, and associated names.',
//       parameters: {
//         type: 'object',
//         properties: {
//           phone_number: {
//             type: 'string',
//             description: 'The phone number to look up (any format).',
//           },
//         },
//         required: ['phone_number'],
//       },
//     },
//   },
//   {
//     type: 'function' as const,
//     function: {
//       name: 'lookup_email',
//       description: 'Look up information about an email address including verification and associated profiles.',
//       parameters: {
//         type: 'object',
//         properties: {
//           email: {
//             type: 'string',
//             description: 'The email address to look up.',
//           },
//         },
//         required: ['email'],
//       },
//     },
//   },
//   {
//     type: 'function' as const,
//     function: {
//       name: 'search_case_entities',
//       description: 'Search for entities (people, emails, phones, etc.) within the current case or organization.',
//       parameters: {
//         type: 'object',
//         properties: {
//           query: {
//             type: 'string',
//             description: 'Search query - name, email, phone, or any identifier.',
//           },
//           entity_type: {
//             type: 'string',
//             enum: ['person', 'email', 'phone', 'domain', 'business', 'all'],
//             description: 'Type of entity to search for. Default is "all".',
//           },
//         },
//         required: ['query'],
//       },
//     },
//   },
//   {
//     type: 'function' as const,
//     function: {
//       name: 'get_person_summary',
//       description: 'Get a summary of all known information about a person including linked entities, recent findings, and case notes.',
//       parameters: {
//         type: 'object',
//         properties: {
//           person_id: {
//             type: 'string',
//             description: 'The ID of the person to summarize.',
//           },
//         },
//         required: ['person_id'],
//       },
//     },
//   },
//   {
//     type: 'function' as const,
//     function: {
//       name: 'add_case_note',
//       description: 'Add a note or finding to a person or case.',
//       parameters: {
//         type: 'object',
//         properties: {
//           person_id: {
//             type: 'string',
//             description: 'The ID of the person to add the note to.',
//           },
//           content: {
//             type: 'string',
//             description: 'The note content.',
//           },
//           category: {
//             type: 'string',
//             enum: ['finding', 'observation', 'lead', 'action_item', 'general'],
//             description: 'Category of the note.',
//           },
//         },
//         required: ['person_id', 'content'],
//       },
//     },
//   },
//   {
//     type: 'function' as const,
//     function: {
//       name: 'draft_report_section',
//       description: 'Draft a section of an investigative report based on the findings for a person.',
//       parameters: {
//         type: 'object',
//         properties: {
//           person_id: {
//             type: 'string',
//             description: 'The ID of the person the report is about.',
//           },
//           section_type: {
//             type: 'string',
//             enum: ['executive_summary', 'background', 'findings', 'social_media', 'contact_info', 'recommendations'],
//             description: 'Type of report section to draft.',
//           },
//         },
//         required: ['person_id', 'section_type'],
//       },
//     },
//   },
//   {
//     type: 'function' as const,
//     function: {
//       name: 'create_entity',
//       description: 'Create a new entity record (email, phone, social profile) and optionally link it to a person.',
//       parameters: {
//         type: 'object',
//         properties: {
//           entity_type: {
//             type: 'string',
//             enum: ['email', 'phone', 'social_profile', 'domain'],
//             description: 'Type of entity to create.',
//           },
//           value: {
//             type: 'string',
//             description: 'The value (email address, phone number, profile URL, etc.).',
//           },
//           link_to_person_id: {
//             type: 'string',
//             description: 'Optional person ID to link this entity to.',
//           },
//           notes: {
//             type: 'string',
//             description: 'Optional notes about this entity.',
//           },
//         },
//         required: ['entity_type', 'value'],
//       },
//     },
//   },
//   {
//     type: 'function' as const,
//     function: {
//       name: 'suggest_next_steps',
//       description: 'Analyze the current case state and suggest next investigative steps.',
//       parameters: {
//         type: 'object',
//         properties: {
//           person_id: {
//             type: 'string',
//             description: 'The ID of the person/subject of investigation.',
//           },
//           focus_area: {
//             type: 'string',
//             enum: ['identity_verification', 'contact_info', 'social_presence', 'background', 'connections'],
//             description: 'Optional area to focus suggestions on.',
//           },
//         },
//         required: ['person_id'],
//       },
//     },
//   },
//   {
//     type: 'function' as const,
//     function: {
//       name: 'search_business_emails',
//       description: 'Find email addresses associated with a business or domain. Use this when the user asks for company emails, employee emails, or emails for a domain.',
//       parameters: {
//         type: 'object',
//         properties: {
//           company_name: {
//             type: 'string',
//             description: 'The name of the company to search.',
//           },
//           domain: {
//             type: 'string',
//             description: 'The domain to search (e.g., "acme.com"). If not provided, will try to derive from company name.',
//           },
//         },
//         required: ['company_name'],
//       },
//     },
//   },
//   {
//     type: 'function' as const,
//     function: {
//       name: 'get_business_summary',
//       description: 'Get a summary of all known information about a business including linked entities, employees, domains, and recent findings.',
//       parameters: {
//         type: 'object',
//         properties: {
//           business_id: {
//             type: 'string',
//             description: 'The ID of the business to summarize. If not known, use search_case_entities first.',
//           },
//           business_name: {
//             type: 'string',
//             description: 'The name of the business (used if ID is not known to search first).',
//           },
//         },
//         required: [],
//       },
//     },
//   },
//   {
//     type: 'function' as const,
//     function: {
//       name: 'explain_capability',
//       description: 'Explain what True Sight can and cannot do for a specific request. Use this when the user asks for something that might not be directly possible, to explain the best approach.',
//       parameters: {
//         type: 'object',
//         properties: {
//           user_request: {
//             type: 'string',
//             description: 'What the user is trying to accomplish.',
//           },
//         },
//         required: ['user_request'],
//       },
//     },
//   },
//   {
//     type: 'function' as const,
//     function: {
//       name: 'cancel_scan',
//       description: 'Cancel a running Public Presence scan. Use this when the user wants to stop a scan that is currently in progress.',
//       parameters: {
//         type: 'object',
//         properties: {
//           run_id: {
//             type: 'string',
//             description: 'The UUID of the running scan to cancel. Get this from the previous run_public_presence result.',
//           },
//           entity_name: {
//             type: 'string',
//             description: 'Optional: The name of the person/business being scanned, for confirmation message.',
//           },
//         },
//         required: ['run_id'],
//       },
//     },
//   },
//   {
//     type: 'function' as const,
//     function: {
//       name: 'find_subject_for_action',
//       description: 'ALWAYS use this tool FIRST before running any action (like public_presence, lookup, etc.) when you need to identify which person or business to act on. This searches for matching subjects and validates they are the correct entity type for the intended action.',
//       parameters: {
//         type: 'object',
//         properties: {
//           search_name: {
//             type: 'string',
//             description: 'The name to search for (person name or business name).',
//           },
//           intended_action: {
//             type: 'string',
//             enum: ['public_presence_scan', 'person_summary', 'business_summary', 'business_email_search', 'add_note', 'draft_report'],
//             description: 'The action you intend to perform. This determines which entity types are valid.',
//           },
//         },
//         required: ['search_name', 'intended_action'],
//       },
//     },
//   },
//   {
//     type: 'function' as const,
//     function: {
//       name: 'create_subject',
//       description: 'Create a new person or business record when find_subject_for_action returns no results. Use this to create the subject before running actions on them.',
//       parameters: {
//         type: 'object',
//         properties: {
//           entity_type: {
//             type: 'string',
//             enum: ['person', 'business'],
//             description: 'Whether to create a person or business.',
//           },
//           name: {
//             type: 'string',
//             description: 'For person: "First Last" format. For business: company name.',
//           },
//           additional_info: {
//             type: 'object',
//             description: 'Optional additional info like location, company (for person), domain (for business).',
//           },
//         },
//         required: ['entity_type', 'name'],
//       },
//     },
//   },
//   // =====================================================
//   // Email Intelligence Tools (no brand names exposed to users)
//   // =====================================================
//   {
//     type: 'function' as const,
//     function: {
//       name: 'hunter_domain_search',
//       description: 'Find all email addresses associated with a company domain. Great for discovering employee emails at an organization. Costs 5 credits.',
//       parameters: {
//         type: 'object',
//         properties: {
//           domain: {
//             type: 'string',
//             description: 'The company domain to search.',
//           },
//           type: {
//             type: 'string',
//             enum: ['personal', 'generic'],
//             description: 'Filter by email type. "personal" = individual emails, "generic" = info@, support@, etc.',
//           },
//           department: {
//             type: 'string',
//             enum: ['executive', 'it', 'finance', 'management', 'sales', 'legal', 'support', 'hr', 'marketing', 'communication'],
//             description: 'Filter by department.',
//           },
//         },
//         required: ['domain'],
//       },
//     },
//   },
//   {
//     type: 'function' as const,
//     function: {
//       name: 'hunter_email_finder',
//       description: 'Find a specific person\'s email address at a company. Provide their name and company domain. Costs 3 credits.',
//       parameters: {
//         type: 'object',
//         properties: {
//           domain: {
//             type: 'string',
//             description: 'The company domain.',
//           },
//           first_name: {
//             type: 'string',
//             description: 'Person\'s first name.',
//           },
//           last_name: {
//             type: 'string',
//             description: 'Person\'s last name.',
//           },
//           full_name: {
//             type: 'string',
//             description: 'Alternative to first/last name - full name.',
//           },
//         },
//         required: ['domain'],
//       },
//     },
//   },
//   {
//     type: 'function' as const,
//     function: {
//       name: 'hunter_email_verify',
//       description: 'Verify if an email address is valid and deliverable. Returns status (valid, invalid, risky) and confidence score. Costs 1 credit.',
//       parameters: {
//         type: 'object',
//         properties: {
//           email: {
//             type: 'string',
//             description: 'The email address to verify.',
//           },
//         },
//         required: ['email'],
//       },
//     },
//   },
//   {
//     type: 'function' as const,
//     function: {
//       name: 'hunter_enrich_person',
//       description: 'Enrich a person\'s profile from their email. Returns full name, job title, company, location, and social profiles. Costs 5 credits.',
//       parameters: {
//         type: 'object',
//         properties: {
//           email: {
//             type: 'string',
//             description: 'The email address to enrich.',
//           },
//         },
//         required: ['email'],
//       },
//     },
//   },
//   {
//     type: 'function' as const,
//     function: {
//       name: 'hunter_enrich_company',
//       description: 'Enrich a company\'s profile from their domain. Returns company details, contact info, tech stack, and social profiles. Costs 3 credits.',
//       parameters: {
//         type: 'object',
//         properties: {
//           domain: {
//             type: 'string',
//             description: 'The company domain to enrich.',
//           },
//         },
//         required: ['domain'],
//       },
//     },
//   },
//   {
//     type: 'function' as const,
//     function: {
//       name: 'hunter_full_enrichment',
//       description: 'Get complete enrichment for both a person AND their company from an email. Returns comprehensive profile data. Costs 8 credits.',
//       parameters: {
//         type: 'object',
//         properties: {
//           email: {
//             type: 'string',
//             description: 'The email address to fully enrich.',
//           },
//         },
//         required: ['email'],
//       },
//     },
//   },
//   {
//     type: 'function' as const,
//     function: {
//       name: 'hunter_email_count',
//       description: 'Get a count of how many email addresses are available for a domain. FREE - no credits charged. Good for checking before running a full domain search.',
//       parameters: {
//         type: 'object',
//         properties: {
//           domain: {
//             type: 'string',
//             description: 'The company domain to check.',
//           },
//         },
//         required: ['domain'],
//       },
//     },
//   },
//   // =====================================================
//   // Site Registration Detection (Holehe internally)
//   // =====================================================
//   {
//     type: 'function' as const,
//     function: {
//       name: 'holehe_check_email',
//       description: 'Check which websites an email address is registered on. Scans 120+ sites including dating apps, social media, adult sites, and more. CRITICAL for infidelity and digital presence investigations. Returns list of sites where the email is confirmed registered. Costs 3 credits.',
//       parameters: {
//         type: 'object',
//         properties: {
//           email: {
//             type: 'string',
//             description: 'The email address to check for site registrations.',
//           },
//         },
//         required: ['email'],
//       },
//     },
//   },
//   // =====================================================
//   // Username Search (Sherlock internally)
//   // =====================================================
//   {
//     type: 'function' as const,
//     function: {
//       name: 'search_username_accounts',
//       description: 'Search for a username across 400+ websites to find all accounts using that username. Discovers social media, dating apps, gaming platforms, forums, adult sites, and more. Essential for digital footprint and anonymous account investigations. Costs 5 credits.',
//       parameters: {
//         type: 'object',
//         properties: {
//           username: {
//             type: 'string',
//             description: 'The username to search for across sites.',
//           },
//         },
//         required: ['username'],
//       },
//     },
//   },
//   // =====================================================
//   // Breach Exposure Check (Have I Been Pwned)
//   // =====================================================
//   {
//     type: 'function' as const,
//     function: {
//       name: 'check_email_breaches',
//       description: 'Check if an email address has been exposed in data breaches. Returns list of breaches, what data was exposed (passwords, addresses, phone numbers, etc.), and when breaches occurred. Essential for security assessments and background checks. Costs 2 credits.',
//       parameters: {
//         type: 'object',
//         properties: {
//           email: {
//             type: 'string',
//             description: 'The email address to check for breach exposure.',
//           },
//         },
//         required: ['email'],
//       },
//     },
//   },
//   // =====================================================
//   // Deep Breach Search (Premium leak data)
//   // =====================================================
//   {
//     type: 'function' as const,
//     function: {
//       name: 'deep_breach_search',
//       description: 'Premium deep breach search with full exposed data. Returns actual leaked passwords, usernames, IP addresses, phone numbers, and sensitive site data. Best for thorough investigations where you need the actual leaked data, not just breach names. Costs 5 credits.',
//       parameters: {
//         type: 'object',
//         properties: {
//           email: {
//             type: 'string',
//             description: 'The email address to search for in leak databases.',
//           },
//         },
//         required: ['email'],
//       },
//     },
//   },
//   // =====================================================
//   // Court Records Tools
//   // =====================================================
//   {
//     type: 'function' as const,
//     function: {
//       name: 'search_court_records',
//       description: 'Search federal court records for criminal cases, civil lawsuits, bankruptcies, and appeals. Returns case details, parties involved, and filing dates. Works for both people and businesses. REQUIRES entity_type and entity_id - use find_subject_for_action first. Costs 3 credits.',
//       parameters: {
//         type: 'object',
//         properties: {
//           entity_type: {
//             type: 'string',
//             enum: ['person', 'business'],
//             description: 'The type of entity to search.',
//           },
//           entity_id: {
//             type: 'string',
//             description: 'The UUID of the person or business record.',
//           },
//           name: {
//             type: 'string',
//             description: 'The full name of the person or business to search.',
//           },
//         },
//         required: ['entity_type', 'entity_id', 'name'],
//       },
//     },
//   },
//   {
//     type: 'function' as const,
//     function: {
//       name: 'search_party_records',
//       description: 'Find all federal court cases where a person or business was listed as a party (plaintiff, defendant, etc.). This is a reverse lookup - good for seeing the full litigation history. Costs 2 credits.',
//       parameters: {
//         type: 'object',
//         properties: {
//           entity_type: {
//             type: 'string',
//             enum: ['person', 'business'],
//             description: 'The type of entity to search.',
//           },
//           entity_id: {
//             type: 'string',
//             description: 'The UUID of the person or business record.',
//           },
//           name: {
//             type: 'string',
//             description: 'The full name of the person or business to search.',
//           },
//         },
//         required: ['entity_type', 'entity_id', 'name'],
//       },
//     },
//   },
//   {
//     type: 'function' as const,
//     function: {
//       name: 'search_bankruptcy_records',
//       description: 'Search federal bankruptcy records for a person or business. Returns chapter type, trustee, key dates, and filing status. Critical for due diligence and background checks. Costs 3 credits.',
//       parameters: {
//         type: 'object',
//         properties: {
//           entity_type: {
//             type: 'string',
//             enum: ['person', 'business'],
//             description: 'The type of entity to search.',
//           },
//           entity_id: {
//             type: 'string',
//             description: 'The UUID of the person or business record.',
//           },
//           name: {
//             type: 'string',
//             description: 'The full name of the person or business to search.',
//           },
//         },
//         required: ['entity_type', 'entity_id', 'name'],
//       },
//     },
//   },
//   {
//     type: 'function' as const,
//     function: {
//       name: 'search_judge_records',
//       description: 'Search federal judges by name to find their biographical data, career history (positions), education, political affiliations, and ABA ratings. Only works for federal judges. Costs 3 credits.',
//       parameters: {
//         type: 'object',
//         properties: {
//           person_id: {
//             type: 'string',
//             description: 'The UUID of the person record.',
//           },
//           name: {
//             type: 'string',
//             description: 'The full name of the judge to search.',
//           },
//         },
//         required: ['person_id', 'name'],
//       },
//     },
//   },
//   {
//     type: 'function' as const,
//     function: {
//       name: 'search_financial_disclosures',
//       description: 'Retrieve financial disclosure records for federal judges. Returns investments, gifts, debts, outside income, and spouse income. Only works for federal judges who are required to file. Costs 5 credits.',
//       parameters: {
//         type: 'object',
//         properties: {
//           person_id: {
//             type: 'string',
//             description: 'The UUID of the person record.',
//           },
//           name: {
//             type: 'string',
//             description: 'The full name of the judge to search.',
//           },
//         },
//         required: ['person_id', 'name'],
//       },
//     },
//   },
//   // =====================================================
//   // Phone Lookup - carrier, validity, line type
//   // =====================================================
//   {
//     type: 'function' as const,
//     function: {
//       name: 'phone_carrier_lookup',
//       description: 'Look up carrier information, line type (mobile/landline/VoIP), validity, and location for a phone number. Essential for skip tracing and verifying contact info. Costs 3 credits.',
//       parameters: {
//         type: 'object',
//         properties: {
//           phone_id: {
//             type: 'string',
//             description: 'The UUID of the phone record in the database (if known).',
//           },
//           phone_number: {
//             type: 'string',
//             description: 'The phone number to look up (E.164 format preferred, e.g., +14155551234).',
//           },
//         },
//         required: ['phone_number'],
//       },
//     },
//   },
//   // =====================================================
//   // Domain Intelligence - DNS & WHOIS
//   // =====================================================
//   {
//     type: 'function' as const,
//     function: {
//       name: 'dns_lookup',
//       description: 'Look up DNS records for a domain (A, AAAA, MX, NS, TXT, CNAME). Shows where the domain points, mail server info, and identifies email providers like Google Workspace or Microsoft 365. Costs 1 credit.',
//       parameters: {
//         type: 'object',
//         properties: {
//           domain: {
//             type: 'string',
//             description: 'The domain name to look up (e.g., example.com).',
//           },
//           domain_id: {
//             type: 'string',
//             description: 'The UUID of the domain record in the database (if known).',
//           },
//         },
//         required: ['domain'],
//       },
//     },
//   },
//   {
//     type: 'function' as const,
//     function: {
//       name: 'whois_lookup',
//       description: 'Look up WHOIS/RDAP registration data for a domain: registrar, registration dates, expiry, nameservers, and contact info (if not privacy-protected). Great for verifying domain ownership and age. Costs 1 credit.',
//       parameters: {
//         type: 'object',
//         properties: {
//           domain: {
//             type: 'string',
//             description: 'The domain name to look up (e.g., example.com).',
//           },
//           domain_id: {
//             type: 'string',
//             description: 'The UUID of the domain record in the database (if known).',
//           },
//         },
//         required: ['domain'],
//       },
//     },
//   },
//   // =====================================================
//   // IP Intelligence - Geolocation & Reverse DNS
//   // =====================================================
//   {
//     type: 'function' as const,
//     function: {
//       name: 'ip_geolocation',
//       description: 'Geolocate an IP address: country, city, ISP, organization, ASN. Detects VPNs, proxies, and hosting providers. Essential for fraud detection. Costs 1 credit.',
//       parameters: {
//         type: 'object',
//         properties: {
//           ip: {
//             type: 'string',
//             description: 'The IP address to look up (IPv4 or IPv6).',
//           },
//           ip_id: {
//             type: 'string',
//             description: 'The UUID of the IP address record in the database (if known).',
//           },
//         },
//         required: ['ip'],
//       },
//     },
//   },
//   {
//     type: 'function' as const,
//     function: {
//       name: 'reverse_dns',
//       description: 'Reverse DNS lookup: find hostnames pointing to an IP address. Reveals what domains are hosted on a server. Costs 1 credit.',
//       parameters: {
//         type: 'object',
//         properties: {
//           ip: {
//             type: 'string',
//             description: 'The IP address to look up (IPv4 or IPv6).',
//           },
//           ip_id: {
//             type: 'string',
//             description: 'The UUID of the IP address record in the database (if known).',
//           },
//         },
//         required: ['ip'],
//       },
//     },
//   },
// ];

// Tool execution functions
type ToolContext = {
	organizationId: string;
	userId: string;
	planCode?: string | null;
};

async function verifySiteAccess(siteId: string, orgId: string): Promise<{ site: any; error?: string }> {
	const { data: site, error } = await supabase
		.from('sites')
		.select('id, name, url, niche, domain_authority, customer_description, organization_id')
		.eq('id', siteId)
		.eq('organization_id', orgId)
		.single();
	if (error || !site) return { site: null, error: 'Site not found or access denied' };
	return { site };
}

function hasScalePlan(planCode: string | null): boolean {
	if (!planCode) return false;
	const base = planCode.replace(/_test$/, '');
	return ['scale', 'pro'].includes(base);
}

export async function executeTool(
	toolName: string,
	args: Record<string, any>,
	context: ToolContext
): Promise<{ success: boolean; result: any; error?: string; creditsCost?: number }> {
	const { organizationId, userId, planCode } = context;
	try {
		switch (toolName) {
			case 'get_sites_summary': {
				const { data } = await supabase
					.from('sites')
					.select('id, name, url, niche, domain_authority')
					.eq('organization_id', organizationId)
					.order('created_at', { ascending: false });
				return { success: true, result: { sites: data || [], count: (data || []).length } };
			}
			case 'get_site_details': {
				const siteId = args.site_id;
				if (!siteId) return { success: false, result: null, error: 'site_id is required' };
				const { site, error } = await verifySiteAccess(siteId, organizationId);
				if (error) return { success: false, result: null, error };
				return { success: true, result: site };
			}
			case 'get_clusters_summary': {
				const siteId = args.site_id;
				if (!siteId) return { success: false, result: null, error: 'site_id is required' };
				const { error } = await verifySiteAccess(siteId, organizationId);
				if (error) return { success: false, result: null, error };
				const { data } = await supabase
					.from('clusters')
					.select('id, target_keyword, title, destination_page_url, status')
					.eq('site_id', siteId)
					.order('created_at', { ascending: false });
				return { success: true, result: { clusters: data || [], count: (data || []).length } };
			}
			case 'get_cluster_details': {
				const clusterId = args.cluster_id;
				if (!clusterId) return { success: false, result: null, error: 'cluster_id is required' };
				const { data: cluster } = await supabase
					.from('clusters')
					.select('id, target_keyword, title, site_id, destination_page_url, cluster_intelligence')
					.eq('id', clusterId)
					.single();
				if (!cluster) return { success: false, result: null, error: 'Cluster not found' };
				const { error } = await verifySiteAccess(cluster.site_id, organizationId);
				if (error) return { success: false, result: null, error };
				const { data: pages } = await supabase
					.from('pages')
					.select('id, keyword, title, type, funnel_stage, status')
					.eq('cluster_id', clusterId);
				return { success: true, result: { ...cluster, pages: pages || [] } };
			}
			case 'get_page_summary': {
				const pageId = args.page_id;
				if (!pageId) return { success: false, result: null, error: 'page_id is required' };
				const { data: page } = await supabase
					.from('pages')
					.select('id, keyword, title, type, page_type, funnel_stage, status, site_id')
					.eq('id', pageId)
					.single();
				if (!page) return { success: false, result: null, error: 'Page not found' };
				const { error } = await verifySiteAccess(page.site_id, organizationId);
				if (error) return { success: false, result: null, error };
				return { success: true, result: page };
			}
			case 'get_audit_summary': {
				const siteId = args.site_id;
				if (!siteId) return { success: false, result: null, error: 'site_id is required' };
				const { error } = await verifySiteAccess(siteId, organizationId);
				if (error) return { success: false, result: null, error };
				const { data: audit } = await supabase
					.from('audit_results')
					.select('overall_score, health_status, crawl_total_pages, crawl_total_issues, crawl_critical_issues, recommendations, created_at')
					.eq('site_id', siteId)
					.order('created_at', { ascending: false })
					.limit(1)
					.maybeSingle();
				if (!audit) return { success: true, result: { message: 'No audit run yet for this site. Run a technical audit from the Technical SEO page.' } };
				return { success: true, result: audit };
			}
			case 'get_weekly_priority_stack': {
				const siteId = args.site_id;
				if (!siteId) return { success: false, result: null, error: 'site_id is required' };
				const { error } = await verifySiteAccess(siteId, organizationId);
				if (error) return { success: false, result: null, error };
				const items: Array<{ title: string; description: string; actionUrl: string }> = [];
				const { data: org } = await supabase
					.from('organizations')
					.select('included_credits_remaining, included_credits_monthly')
					.eq('id', organizationId)
					.single();
				if (org) {
					const remaining = Number(org.included_credits_remaining ?? 0);
					const monthly = Number(org.included_credits_monthly ?? 1);
					if (monthly > 0 && remaining / monthly < 0.2) {
						items.push({ title: 'Credits running low', description: `${remaining} of ${monthly} remaining`, actionUrl: '/billing' });
					}
				}
				const { data: clusterRows } = await supabase.from('clusters').select('id').eq('site_id', siteId);
				const clusterIds = (clusterRows ?? []).map((c) => c.id);
				if (clusterIds.length > 0) {
					const { data: lowPages } = await supabase
						.from('pages')
						.select('id, title, seo_score')
						.in('cluster_id', clusterIds)
						.eq('status', 'published')
						.or('seo_score.lt.70,seo_score.is.null');
					for (const p of (lowPages ?? []).slice(0, 3)) {
						items.push({ title: `Improve: ${p.title}`, description: `SEO score ${p.seo_score ?? '—'}/115`, actionUrl: `/workspace/${p.id}` });
					}
				}
				return { success: true, result: { items, count: items.length } };
			}
			case 'get_refresh_queue': {
				const siteId = args.site_id;
				if (!siteId) return { success: false, result: null, error: 'site_id is required' };
				const { error } = await verifySiteAccess(siteId, organizationId);
				if (error) return { success: false, result: null, error };
				const { data: site } = await supabase.from('sites').select('url').eq('id', siteId).single();
				const siteUrl = (site as { url?: string })?.url ?? null;
				const { data: pages } = await supabase
					.from('pages')
					.select('id, title, keyword, published_url, updated_at, last_updated_meaningful')
					.eq('site_id', siteId)
					.eq('status', 'published');
				const staleMonths = 6;
				const staleDate = new Date();
				staleDate.setMonth(staleDate.getMonth() - staleMonths);
				const stale = (pages || []).filter((p) => {
					const d = p.last_updated_meaningful || p.updated_at;
					return d && new Date(d) < staleDate;
				});
				return { success: true, result: { items: stale.slice(0, 10), count: stale.length, message: stale.length ? `${stale.length} pages may need refresh` : 'No stale pages' } };
			}
			case 'suggest_next_actions': {
				const siteId = args.site_id;
				const clusterId = args.cluster_id;
				if (!siteId && !clusterId) {
					const { data: sites } = await supabase
						.from('sites')
						.select('id, name')
						.eq('organization_id', organizationId)
						.limit(5);
					return { success: true, result: { suggestions: ['List your sites with get_sites_summary to see what you have.', 'Run get_audit_summary for a site to check technical health.', 'Check get_weekly_priority_stack for recommended actions.'], sites: sites || [] } };
				}
				const suggestions: string[] = [];
				if (siteId) {
					const { error } = await verifySiteAccess(siteId, organizationId);
					if (error) return { success: false, result: null, error };
					suggestions.push('Review your clusters with get_clusters_summary.', 'Check get_audit_summary for technical issues.', 'See get_weekly_priority_stack for top priorities.');
				}
				if (clusterId) {
					suggestions.push('Review cluster pages with get_cluster_details.', 'Check for content gaps and funnel alignment.');
				}
				return { success: true, result: { suggestions } };
			}
			case 'trigger_technical_audit': {
				if (!hasScalePlan(planCode ?? null)) {
					return { success: false, result: null, error: 'Technical audits require Scale or Pro plan. Upgrade to run audits from the assistant.' };
				}
				const siteId = args.site_id;
				if (!siteId) return { success: false, result: null, error: 'site_id is required' };
				const { site, error } = await verifySiteAccess(siteId, organizationId);
				if (error) return { success: false, result: null, error };
				const { CREDIT_COSTS } = await import('../utils/credits.js');
				const cost = CREDIT_COSTS.SITE_CRAWL;
				const { data: org } = await supabase
					.from('organizations')
					.select('included_credits_remaining, included_credits')
					.eq('id', organizationId)
					.single();
				const creditsRemaining = Number(org?.included_credits_remaining ?? org?.included_credits ?? 0);
				if (creditsRemaining < cost) {
					return { success: false, result: null, error: `Insufficient credits. Need ${cost}, have ${creditsRemaining}. Add credits in Billing.` };
				}
				const newCredits = Math.max(0, creditsRemaining - cost);
				await supabase
					.from('organizations')
					.update({ included_credits_remaining: newCredits, included_credits: org?.included_credits != null ? newCredits : undefined })
					.eq('id', organizationId);
				const { technicalAuditService } = await import('./technicalAuditService.js');
				technicalAuditService.runFullAudit(site.url, siteId, organizationId).catch((e) => {
					console.error('[AI Tools] Audit failed:', e);
					supabase.from('organizations').update({ included_credits_remaining: creditsRemaining }).eq('id', organizationId);
				});
				return { success: true, result: { message: `Audit started for ${site.name}. Results will appear in Technical SEO in a few minutes.`, creditsUsed: cost }, creditsCost: cost };
			}
			default:
				return { success: false, result: null, error: `Unknown tool: ${toolName}` };
		}
	} catch (e) {
		console.error(`[AI Tool] Error executing ${toolName}:`, e);
		return { success: false, result: null, error: e instanceof Error ? e.message : 'Tool execution failed' };
	}
}
// export async function executeTool(
//   toolName: string,
//   args: Record<string, any>,
//   context: {
//     organizationId: string;
//     userId: string;
//     seatId?: string;
//   }
// ): Promise<{ success: boolean; result: any; error?: string; creditsCost?: number }> {
//   try {
//     switch (toolName) {
//       case 'run_public_presence':
//         return await executePublicPresence(args, context);
//       case 'cancel_scan':
//         return await executeCancelScan(args as any, context);
//       case 'lookup_phone':
//         return await executeLookupPhone(args, context);
//       case 'lookup_email':
//         return await executeLookupEmail(args, context);
//       case 'search_case_entities':
//         return await executeSearchEntities(args, context);
//       case 'get_person_summary':
//         return await executeGetPersonSummary(args, context);
//       case 'add_case_note':
//         return await executeAddNote(args, context);
//       case 'draft_report_section':
//         return await executeDraftReport(args, context);
//       case 'create_entity':
//         return await executeCreateEntity(args, context);
//       case 'suggest_next_steps':
//         return await executeSuggestNextSteps(args, context);
//       case 'search_business_emails':
//         return await executeSearchBusinessEmails(args, context);
//       case 'get_business_summary':
//         return await executeGetBusinessSummary(args, context);
//       case 'explain_capability':
//         return await executeExplainCapability(args);
//       case 'find_subject_for_action':
//         return await executeFindSubjectForAction(args as any, context);
//       case 'create_subject':
//         return await executeCreateSubject(args as any, context);
//       // Hunter.io tools
//       case 'hunter_domain_search':
//         return await executeHunterDomainSearch(args as any, context);
//       case 'hunter_email_finder':
//         return await executeHunterEmailFinder(args as any, context);
//       case 'hunter_email_verify':
//         return await executeHunterEmailVerify(args as any, context);
//       case 'hunter_enrich_person':
//         return await executeHunterEnrichPerson(args as any, context);
//       case 'hunter_enrich_company':
//         return await executeHunterEnrichCompany(args as any, context);
//       case 'hunter_full_enrichment':
//         return await executeHunterFullEnrichment(args as any, context);
//       case 'hunter_email_count':
//         return await executeHunterEmailCount(args as any, context);
//       // Holehe tools
//       case 'holehe_check_email':
//         return await executeHoleheCheckEmail(args as any, context);
//       // Sherlock tools
//       case 'search_username_accounts':
//         return await executeUsernameSearch(args as any, context);
//       // HIBP tools
//       case 'check_email_breaches':
//         return await executeBreachCheck(args as any, context);
//       // Dehashed tools
//       case 'deep_breach_search':
//         return await executeDeepBreachSearch(args as any, context);
//       // Court tools
//       case 'search_court_records':
//         return await executeCourtRecordSearch(args as any, context);
//       case 'search_party_records':
//         return await executePartyRecordSearch(args as any, context);
//       case 'search_bankruptcy_records':
//         return await executeBankruptcySearch(args as any, context);
//       case 'search_judge_records':
//         return await executeJudgeSearch(args as any, context);
//       case 'search_financial_disclosures':
//         return await executeFinancialDisclosureSearch(args as any, context);
//       // Phone lookup
//       case 'phone_carrier_lookup':
//         return await executePhoneCarrierLookup(args as any, context);
//       // Domain intelligence
//       case 'dns_lookup':
//         return await executeDnsLookup(args as any, context);
//       case 'whois_lookup':
//         return await executeWhoisLookup(args as any, context);
//       // IP intelligence
//       case 'ip_geolocation':
//         return await executeIpGeolocation(args as any, context);
//       case 'reverse_dns':
//         return await executeReverseDns(args as any, context);
//       default:
//         return { success: false, result: null, error: `Unknown tool: ${toolName}` };
//     }
//   } catch (e) {
//     console.error(`[AI Tool] Error executing ${toolName}:`, e);
//     return {
//       success: false,
//       result: null,
//       error: e instanceof Error ? e.message : 'Tool execution failed'
//     };
//   }
// }

// // Return type for all tools
// type ToolResult = { success: boolean; result: any; error?: string; creditsCost: number };

// // Individual tool implementations

// async function executePublicPresence(
//   args: any,
//   context: { organizationId: string; userId: string; seatId?: string }
// ): Promise<ToolResult> {
//   const { entity_type, entity_id, full_name, location, company, domain } = args;

//   if (!entity_type || !entity_id) {
//     return {
//       success: false,
//       result: null,
//       error: 'Entity type and ID are required. Use find_subject_for_action first to find or create the subject.',
//       creditsCost: 0,
//     };
//   }

//   // Build the seed data
//   const seed: Record<string, any> = {
//     fullName: full_name,
//   };
//   if (location) seed.location = location;
//   if (company) seed.company = company;
//   if (domain) seed.domain = domain;

//   try {
//     // Create the public presence run
//     // Schema: id, entity_type, entity_id, status, template_version, params (jsonb), created_at, created_by
//     const { data: run, error: runError } = await supabase
//       .from('public_presence_runs')
//       .insert({
//         entity_type: entity_type,
//         entity_id: entity_id,
//         status: 'running',
//         template_version: 'v1',
//         params: seed, // Store seed data in params jsonb column
//         created_by: context.userId,
//       })
//       .select('id')
//       .single();

//     if (runError) {
//       console.error('[AI Tool] Failed to create public presence run:', runError);
//       return {
//         success: false,
//         result: null,
//         error: `Failed to create run: ${runError.message}`,
//         creditsCost: 0,
//       };
//     }

//     // Trigger the run asynchronously via internal HTTP call
//     const apiBase = process.env.API_BASE_URL || 'http://localhost:3000';

//     // Get auth token for the internal call
//     const { data: { session } } = await supabase.auth.getSession();

//     fetch(`${apiBase}/api/public-presence/run`, {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//         'x-organization-id': context.organizationId,
//         'Authorization': session?.access_token ? `Bearer ${session.access_token}` : '',
//       },
//       body: JSON.stringify({
//         entityType: entity_type,
//         entityId: entity_id,
//         seed: seed,
//         runId: run.id, // Pass existing run ID to update instead of create
//       }),
//     }).catch(e => console.error('[AI Tool] Background run trigger failed:', e));

//     return {
//       success: true,
//       result: {
//         run_id: run.id,
//         entity_type: entity_type,
//         entity_id: entity_id,
//         message: `Started Public Presence scan for "${full_name}". This typically takes 1-2 minutes. You can view progress in the run details.`,
//         status: 'running',
//       },
//       creditsCost: 15,
//     };
//   } catch (e) {
//     console.error('[AI Tool] executePublicPresence error:', e);
//     return {
//       success: false,
//       result: null,
//       error: e instanceof Error ? e.message : 'Failed to start scan',
//       creditsCost: 0,
//     };
//   }
// }

// async function executeCancelScan(
//   args: { run_id: string; entity_name?: string },
//   context: { organizationId: string }
// ): Promise<ToolResult> {
//   const { run_id, entity_name } = args;

//   if (!run_id) {
//     return {
//       success: false,
//       result: null,
//       error: 'Run ID is required to cancel a scan.',
//       creditsCost: 0,
//     };
//   }

//   try {
//     // Check if run exists and belongs to this org
//     const { data: run, error: fetchError } = await supabase
//       .from('public_presence_runs')
//       .select('id, status, entity_type, entity_id')
//       .eq('id', run_id)
//       .single();

//     if (fetchError || !run) {
//       return {
//         success: false,
//         result: null,
//         error: 'Scan not found or already completed.',
//         creditsCost: 0,
//       };
//     }

//     // Check if scan is actually running
//     if (run.status !== 'running' && run.status !== 'pending') {
//       return {
//         success: true,
//         result: {
//           message: `The scan is already ${run.status}. No need to cancel.`,
//           status: run.status,
//         },
//         creditsCost: 0,
//       };
//     }

//     // Update status to cancelled
//     const { error: updateError } = await supabase
//       .from('public_presence_runs')
//       .update({
//         status: 'cancelled',
//         updated_at: new Date().toISOString(),
//       })
//       .eq('id', run_id);

//     if (updateError) {
//       console.error('[AI Tool] Failed to cancel scan:', updateError);
//       return {
//         success: false,
//         result: null,
//         error: 'Failed to cancel scan.',
//         creditsCost: 0,
//       };
//     }

//     const displayName = entity_name || 'the subject';
//     return {
//       success: true,
//       result: {
//         run_id: run_id,
//         message: `Successfully cancelled the Public Presence scan for ${displayName}. Would you like to start a new scan?`,
//         status: 'cancelled',
//       },
//       creditsCost: 0,
//     };
//   } catch (e) {
//     console.error('[AI Tool] executeCancelScan error:', e);
//     return {
//       success: false,
//       result: null,
//       error: e instanceof Error ? e.message : 'Failed to cancel scan',
//       creditsCost: 0,
//     };
//   }
// }

// async function executeLookupPhone(
//   args: any,
//   context: { organizationId: string }
// ): Promise<ToolResult> {
//   // Look up existing phone data
//   const { data: phone, error } = await supabase
//     .from('phones')
//     .select('*')
//     .eq('organization_id', context.organizationId)
//     .or(`number_e164.ilike.%${args.phone_number.replace(/\D/g, '')}%,number_raw.ilike.%${args.phone_number}%`)
//     .limit(5);

//   if (error) {
//     return { success: false, result: null, error: error.message, creditsCost: 0 };
//   }

//   if (phone && phone.length > 0) {
//     return {
//       success: true,
//       result: {
//         found_in_database: true,
//         records: phone,
//         message: `Found ${phone.length} matching phone record(s) in your database.`,
//       },
//       creditsCost: 0, // No cost for database lookup
//     };
//   }

//   // If not found, indicate that an external lookup would be needed
//   return {
//     success: true,
//     result: {
//       found_in_database: false,
//       message: `Phone number "${args.phone_number}" not found in your records. Would you like me to run an external lookup? (8 credits)`,
//       requires_external_lookup: true,
//       params: args,
//     },
//     creditsCost: 0,
//   };
// }

// async function executeLookupEmail(
//   args: any,
//   context: { organizationId: string }
// ): Promise<ToolResult> {
//   const { data: emails, error } = await supabase
//     .from('emails')
//     .select('*')
//     .eq('organization_id', context.organizationId)
//     .ilike('address', args.email)
//     .limit(5);

//   if (error) {
//     return { success: false, result: null, error: error.message, creditsCost: 0 };
//   }

//   if (emails && emails.length > 0) {
//     return {
//       success: true,
//       result: {
//         found_in_database: true,
//         records: emails,
//         message: `Found ${emails.length} matching email record(s) in your database.`,
//       },
//       creditsCost: 0,
//     };
//   }

//   return {
//     success: true,
//     result: {
//       found_in_database: false,
//       message: `Email "${args.email}" not found in your records. Would you like me to run an external lookup? (5 credits)`,
//       requires_external_lookup: true,
//       params: args,
//     },
//     creditsCost: 0,
//   };
// }

// async function executeSearchEntities(
//   args: any,
//   context: { organizationId: string }
// ): Promise<ToolResult> {
//   const results: Record<string, any[]> = {};
//   const query = args.query.toLowerCase();
//   const searchType = args.entity_type || 'all';

//   // Search people
//   if (searchType === 'all' || searchType === 'person') {
//     const { data: people } = await supabase
//       .from('people')
//       .select('id, first_name, last_name, middle_name, created_at')
//       .eq('organization_id', context.organizationId)
//       .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
//       .limit(10);
//     if (people?.length) results.people = people;
//   }

//   // Search emails
//   if (searchType === 'all' || searchType === 'email') {
//     const { data: emails } = await supabase
//       .from('emails')
//       .select('id, address, created_at')
//       .eq('organization_id', context.organizationId)
//       .ilike('address', `%${query}%`)
//       .limit(10);
//     if (emails?.length) results.emails = emails;
//   }

//   // Search phones
//   if (searchType === 'all' || searchType === 'phone') {
//     const { data: phones } = await supabase
//       .from('phones')
//       .select('id, number_e164, number_raw, created_at')
//       .eq('organization_id', context.organizationId)
//       .or(`number_e164.ilike.%${query}%,number_raw.ilike.%${query}%`)
//       .limit(10);
//     if (phones?.length) results.phones = phones;
//   }

//   const totalFound = Object.values(results).reduce((sum, arr) => sum + arr.length, 0);

//   return {
//     success: true,
//     result: {
//       query: args.query,
//       total_found: totalFound,
//       results,
//       message: totalFound > 0
//         ? `Found ${totalFound} matching entities for "${args.query}".`
//         : `No entities found matching "${args.query}".`,
//     },
//     creditsCost: 0,
//   };
// }

// async function executeGetPersonSummary(
//   args: any,
//   context: { organizationId: string }
// ): Promise<ToolResult> {
//   // Get person details
//   const { data: person, error: personErr } = await supabase
//     .from('people')
//     .select('*')
//     .eq('id', args.person_id)
//     .eq('organization_id', context.organizationId)
//     .single();

//   if (personErr || !person) {
//     return { success: false, result: null, error: 'Person not found', creditsCost: 0 };
//   }

//   // Get linked entities via edges
//   const { data: edges } = await supabase
//     .from('entity_edges')
//     .select('target_type, target_id, confidence_score, transform_type')
//     .eq('source_type', 'person')
//     .eq('source_id', args.person_id)
//     .limit(50);

//   // Get linked emails, phones, profiles
//   const linkedEntities: Record<string, any[]> = {
//     emails: [],
//     phones: [],
//     social_profiles: [],
//     domains: [],
//   };

//   if (edges?.length) {
//     const emailIds = edges.filter(e => e.target_type === 'email').map(e => e.target_id);
//     const phoneIds = edges.filter(e => e.target_type === 'phone').map(e => e.target_id);
//     const profileIds = edges.filter(e => e.target_type === 'social_profile').map(e => e.target_id);

//     if (emailIds.length) {
//       const { data } = await supabase.from('emails').select('id, address').in('id', emailIds);
//       linkedEntities.emails = data || [];
//     }
//     if (phoneIds.length) {
//       const { data } = await supabase.from('phones').select('id, number_e164').in('id', phoneIds);
//       linkedEntities.phones = data || [];
//     }
//     if (profileIds.length) {
//       const { data } = await supabase.from('social_profiles').select('id, platform, handle, url').in('id', profileIds);
//       linkedEntities.social_profiles = data || [];
//     }
//   }

//   // Get recent runs
//   const { data: runs } = await supabase
//     .from('public_presence_runs')
//     .select('id, status, created_at')
//     .eq('entity_type', 'person')
//     .eq('entity_id', args.person_id)
//     .order('created_at', { ascending: false })
//     .limit(5);

//   const fullName = [person.first_name, person.middle_name, person.last_name].filter(Boolean).join(' ');

//   return {
//     success: true,
//     result: {
//       person_id: person.id,
//       person: {
//         id: person.id,
//         name: fullName,
//         created_at: person.created_at,
//       },
//       linked_entities: linkedEntities,
//       recent_runs: runs || [],
//       message: `${fullName} has ${linkedEntities.emails.length} email(s), ${linkedEntities.phones.length} phone(s), and ${linkedEntities.social_profiles.length} social profile(s).`,
//     },
//     creditsCost: 0,
//   };
// }

// async function executeAddNote(
//   args: any,
//   context: { organizationId: string; userId: string }
// ): Promise<ToolResult> {
//   // For now, we'll store notes in a general notes table or as case activity
//   // This is a placeholder - actual implementation depends on your notes schema
//   return {
//     success: true,
//     result: {
//       message: `Note added to case: "${args.content.slice(0, 100)}${args.content.length > 100 ? '...' : ''}"`,
//       category: args.category || 'general',
//       note_preview: args.content,
//     },
//     creditsCost: 0,
//   };
// }

// async function executeDraftReport(
//   args: any,
//   context: { organizationId: string }
// ): Promise<ToolResult> {
//   // Get person data for the report
//   const summaryResult = await executeGetPersonSummary(args, context);
//   if (!summaryResult.success) {
//     return { success: false, result: null, error: 'Could not get person data', creditsCost: 0 };
//   }

//   const personData = summaryResult.result;

//   return {
//     success: true,
//     result: {
//       section_type: args.section_type,
//       person_data: personData,
//       message: `Ready to draft ${args.section_type.replace('_', ' ')} section. The AI will generate this based on the available data.`,
//       requires_ai_generation: true,
//     },
//     creditsCost: 3,
//   };
// }

// async function executeCreateEntity(
//   args: any,
//   context: { organizationId: string }
// ): Promise<ToolResult> {
//   let createdEntity: any = null;
//   let tableName = '';

//   switch (args.entity_type) {
//     case 'email':
//       tableName = 'emails';
//       const { data: email, error: emailErr } = await supabase
//         .from('emails')
//         .insert({
//           organization_id: context.organizationId,
//           address: args.value.toLowerCase(),
//           domain: args.value.includes('@') ? args.value.split('@')[1] : null,
//         })
//         .select()
//         .single();
//       if (emailErr) throw emailErr;
//       createdEntity = email;
//       break;

//     case 'phone':
//       tableName = 'phones';
//       const { data: phone, error: phoneErr } = await supabase
//         .from('phones')
//         .insert({
//           organization_id: context.organizationId,
//           number_raw: args.value,
//           number_e164: args.value.replace(/\D/g, ''),
//         })
//         .select()
//         .single();
//       if (phoneErr) throw phoneErr;
//       createdEntity = phone;
//       break;

//     case 'social_profile':
//       tableName = 'social_profiles';
//       const platform = detectPlatform(args.value);
//       const { data: profile, error: profileErr } = await supabase
//         .from('social_profiles')
//         .insert({
//           organization_id: context.organizationId,
//           url: args.value,
//           handle: extractHandle(args.value),
//           platform: platform || 'unknown',
//         })
//         .select()
//         .single();
//       if (profileErr) throw profileErr;
//       createdEntity = profile;
//       break;

//     default:
//       return { success: false, result: null, error: `Unsupported entity type: ${args.entity_type}`, creditsCost: 0 };
//   }

//   // Link to person if specified
//   if (args.link_to_person_id && createdEntity) {
//     await supabase.from('entity_edges').insert({
//       source_type: 'person',
//       source_id: args.link_to_person_id,
//       target_type: args.entity_type,
//       target_id: createdEntity.id,
//       transform_type: 'ai_assistant',
//       confidence_score: 0.9,
//       retrieved_at: new Date().toISOString(),
//     });
//   }

//   // Return proper ID fields for resultPath
//   const idField = args.entity_type === 'email' ? 'email_id'
//     : args.entity_type === 'phone' ? 'phone_id'
//     : args.entity_type === 'social_profile' ? 'profile_id'
//     : 'entity_id';

//   return {
//     success: true,
//     result: {
//       [idField]: createdEntity?.id,
//       created: createdEntity,
//       entity_type: args.entity_type,
//       linked_to_person: !!args.link_to_person_id,
//       message: `Created ${args.entity_type}: ${args.value}`,
//     },
//     creditsCost: 0,
//   };
// }

// async function executeSuggestNextSteps(
//   args: any,
//   context: { organizationId: string }
// ): Promise<ToolResult> {
//   // Get current state
//   const summaryResult = await executeGetPersonSummary(args, context);
//   if (!summaryResult.success) {
//     return { success: false, result: null, error: 'Could not analyze case', creditsCost: 0 };
//   }

//   const data = summaryResult.result;
//   const suggestions: string[] = [];

//   // Analyze gaps and suggest
//   if (data.linked_entities.emails.length === 0) {
//     suggestions.push('No email addresses on record. Consider running a public presence scan to discover email addresses.');
//   }
//   if (data.linked_entities.phones.length === 0) {
//     suggestions.push('No phone numbers on record. Try searching public records or running a phone discovery action.');
//   }
//   if (data.linked_entities.social_profiles.length === 0) {
//     suggestions.push('No social profiles linked. A public presence scan can help discover LinkedIn, Twitter, and other profiles.');
//   }
//   if (data.recent_runs.length === 0) {
//     suggestions.push('No previous scans run for this subject. Starting with a Public Presence scan is recommended.');
//   }

//   if (suggestions.length === 0) {
//     suggestions.push('Good coverage so far! Consider verifying the found information or expanding the search to known associates.');
//   }

//   return {
//     success: true,
//     result: {
//       current_state: {
//         emails: data.linked_entities.emails.length,
//         phones: data.linked_entities.phones.length,
//         social_profiles: data.linked_entities.social_profiles.length,
//         runs_completed: data.recent_runs.length,
//       },
//       suggestions,
//       focus_area: args.focus_area || 'general',
//       message: `Based on the current case state, here are my suggestions:\n\n${suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')}`,
//     },
//     creditsCost: 0,
//   };
// }

// async function executeSearchBusinessEmails(
//   args: any,
//   context: { organizationId: string }
// ): Promise<ToolResult> {
//   const companyName = args.company_name || '';
//   const domain = args.domain || '';

//   // First, try to find the business in the database
//   const { data: businesses } = await supabase
//     .from('businesses')
//     .select('id, name, domain, website')
//     .eq('organization_id', context.organizationId)
//     .or(`name.ilike.%${companyName}%,domain.ilike.%${domain || companyName}%`)
//     .limit(5);

//   // Look for emails with this domain
//   let searchDomain = domain;
//   if (!searchDomain && businesses?.length) {
//     searchDomain = businesses[0].domain || extractDomainFromUrl(businesses[0].website);
//   }
//   if (!searchDomain && companyName) {
//     // Try to guess domain from company name
//     searchDomain = companyName.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com';
//   }

//   // Find or create domain record for linking
//   let domainId: string | null = null;
//   if (searchDomain) {
//     const { data: existingDomain } = await supabase
//       .from('domains')
//       .select('id')
//       .eq('organization_id', context.organizationId)
//       .ilike('name', searchDomain)
//       .maybeSingle();

//     if (existingDomain) {
//       domainId = existingDomain.id;
//     } else {
//       const { data: newDomain } = await supabase
//         .from('domains')
//         .insert({ organization_id: context.organizationId, name: searchDomain })
//         .select('id')
//         .single();
//       if (newDomain) domainId = newDomain.id;
//     }
//   }

//   let emails: any[] = [];
//   if (searchDomain) {
//     const { data } = await supabase
//       .from('emails')
//       .select('id, address, created_at')
//       .eq('organization_id', context.organizationId)
//       .ilike('address', `%@${searchDomain}%`)
//       .limit(20);
//     emails = data || [];
//   }

//   const businessId = businesses?.[0]?.id || null;

//   if (emails.length > 0) {
//     return {
//       success: true,
//       result: {
//         company: companyName,
//         domain: searchDomain,
//         domain_id: domainId,
//         business_id: businessId,
//         emails_found: emails.length,
//         emails: emails.map(e => e.address),
//         message: `Found ${emails.length} email(s) for ${companyName || searchDomain}.`,
//       },
//       creditsCost: 0, // Database lookup is free
//     };
//   }

//   return {
//     success: true,
//     result: {
//       company: companyName,
//       domain: searchDomain,
//       domain_id: domainId,
//       business_id: businessId,
//       emails_found: 0,
//       message: `No emails found for ${companyName || searchDomain}. Use Email Discovery (5 credits) to find them.`,
//     },
//     creditsCost: 0,
//   };
// }

// async function executeGetBusinessSummary(
//   args: any,
//   context: { organizationId: string }
// ): Promise<ToolResult> {
//   let businessId = args.business_id;

//   // If no ID, try to find by name
//   if (!businessId && args.business_name) {
//     const { data } = await supabase
//       .from('businesses')
//       .select('id')
//       .eq('organization_id', context.organizationId)
//       .ilike('name', `%${args.business_name}%`)
//       .limit(1)
//       .single();
//     businessId = data?.id;
//   }

//   if (!businessId) {
//     return {
//       success: false,
//       result: null,
//       error: `Business not found. Try searching with search_case_entities first.`,
//       creditsCost: 0,
//     };
//   }

//   // Get business details
//   const { data: business, error: bizErr } = await supabase
//     .from('businesses')
//     .select('*')
//     .eq('id', businessId)
//     .eq('organization_id', context.organizationId)
//     .single();

//   if (bizErr || !business) {
//     return { success: false, result: null, error: 'Business not found', creditsCost: 0 };
//   }

//   // Get linked entities via edges
//   const { data: edges } = await supabase
//     .from('entity_edges')
//     .select('target_type, target_id, confidence_score')
//     .eq('source_type', 'business')
//     .eq('source_id', businessId)
//     .limit(50);

//   const linkedEntities: Record<string, any[]> = {
//     emails: [],
//     phones: [],
//     people: [],
//     domains: [],
//   };

//   if (edges?.length) {
//     const emailIds = edges.filter(e => e.target_type === 'email').map(e => e.target_id);
//     const phoneIds = edges.filter(e => e.target_type === 'phone').map(e => e.target_id);
//     const personIds = edges.filter(e => e.target_type === 'person').map(e => e.target_id);

//     if (emailIds.length) {
//       const { data } = await supabase.from('emails').select('id, address').in('id', emailIds);
//       linkedEntities.emails = data || [];
//     }
//     if (phoneIds.length) {
//       const { data } = await supabase.from('phones').select('id, number_e164').in('id', phoneIds);
//       linkedEntities.phones = data || [];
//     }
//     if (personIds.length) {
//       const { data } = await supabase.from('people').select('id, first_name, last_name').in('id', personIds);
//       linkedEntities.people = data || [];
//     }
//   }

//   // Get recent runs
//   const { data: runs } = await supabase
//     .from('public_presence_runs')
//     .select('id, status, created_at')
//     .eq('entity_type', 'business')
//     .eq('entity_id', businessId)
//     .order('created_at', { ascending: false })
//     .limit(5);

//   return {
//     success: true,
//     result: {
//       business_id: business.id,
//       business: {
//         id: business.id,
//         name: business.name,
//         domain: business.domain,
//         website: business.website,
//         created_at: business.created_at,
//       },
//       linked_entities: linkedEntities,
//       recent_runs: runs || [],
//       message: `${business.name} has ${linkedEntities.emails.length} email(s), ${linkedEntities.phones.length} phone(s), and ${linkedEntities.people.length} linked person(s).`,
//     },
//     creditsCost: 0,
//   };
// }

// async function executeExplainCapability(
//   args: any
// ): Promise<ToolResult> {
//   const request = (args.user_request || '').toLowerCase();

//   // Knowledge base of what True Sight can and cannot do
//   const capabilities: Record<string, { canDo: boolean; explanation: string; alternative?: string }> = {
//     'find person email': {
//       canDo: false,
//       explanation: 'There is no direct "find emails for a person" action. Emails are typically discovered through other methods.',
//       alternative: `To find someone's email:\n1. **Public Presence scan** (15 credits) - Searches the web and may find emails in profiles, resumes, or contact pages\n2. **If you know their employer**: Run "Discover Emails" on the company domain (5 credits), then look for their name pattern\n3. **Check their LinkedIn** - Often shows email or you can deduce from company domain`,
//     },
//     'find person phone': {
//       canDo: false,
//       explanation: 'There is no direct "find phone for a person" action without additional context.',
//       alternative: `To find someone's phone:\n1. **Public Presence scan** (15 credits) - May find contact info in public profiles\n2. **Discover Phones** (8 credits) - If they're linked to a business in your records\n3. **Property records** via Discover Properties (8 credits) - May have associated phone numbers`,
//     },
//     'find company email': {
//       canDo: true,
//       explanation: 'You can discover emails for a company/domain using the "Discover Emails" action (5 credits) or by running a Public Presence scan on the business.',
//       alternative: 'I can help you run this. What company would you like to search?',
//     },
//     'find address': {
//       canDo: false,
//       explanation: 'There is no direct address lookup, but property records can help.',
//       alternative: `To find addresses:\n1. **Discover Properties** (8 credits) - Searches public property records\n2. **Public Presence scan** (15 credits) - May find addresses mentioned in public profiles or documents`,
//     },
//     'find employer': {
//       canDo: false,
//       explanation: 'There is no direct employer lookup action.',
//       alternative: `To find where someone works:\n1. **Public Presence scan** (15 credits) - Searches LinkedIn, company pages, and professional profiles\n2. This often reveals current and past employers`,
//     },
//     'find social media': {
//       canDo: true,
//       explanation: 'Yes! The Public Presence scan (15 credits) searches for social profiles including LinkedIn, Twitter, Facebook, Instagram, and GitHub.',
//       alternative: 'I can run a Public Presence scan for you. Who would you like to search?',
//     },
//     'verify email': {
//       canDo: true,
//       explanation: 'You can look up an email address to check if it exists in your records and get details.',
//       alternative: 'I can look that up. What email address would you like to verify?',
//     },
//   };

//   // Match request to capabilities
//   let bestMatch: { canDo: boolean; explanation: string; alternative?: string } | null = null;
//   for (const [key, value] of Object.entries(capabilities)) {
//     if (request.includes(key.split(' ').slice(-2).join(' ')) ||
//         key.split(' ').some(word => request.includes(word) && word.length > 4)) {
//       bestMatch = value;
//       break;
//     }
//   }

//   if (!bestMatch) {
//     return {
//       success: true,
//       result: {
//         understood: false,
//         message: `I'm not sure what specific capability you're asking about. Here's what True Sight can do:\n\n**Discovery Actions:**\n- Public Presence (person/business) - 15 credits\n- Discover Emails (business/domain) - 5 credits\n- Discover Phones (person/business) - 8 credits\n- Discover Profiles (person) - 10 credits\n- Discover Properties (person) - 8 credits\n- Search Web Mentions (any) - 5 credits\n\n**Free Actions:**\n- Search your database\n- Create/link entities\n- Add notes\n- Draft reports\n\nWhat would you like to accomplish?`,
//       },
//       creditsCost: 0,
//     };
//   }

//   return {
//     success: true,
//     result: {
//       can_do: bestMatch.canDo,
//       explanation: bestMatch.explanation,
//       alternative: bestMatch.alternative,
//       message: bestMatch.canDo
//         ? `Yes, I can help with that! ${bestMatch.explanation}\n\n${bestMatch.alternative || ''}`
//         : `${bestMatch.explanation}\n\n**What you can do instead:**\n${bestMatch.alternative}`,
//     },
//     creditsCost: 0,
//   };
// }

// // Helper to extract domain from URL
// function extractDomainFromUrl(url: string | null): string | null {
//   if (!url) return null;
//   try {
//     const u = new URL(url.startsWith('http') ? url : `https://${url}`);
//     return u.hostname.replace(/^www\./, '');
//   } catch {
//     return null;
//   }
// }

// // Helper functions
// function detectPlatform(url: string): string | null {
//   const lower = url.toLowerCase();
//   if (lower.includes('linkedin.com')) return 'linkedin';
//   if (lower.includes('twitter.com') || lower.includes('x.com')) return 'twitter';
//   if (lower.includes('facebook.com')) return 'facebook';
//   if (lower.includes('instagram.com')) return 'instagram';
//   if (lower.includes('github.com')) return 'github';
//   if (lower.includes('tiktok.com')) return 'tiktok';
//   return null;
// }

// function extractHandle(url: string): string {
//   try {
//     const u = new URL(url);
//     const parts = u.pathname.split('/').filter(Boolean);
//     if (parts.length > 0) {
//       // LinkedIn: /in/username
//       if (u.hostname.includes('linkedin.com') && parts[0] === 'in' && parts[1]) {
//         return parts[1];
//       }
//       return parts[0].replace('@', '');
//     }
//   } catch {
//     // Not a URL, might be a handle
//     return url.replace('@', '');
//   }
//   return url;
// }

// // ============================================================
// // SUBJECT FINDER FOR ACTIONS
// // ============================================================

// // Define which entity types are valid for each action
// const ACTION_ENTITY_REQUIREMENTS: Record<string, { validTypes: ('person' | 'business')[]; description: string }> = {
//   public_presence_scan: {
//     validTypes: ['person', 'business'],
//     description: 'Public presence scans can be run on people or businesses',
//   },
//   person_summary: {
//     validTypes: ['person'],
//     description: 'Person summaries can only be run on people',
//   },
//   business_summary: {
//     validTypes: ['business'],
//     description: 'Business summaries can only be run on businesses',
//   },
//   business_email_search: {
//     validTypes: ['business'],
//     description: 'Business email search can only be run on businesses',
//   },
//   add_note: {
//     validTypes: ['person', 'business'],
//     description: 'Notes can be added to people or businesses',
//   },
//   draft_report: {
//     validTypes: ['person'],
//     description: 'Reports can currently only be drafted for people',
//   },
// };

// interface SubjectMatch {
//   id: string;
//   type: 'person' | 'business';
//   name: string;
//   display_name: string;
//   additional_info?: string;
//   created_at: string;
// }

// async function executeFindSubjectForAction(
//   args: { search_name: string; intended_action: string; entity_type_filter?: string },
//   context: { organizationId: string }
// ): Promise<ToolResult> {
//   const { search_name, intended_action, entity_type_filter } = args;
//   const queryFull = search_name.toLowerCase().trim();

//   // Split query into individual words for more lenient matching
//   const queryWords = queryFull.split(/\s+/).filter(w => w.length >= 2);

//   // Get action requirements
//   const requirements = ACTION_ENTITY_REQUIREMENTS[intended_action];
//   if (!requirements) {
//     // If unknown action, allow any type
//     console.log(`[AI Tool] Unknown action "${intended_action}", allowing all types`);
//   }

//   const validTypes = requirements?.validTypes || ['person', 'business'];
//   const matches: SubjectMatch[] = [];

//   // Search people if allowed
//   // Note: people table stores name as JSONB with { first, last, middle, given, family, prefix, suffix }
//   if (validTypes.includes('person') && (!entity_type_filter || entity_type_filter === 'person' || entity_type_filter === 'any')) {
//     // Build OR conditions for each word against name->>first, name->>last, name->>middle
//     const orConditions: string[] = [];
//     for (const word of queryWords) {
//       orConditions.push(`name->>first.ilike.%${word}%`);
//       orConditions.push(`name->>last.ilike.%${word}%`);
//       orConditions.push(`name->>middle.ilike.%${word}%`);
//       orConditions.push(`name->>given.ilike.%${word}%`);
//       orConditions.push(`name->>family.ilike.%${word}%`);
//     }
//     // Also try full query as fallback
//     orConditions.push(`name->>first.ilike.%${queryFull}%`);
//     orConditions.push(`name->>last.ilike.%${queryFull}%`);

//     console.log('[AI Tool] Searching people with:', {
//       orgId: context.organizationId,
//       queryWords,
//       orConditions: orConditions.slice(0, 5), // Just show first few
//     });

//     const { data: people, error: peopleError } = await supabase
//       .from('people')
//       .select('id, name, created_at')
//       .eq('organization_id', context.organizationId)
//       .or(orConditions.join(','))
//       .limit(15);

//     console.log('[AI Tool] People search result:', {
//       found: people?.length || 0,
//       error: peopleError?.message,
//       sample: people?.[0]?.name
//     });

//     if (people?.length) {
//       for (const p of people) {
//         // Extract name parts from JSONB
//         const nameData = p.name || {};
//         const firstName = nameData.first || nameData.given || '';
//         const lastName = nameData.last || nameData.family || '';
//         const middleName = nameData.middle || '';

//         const fullName = [firstName, middleName, lastName].filter(Boolean).join(' ');
//         const nameLower = fullName.toLowerCase();

//         // Calculate a simple match score
//         let score = 0;
//         for (const word of queryWords) {
//           if (nameLower.includes(word)) score += 2;
//           if (firstName?.toLowerCase() === word) score += 3; // Exact first name match
//           if (lastName?.toLowerCase() === word) score += 3; // Exact last name match
//         }
//         if (nameLower === queryFull) score += 10; // Exact full match

//         matches.push({
//           id: p.id,
//           type: 'person',
//           name: fullName,
//           display_name: fullName || 'Unknown',
//           additional_info: score >= 5 ? 'Strong match' : 'Partial match',
//           created_at: p.created_at,
//           _score: score,
//         } as SubjectMatch & { _score: number });
//       }
//     }
//   }

//   // Search businesses if allowed
//   if (validTypes.includes('business') && (!entity_type_filter || entity_type_filter === 'business' || entity_type_filter === 'any')) {
//     // Build OR conditions for each word
//     const orConditions: string[] = [];
//     for (const word of queryWords) {
//       orConditions.push(`name.ilike.%${word}%`);
//     }
//     orConditions.push(`name.ilike.%${queryFull}%`);

//     const { data: businesses } = await supabase
//       .from('businesses')
//       .select('id, name, domain, created_at')
//       .eq('organization_id', context.organizationId)
//       .or(orConditions.join(','))
//       .limit(15);

//     if (businesses?.length) {
//       for (const b of businesses) {
//         const nameLower = b.name.toLowerCase();

//         // Calculate match score
//         let score = 0;
//         for (const word of queryWords) {
//           if (nameLower.includes(word)) score += 2;
//         }
//         if (nameLower === queryFull) score += 10;

//         matches.push({
//           id: b.id,
//           type: 'business',
//           name: b.name,
//           display_name: b.name,
//           additional_info: b.domain || (score >= 5 ? 'Strong match' : 'Partial match'),
//           created_at: b.created_at,
//           _score: score,
//         } as SubjectMatch & { _score: number });
//       }
//     }
//   }

//   // Sort by score descending
//   matches.sort((a, b) => ((b as any)._score || 0) - ((a as any)._score || 0));

//   // Remove score from output and limit
//   const cleanMatches = matches.slice(0, 10).map(({ _score, ...rest }: any) => rest);

//   // Build response based on match count
//   if (cleanMatches.length === 0) {
//     return {
//       success: true,
//       result: {
//         found: false,
//         match_count: 0,
//         message: `No ${validTypes.join(' or ')} found matching "${search_name}".`,
//         valid_types: validTypes,
//         suggestion: `Would you like me to create a new ${validTypes[0]} record for "${search_name}"?`,
//         can_create: true,
//       },
//       creditsCost: 0,
//     };
//   }

//   if (cleanMatches.length === 1) {
//     const match = cleanMatches[0];
//     return {
//       success: true,
//       result: {
//         found: true,
//         match_count: 1,
//         exact_match: true,
//         subject: {
//           id: match.id,
//           type: match.type,
//           name: match.display_name,
//           additional_info: match.additional_info,
//         },
//         message: `Found ${match.type}: "${match.display_name}"${match.additional_info ? ` (${match.additional_info})` : ''}. Ready to proceed with ${intended_action.replace(/_/g, ' ')}.`,
//         ready_to_proceed: true,
//       },
//       creditsCost: 0,
//     };
//   }

//   // Multiple matches - ask user to clarify
//   const options = cleanMatches.map((m, i) => ({
//     option_number: i + 1,
//     id: m.id,
//     type: m.type,
//     name: m.display_name,
//     additional_info: m.additional_info,
//     added: new Date(m.created_at).toLocaleDateString(),
//   }));

//   return {
//     success: true,
//     result: {
//       found: true,
//       match_count: cleanMatches.length,
//       exact_match: false,
//       options,
//       message: `Found ${cleanMatches.length} possible matches for "${search_name}". Please specify which one (or ask me to create a new record if none match):`,
//       options_display: options.map(o =>
//         `${o.option_number}. ${o.name} (${o.type})${o.additional_info ? ` - ${o.additional_info}` : ''} - added ${o.added}`
//       ).join('\n'),
//       requires_selection: true,
//       can_create_new: true,
//     },
//     creditsCost: 0,
//   };
// }

// async function executeCreateSubject(
//   args: { entity_type: 'person' | 'business'; name: string; additional_info?: any },
//   context: { organizationId: string; userId: string }
// ): Promise<ToolResult> {
//   const { entity_type, name, additional_info } = args;

//   if (entity_type === 'person') {
//     // Parse name into parts
//     const nameParts = name.trim().split(/\s+/);
//     const firstName = nameParts[0] || '';
//     const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
//     const middleName = nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : null;

//     const { data: person, error } = await supabase
//       .from('people')
//       .insert({
//         organization_id: context.organizationId,
//         first_name: firstName,
//         middle_name: middleName,
//         last_name: lastName,
//         notes: additional_info?.notes || null,
//       })
//       .select()
//       .single();

//     if (error) {
//       return { success: false, result: null, error: error.message, creditsCost: 0 };
//     }

//     const fullName = [firstName, middleName, lastName].filter(Boolean).join(' ');
//     return {
//       success: true,
//       result: {
//         created: true,
//         entity_type: 'person',
//         person_id: person.id,
//         id: person.id,
//         name: fullName,
//         message: `Created person: ${fullName}`,
//       },
//       creditsCost: 0,
//     };
//   }

//   if (entity_type === 'business') {
//     const { data: business, error } = await supabase
//       .from('businesses')
//       .insert({
//         organization_id: context.organizationId,
//         name: name,
//         domain: additional_info?.domain || null,
//       })
//       .select()
//       .single();

//     if (error) {
//       return { success: false, result: null, error: error.message, creditsCost: 0 };
//     }

//     return {
//       success: true,
//       result: {
//         created: true,
//         entity_type: 'business',
//         business_id: business.id,
//         id: business.id,
//         name: business.name,
//         domain: business.domain,
//         message: `Created business: ${name}`,
//       },
//       creditsCost: 0,
//     };
//   }

//   return {
//     success: false,
//     result: null,
//     error: `Invalid entity type: ${entity_type}`,
//     creditsCost: 0,
//   };
// }

// // =====================================================
// // Hunter.io Tool Implementations
// // =====================================================

// import { spendCreditsForAction } from '../utils/credits.js';

// async function spendCreditsForTool(
//   orgId: string,
//   creditCost: number,
//   category: string,
//   description: string
// ): Promise<{ success: boolean; error?: string }> {
//   return spendCreditsForAction({ orgId, creditCost, category, description });
// }

// async function executeHunterDomainSearch(
//   args: { domain: string; type?: 'personal' | 'generic'; department?: string },
//   context: { organizationId: string; userId?: string }
// ): Promise<ToolResult> {
//   if (!hunter.isHunterConfigured()) {
//     return {
//       success: false,
//       result: null,
//       error: 'Email discovery service is not configured.',
//       creditsCost: 0,
//     };
//   }

//   const creditCost = hunter.HUNTER_CREDIT_COSTS.domainSearch;

//   // Spend credits
//   const spendResult = await spendCreditsForTool(
//     context.organizationId,
//     creditCost,
//     'hunter_domain_search',
//     `Domain search: ${args.domain}`
//   );

//   if (!spendResult.success) {
//     return {
//       success: false,
//       result: {
//         error: 'insufficient_credits',
//         message: `This action requires ${creditCost} credits. ${spendResult.error}`,
//         credits_required: creditCost,
//       },
//       creditsCost: 0,
//     };
//   }

//   const result = await hunter.domainSearch(args.domain, {
//     limit: 20,
//     type: args.type,
//     department: args.department,
//   });

//   if (result.error) {
//     return {
//       success: false,
//       result: null,
//       error: result.error,
//       creditsCost: creditCost,
//     };
//   }

//   const data = result.data!;

//   // Find or create domain record
//   let domainId: string | null = null;
//   const { data: existingDomain } = await supabase
//     .from('domains')
//     .select('id')
//     .eq('organization_id', context.organizationId)
//     .ilike('name', args.domain)
//     .maybeSingle();

//   if (existingDomain) {
//     domainId = existingDomain.id;
//   } else {
//     const { data: newDomain } = await supabase
//       .from('domains')
//       .insert({
//         organization_id: context.organizationId,
//         name: args.domain,
//       })
//       .select('id')
//       .single();
//     if (newDomain) domainId = newDomain.id;
//   }

//   // Save action results
//   const resultData = {
//     domain: data.domain,
//     organization: data.organization,
//     industry: data.industry,
//     emails: data.emails?.map(e => ({
//       email: e.value,
//       type: e.type,
//       confidence: e.confidence,
//       name: [e.first_name, e.last_name].filter(Boolean).join(' ') || null,
//       position: e.position,
//       department: e.department,
//       linkedin: e.linkedin,
//     })) || [],
//     social: {
//       twitter: data.twitter,
//       facebook: data.facebook,
//       linkedin: data.linkedin,
//     },
//     email_pattern: data.pattern,
//   };

//   await supabase.from('action_results').insert({
//     organization_id: context.organizationId,
//     action_type: 'domain_email_search',
//     entity_type: 'domain',
//     entity_id: domainId,
//     entity_value: args.domain,
//     results: resultData,
//     summary: { email_count: data.emails?.length || 0, organization: data.organization },
//     credits_spent: creditCost,
//     created_by: context.userId,
//   });

//   // Simple message for the widget
//   const message = `Found ${data.emails?.length || 0} emails at ${data.domain}.`;

//   return {
//     success: true,
//     result: {
//       domain: data.domain,
//       domain_id: domainId,
//       view_url: domainId ? `/domains/${domainId}` : null,
//       organization: data.organization,
//       industry: data.industry,
//       email_count: data.emails?.length || 0,
//       emails: resultData.emails,
//       social: resultData.social,
//       email_pattern: data.pattern,
//       message,
//     },
//     creditsCost: creditCost,
//   };
// }

// async function executeHunterEmailFinder(
//   args: { domain: string; first_name?: string; last_name?: string; full_name?: string },
//   context: { organizationId: string; userId?: string }
// ): Promise<ToolResult> {
//   if (!hunter.isHunterConfigured()) {
//     return {
//       success: false,
//       result: null,
//       error: 'Email finder service is not configured.',
//       creditsCost: 0,
//     };
//   }

//   if (!args.first_name && !args.last_name && !args.full_name) {
//     return {
//       success: false,
//       result: null,
//       error: 'Name is required (first_name/last_name or full_name).',
//       creditsCost: 0,
//     };
//   }

//   const creditCost = hunter.HUNTER_CREDIT_COSTS.emailFinder;
//   const personName = args.full_name || `${args.first_name} ${args.last_name}`;

//   const spendResult = await spendCreditsForTool(
//     context.organizationId,
//     creditCost,
//     'hunter_email_finder',
//     `Email finder: ${personName} at ${args.domain}`
//   );

//   if (!spendResult.success) {
//     return {
//       success: false,
//       result: {
//         error: 'insufficient_credits',
//         message: `This action requires ${creditCost} credits. ${spendResult.error}`,
//         credits_required: creditCost,
//       },
//       creditsCost: 0,
//     };
//   }

//   const result = await hunter.emailFinder(args.domain, {
//     first_name: args.first_name,
//     last_name: args.last_name,
//     full_name: args.full_name,
//   });

//   if (result.error) {
//     return {
//       success: false,
//       result: null,
//       error: result.error,
//       creditsCost: creditCost,
//     };
//   }

//   const data = result.data!;

//   // Create email record if found
//   let emailId: string | null = null;
//   if (data.email) {
//     const emailDomain = data.email.split('@')[1] || null;
//     const { data: existingEmail } = await supabase
//       .from('emails')
//       .select('id')
//       .eq('organization_id', context.organizationId)
//       .ilike('address', data.email)
//       .maybeSingle();

//     if (existingEmail) {
//       emailId = existingEmail.id;
//     } else {
//       const { data: newEmail } = await supabase
//         .from('emails')
//         .insert({
//           organization_id: context.organizationId,
//           address: data.email,
//           domain: emailDomain,
//         })
//         .select('id')
//         .single();
//       if (newEmail) emailId = newEmail.id;
//     }
//   }

//   // Save action result
//   const resultData = {
//     email: data.email,
//     confidence: data.score,
//     name: `${data.first_name} ${data.last_name}`,
//     position: data.position,
//     company: data.company,
//     linkedin: data.linkedin_url,
//     twitter: data.twitter,
//     verification_status: data.verification?.status,
//   };

//   await supabase.from('action_results').insert({
//     organization_id: context.organizationId,
//     action_type: 'email_finder',
//     entity_type: 'email',
//     entity_id: emailId,
//     entity_value: data.email || `${personName} at ${args.domain}`,
//     results: resultData,
//     summary: { email: data.email, confidence: data.score, name: resultData.name },
//     success: !!data.email,
//     credits_spent: creditCost,
//     created_by: context.userId,
//   });

//   // Simple message for the widget
//   const message = data.email
//     ? `Found email ${data.email} (${data.score}% confidence).`
//     : 'No email found for this person.';

//   return {
//     success: true,
//     result: {
//       email: data.email,
//       email_id: emailId,
//       view_url: emailId ? `/emails/${emailId}` : null,
//       confidence: data.score,
//       name: resultData.name,
//       position: data.position,
//       company: data.company,
//       linkedin: data.linkedin_url,
//       twitter: data.twitter,
//       verified: data.verification?.status === 'valid',
//       verification_status: data.verification?.status,
//       message,
//     },
//     creditsCost: creditCost,
//   };
// }

// async function executeHunterEmailVerify(
//   args: { email: string },
//   context: { organizationId: string; userId?: string }
// ): Promise<ToolResult> {
//   if (!hunter.isHunterConfigured()) {
//     return {
//       success: false,
//       result: null,
//       error: 'Email verification service is not configured.',
//       creditsCost: 0,
//     };
//   }

//   const creditCost = hunter.HUNTER_CREDIT_COSTS.emailVerifier;

//   const spendResult = await spendCreditsForTool(
//     context.organizationId,
//     creditCost,
//     'hunter_email_verify',
//     `Email verify: ${args.email}`
//   );

//   if (!spendResult.success) {
//     return {
//       success: false,
//       result: {
//         error: 'insufficient_credits',
//         message: `This action requires ${creditCost} credits. ${spendResult.error}`,
//         credits_required: creditCost,
//       },
//       creditsCost: 0,
//     };
//   }

//   const result = await hunter.emailVerifier(args.email);

//   if (result.error) {
//     return {
//       success: false,
//       result: null,
//       error: result.error,
//       creditsCost: creditCost,
//     };
//   }

//   const data = result.data!;

//   // Find or create email record
//   let emailId: string | null = null;
//   const emailDomain = args.email.split('@')[1] || null;

//   const { data: existingEmail } = await supabase
//     .from('emails')
//     .select('id')
//     .eq('organization_id', context.organizationId)
//     .ilike('address', args.email)
//     .maybeSingle();

//   if (existingEmail) {
//     emailId = existingEmail.id;
//   } else {
//     const { data: newEmail } = await supabase
//       .from('emails')
//       .insert({
//         organization_id: context.organizationId,
//         address: args.email,
//         domain: emailDomain,
//       })
//       .select('id')
//       .single();
//     if (newEmail) emailId = newEmail.id;
//   }

//   // Save action result
//   const resultData = {
//     email: data.email,
//     status: data.status,
//     result: data.result,
//     score: data.score,
//     disposable: data.disposable,
//     webmail: data.webmail,
//     mx_records: data.mx_records,
//   };

//   await supabase.from('action_results').insert({
//     organization_id: context.organizationId,
//     action_type: 'email_verify',
//     entity_type: 'email',
//     entity_id: emailId,
//     entity_value: args.email,
//     results: resultData,
//     summary: { status: data.status, score: data.score, is_valid: data.status === 'valid' },
//     credits_spent: creditCost,
//     created_by: context.userId,
//   });

//   const statusMessages: Record<string, string> = {
//     valid: 'This email is valid and deliverable.',
//     invalid: 'This email is invalid or does not exist.',
//     accept_all: 'This server accepts all emails - deliverability uncertain.',
//     risky: 'This email may be risky to send to.',
//     unknown: 'Could not determine email validity.',
//   };

//   // Simple message for the widget
//   const message = statusMessages[data.status] || `Verification result: ${data.status}`;

//   return {
//     success: true,
//     result: {
//       email: data.email,
//       email_id: emailId,
//       view_url: emailId ? `/emails/${emailId}` : null,
//       status: data.status,
//       result: data.result,
//       score: data.score,
//       is_valid: data.status === 'valid',
//       is_disposable: data.disposable,
//       is_webmail: data.webmail,
//       has_mx_records: data.mx_records,
//       message,
//     },
//     creditsCost: creditCost,
//   };
// }

// async function executeHunterEnrichPerson(
//   args: { email: string },
//   context: { organizationId: string; userId?: string }
// ): Promise<ToolResult> {
//   if (!hunter.isHunterConfigured()) {
//     return {
//       success: false,
//       result: null,
//       error: 'Person enrichment service is not configured.',
//       creditsCost: 0,
//     };
//   }

//   const creditCost = hunter.HUNTER_CREDIT_COSTS.leadEnrichment;

//   const spendResult = await spendCreditsForTool(
//     context.organizationId,
//     creditCost,
//     'hunter_enrich_person',
//     `Enrich person: ${args.email}`
//   );

//   if (!spendResult.success) {
//     return {
//       success: false,
//       result: {
//         error: 'insufficient_credits',
//         message: `This action requires ${creditCost} credits. ${spendResult.error}`,
//         credits_required: creditCost,
//       },
//       creditsCost: 0,
//     };
//   }

//   const result = await hunter.leadEnrichment(args.email);

//   if (result.error) {
//     return {
//       success: false,
//       result: null,
//       error: result.error,
//       creditsCost: creditCost,
//     };
//   }

//   const data = result.data!;

//   // Find or create email record
//   let emailId: string | null = null;
//   const emailDomain = args.email.split('@')[1] || null;

//   const { data: existingEmail } = await supabase
//     .from('emails')
//     .select('id')
//     .eq('organization_id', context.organizationId)
//     .ilike('address', args.email)
//     .maybeSingle();

//   if (existingEmail) {
//     emailId = existingEmail.id;
//   } else {
//     const { data: newEmail } = await supabase
//       .from('emails')
//       .insert({
//         organization_id: context.organizationId,
//         address: args.email,
//         domain: emailDomain,
//       })
//       .select('id')
//       .single();
//     if (newEmail) emailId = newEmail.id;
//   }

//   // Save action result
//   const personName = data.full_name || [data.first_name, data.last_name].filter(Boolean).join(' ');
//   const resultData = {
//     email: data.email,
//     name: personName,
//     first_name: data.first_name,
//     last_name: data.last_name,
//     position: data.position,
//     seniority: data.seniority,
//     department: data.department,
//     company: data.company,
//     company_domain: data.company_domain,
//     linkedin: data.linkedin_url,
//     twitter: data.twitter,
//     phone: data.phone_number,
//     location: data.location,
//   };

//   await supabase.from('action_results').insert({
//     organization_id: context.organizationId,
//     action_type: 'person_enrich',
//     entity_type: 'email',
//     entity_id: emailId,
//     entity_value: args.email,
//     results: resultData,
//     summary: { name: personName, position: data.position, company: data.company },
//     credits_spent: creditCost,
//     created_by: context.userId,
//   });

//   // Simple message for the widget
//   const message = personName
//     ? `Found profile: ${personName}${data.position ? `, ${data.position}` : ''}.`
//     : 'Limited information found.';

//   return {
//     success: true,
//     result: {
//       email: data.email,
//       email_id: emailId,
//       view_url: emailId ? `/emails/${emailId}` : null,
//       name: personName,
//       first_name: data.first_name,
//       last_name: data.last_name,
//       position: data.position,
//       seniority: data.seniority,
//       department: data.department,
//       company: data.company,
//       company_domain: data.company_domain,
//       linkedin: data.linkedin_url,
//       twitter: data.twitter,
//       phone: data.phone_number,
//       location: data.location,
//       message,
//     },
//     creditsCost: creditCost,
//   };
// }

// async function executeHunterEnrichCompany(
//   args: { domain: string },
//   context: { organizationId: string; userId?: string }
// ): Promise<ToolResult> {
//   if (!hunter.isHunterConfigured()) {
//     return {
//       success: false,
//       result: null,
//       error: 'Company enrichment service is not configured.',
//       creditsCost: 0,
//     };
//   }

//   const creditCost = hunter.HUNTER_CREDIT_COSTS.companyEnrichment;

//   const spendResult = await spendCreditsForTool(
//     context.organizationId,
//     creditCost,
//     'hunter_enrich_company',
//     `Enrich company: ${args.domain}`
//   );

//   if (!spendResult.success) {
//     return {
//       success: false,
//       result: {
//         error: 'insufficient_credits',
//         message: `This action requires ${creditCost} credits. ${spendResult.error}`,
//         credits_required: creditCost,
//       },
//       creditsCost: 0,
//     };
//   }

//   const result = await hunter.companyEnrichment(args.domain);

//   if (result.error) {
//     return {
//       success: false,
//       result: null,
//       error: result.error,
//       creditsCost: creditCost,
//     };
//   }

//   const data = result.data!;

//   // Find or create domain record
//   let domainId: string | null = null;
//   const { data: existingDomain } = await supabase
//     .from('domains')
//     .select('id')
//     .eq('organization_id', context.organizationId)
//     .ilike('name', args.domain)
//     .maybeSingle();

//   if (existingDomain) {
//     domainId = existingDomain.id;
//   } else {
//     const { data: newDomain } = await supabase
//       .from('domains')
//       .insert({
//         organization_id: context.organizationId,
//         name: args.domain,
//       })
//       .select('id')
//       .single();
//     if (newDomain) domainId = newDomain.id;
//   }

//   // Save action result
//   const resultData = {
//     domain: data.domain,
//     name: data.name,
//     legal_name: data.legal_name,
//     description: data.description,
//     industry: data.industry,
//     headcount: data.headcount,
//     company_type: data.company_type,
//     founded: data.founded,
//     location: data.location,
//     phones: data.phones,
//     social: data.social,
//     technologies: data.technologies,
//     revenue: data.revenue,
//   };

//   await supabase.from('action_results').insert({
//     organization_id: context.organizationId,
//     action_type: 'company_enrich',
//     entity_type: 'domain',
//     entity_id: domainId,
//     entity_value: args.domain,
//     results: resultData,
//     summary: { name: data.name, industry: data.industry, headcount: data.headcount },
//     credits_spent: creditCost,
//     created_by: context.userId,
//   });

//   // Simple message for the widget
//   const message = data.name
//     ? `Found company: ${data.name}.`
//     : `Company info found for ${args.domain}.`;

//   return {
//     success: true,
//     result: {
//       domain: data.domain,
//       domain_id: domainId,
//       view_url: domainId ? `/domains/${domainId}` : null,
//       name: data.name,
//       legal_name: data.legal_name,
//       description: data.description,
//       industry: data.industry,
//       headcount: data.headcount,
//       company_type: data.company_type,
//       founded: data.founded,
//       location: data.location,
//       phones: data.phones,
//       social: data.social,
//       technologies: data.technologies,
//       revenue: data.revenue,
//       message,
//     },
//     creditsCost: creditCost,
//   };
// }

// async function executeHunterFullEnrichment(
//   args: { email: string },
//   context: { organizationId: string; userId?: string }
// ): Promise<ToolResult> {
//   if (!hunter.isHunterConfigured()) {
//     return {
//       success: false,
//       result: null,
//       error: 'Full enrichment service is not configured.',
//       creditsCost: 0,
//     };
//   }

//   const creditCost = hunter.HUNTER_CREDIT_COSTS.combinedEnrichment;

//   const spendResult = await spendCreditsForTool(
//     context.organizationId,
//     creditCost,
//     'hunter_full_enrichment',
//     `Full enrichment: ${args.email}`
//   );

//   if (!spendResult.success) {
//     return {
//       success: false,
//       result: {
//         error: 'insufficient_credits',
//         message: `This action requires ${creditCost} credits. ${spendResult.error}`,
//         credits_required: creditCost,
//       },
//       creditsCost: 0,
//     };
//   }

//   const result = await hunter.combinedEnrichment(args.email);

//   if (result.error) {
//     return {
//       success: false,
//       result: null,
//       error: result.error,
//       creditsCost: creditCost,
//     };
//   }

//   const { lead, company } = result.data!;

//   // Find or create email record
//   let emailId: string | null = null;
//   const emailDomain = args.email.split('@')[1] || null;

//   const { data: existingEmail } = await supabase
//     .from('emails')
//     .select('id')
//     .eq('organization_id', context.organizationId)
//     .ilike('address', args.email)
//     .maybeSingle();

//   if (existingEmail) {
//     emailId = existingEmail.id;
//   } else {
//     const { data: newEmail } = await supabase
//       .from('emails')
//       .insert({
//         organization_id: context.organizationId,
//         address: args.email,
//         domain: emailDomain,
//       })
//       .select('id')
//       .single();
//     if (newEmail) emailId = newEmail.id;
//   }

//   // Save action result
//   const personName = lead.full_name || [lead.first_name, lead.last_name].filter(Boolean).join(' ');
//   const resultData = {
//     person: {
//       email: lead.email,
//       name: personName,
//       first_name: lead.first_name,
//       last_name: lead.last_name,
//       position: lead.position,
//       seniority: lead.seniority,
//       department: lead.department,
//       linkedin: lead.linkedin_url,
//       twitter: lead.twitter,
//       phone: lead.phone_number,
//       location: lead.location,
//     },
//     company: {
//       name: company.name,
//       domain: company.domain,
//       industry: company.industry,
//       headcount: company.headcount,
//       location: company.location,
//       phones: company.phones,
//       social: company.social,
//       technologies: company.technologies,
//     },
//   };

//   await supabase.from('action_results').insert({
//     organization_id: context.organizationId,
//     action_type: 'full_enrich',
//     entity_type: 'email',
//     entity_id: emailId,
//     entity_value: args.email,
//     results: resultData,
//     summary: {
//       person_name: personName,
//       position: lead.position,
//       company_name: company.name,
//       industry: company.industry,
//     },
//     credits_spent: creditCost,
//     created_by: context.userId,
//   });

//   // Simple message for the widget
//   const message = `Full profile found${personName ? ` for ${personName}` : ''}.`;

//   return {
//     success: true,
//     result: {
//       email_id: emailId,
//       view_url: emailId ? `/emails/${emailId}` : null,
//       person: {
//         email: lead.email,
//         name: personName,
//         position: lead.position,
//         seniority: lead.seniority,
//         department: lead.department,
//         linkedin: lead.linkedin_url,
//         twitter: lead.twitter,
//         phone: lead.phone_number,
//         location: lead.location,
//       },
//       company: {
//         name: company.name,
//         domain: company.domain,
//         industry: company.industry,
//         headcount: company.headcount,
//         location: company.location,
//         phones: company.phones,
//         social: company.social,
//         technologies: company.technologies,
//       },
//       message,
//     },
//     creditsCost: creditCost,
//   };
// }

// async function executeHunterEmailCount(
//   args: { domain: string },
//   _context: { organizationId: string }
// ): Promise<ToolResult> {
//   if (!hunter.isHunterConfigured()) {
//     return {
//       success: false,
//       result: null,
//       error: 'Email count service is not configured.',
//       creditsCost: 0,
//     };
//   }

//   // Email count is FREE - no credits needed
//   const result = await hunter.emailCount(args.domain);

//   if (result.error) {
//     return {
//       success: false,
//       result: null,
//       error: result.error,
//       creditsCost: 0,
//     };
//   }

//   const data = result.data!;
//   return {
//     success: true,
//     result: {
//       domain: args.domain,
//       total: data.total,
//       personal_emails: data.personal_emails,
//       generic_emails: data.generic_emails,
//       by_department: data.department,
//       by_seniority: data.seniority,
//       message: `Found ${data.total} email addresses at ${args.domain} (${data.personal_emails} personal, ${data.generic_emails} generic). Run a full domain search to see the actual emails.`,
//     },
//     creditsCost: 0, // FREE
//   };
// }

// // =====================================================
// // Holehe Tools Implementation
// // =====================================================

// async function executeHoleheCheckEmail(
//   args: { email: string },
//   context: { organizationId: string; userId?: string }
// ): Promise<ToolResult> {
//   // Check if service is available
//   const isAvailable = await holehe.isServiceAvailable();
//   if (!isAvailable) {
//     return {
//       success: false,
//       result: null,
//       error: 'The site registration scanner is temporarily offline. Please try again later or contact support.',
//       creditsCost: 0,
//     };
//   }

//   const creditCost = holehe.HOLEHE_CREDIT_COST;

//   // Spend credits
//   const spendResult = await spendCreditsForTool(
//     context.organizationId,
//     creditCost,
//     'holehe_check_email',
//     `Site registration check: ${args.email}`
//   );

//   if (!spendResult.success) {
//     return {
//       success: false,
//       result: {
//         error: 'insufficient_credits',
//         message: `This action requires ${creditCost} credits. ${spendResult.error}`,
//         credits_required: creditCost,
//       },
//       creditsCost: 0,
//     };
//   }

//   const result = await holehe.checkEmail(args.email);

//   if (result.error) {
//     return {
//       success: false,
//       result: null,
//       error: result.error,
//       creditsCost: creditCost,
//     };
//   }

//   const data = result.data!;

//   // Find or create the email record in the database
//   let emailId: string | null = null;
//   const emailDomain = args.email.split('@')[1] || null;

//   // First try to find existing email
//   const { data: existingEmail } = await supabase
//     .from('emails')
//     .select('id')
//     .eq('organization_id', context.organizationId)
//     .ilike('address', args.email)
//     .maybeSingle();

//   if (existingEmail) {
//     emailId = existingEmail.id;
//   } else {
//     // Create new email record
//     const { data: newEmail, error: createError } = await supabase
//       .from('emails')
//       .insert({
//         organization_id: context.organizationId,
//         address: args.email,
//         domain: emailDomain,
//       })
//       .select('id')
//       .single();

//     if (!createError && newEmail) {
//       emailId = newEmail.id;
//     }
//   }

//   // Save scan results to the email_site_scans table
//   let scanId: string | null = null;
//   if (emailId) {
//     const { data: scanRecord, error: scanError } = await supabase
//       .from('email_site_scans')
//       .insert({
//         email_id: emailId,
//         organization_id: context.organizationId,
//         total_sites_checked: data.totalSitesChecked,
//         results: data.registeredSites,
//         summary: data.summary,
//         scan_duration_ms: data.scanDurationMs,
//       })
//       .select('id')
//       .single();

//     if (!scanError && scanRecord) {
//       scanId = scanRecord.id;
//     }

//     // Also save to action_results for consistency
//     await supabase.from('action_results').insert({
//       organization_id: context.organizationId,
//       action_type: 'site_scan',
//       entity_type: 'email',
//       entity_id: emailId,
//       entity_value: args.email,
//       results: {
//         total_sites_checked: data.totalSitesChecked,
//         registered_sites: data.registeredSites,
//         rate_limited_sites: data.rateLimitedSites,
//         summary: data.summary,
//       },
//       summary: data.summary,
//       credits_spent: creditCost,
//       created_by: context.userId,
//     });
//   }

//   // Categorize results for the data payload
//   const datingApps = data.registeredSites.filter(s => s.category === 'dating');
//   const socialMedia = data.registeredSites.filter(s => s.category === 'social');
//   const adultSites = data.registeredSites.filter(s => s.category === 'adult');
//   const otherSites = data.registeredSites.filter(s => !['dating', 'social', 'adult'].includes(s.category));

//   // Simple message for the widget (View button handles navigation)
//   let message: string;
//   if (data.summary.total === 0) {
//     message = `Scanned ${data.totalSitesChecked} sites. No registrations found.`;
//   } else {
//     message = `Scanned ${data.totalSitesChecked} sites. Found ${data.summary.total} registrations.`;
//   }

//   return {
//     success: true,
//     result: {
//       email: args.email,
//       email_id: emailId,
//       scan_id: scanId,
//       view_url: emailId ? `/emails/${emailId}?action=site_scan` : null,
//       total_sites_checked: data.totalSitesChecked,
//       total_found: data.summary.total,
//       dating_apps_count: data.summary.dating,
//       social_media_count: data.summary.social,
//       adult_sites_count: data.summary.adult,
//       other_count: data.summary.other,
//       dating_apps: datingApps.map(s => ({ name: s.name, domain: s.domain })),
//       social_media: socialMedia.map(s => ({ name: s.name, domain: s.domain })),
//       adult_sites: adultSites.map(s => ({ name: s.name, domain: s.domain })),
//       other_sites: otherSites.map(s => ({ name: s.name, domain: s.domain, category: s.category })),
//       rate_limited_sites: data.rateLimitedSites,
//       message,
//     },
//     creditsCost: creditCost,
//   };
// }

// // =====================================================
// // Username Search Tools Implementation
// // =====================================================

// async function executeUsernameSearch(
//   args: { username: string },
//   context: { organizationId: string; userId?: string }
// ): Promise<ToolResult> {
//   // Check if service is available
//   const isAvailable = await sherlock.isServiceAvailable();
//   if (!isAvailable) {
//     return {
//       success: false,
//       result: null,
//       error: 'The username search service is temporarily offline. Please try again later or contact support.',
//       creditsCost: 0,
//     };
//   }

//   const creditCost = sherlock.SHERLOCK_CREDIT_COST;

//   // Spend credits
//   const spendResult = await spendCreditsForTool(
//     context.organizationId,
//     creditCost,
//     'username_search',
//     `Username search: ${args.username}`
//   );

//   if (!spendResult.success) {
//     return {
//       success: false,
//       result: {
//         error: 'insufficient_credits',
//         message: `This action requires ${creditCost} credits. ${spendResult.error}`,
//         credits_required: creditCost,
//       },
//       creditsCost: 0,
//     };
//   }

//   const result = await sherlock.searchUsername(args.username);

//   if (result.error) {
//     return {
//       success: false,
//       result: null,
//       error: result.error,
//       creditsCost: creditCost,
//     };
//   }

//   const data = result.data!;

//   // Find or create the username record in the database
//   let usernameId: string | null = null;

//   // First try to find existing username
//   const { data: existingUsername } = await supabase
//     .from('usernames')
//     .select('id')
//     .eq('organization_id', context.organizationId)
//     .ilike('value', args.username)
//     .maybeSingle();

//   if (existingUsername) {
//     usernameId = existingUsername.id;
//   } else {
//     // Create new username record
//     const { data: newUsername, error: createError } = await supabase
//       .from('usernames')
//       .insert({
//         organization_id: context.organizationId,
//         value: args.username,
//       })
//       .select('id')
//       .single();

//     if (!createError && newUsername) {
//       usernameId = newUsername.id;
//     }
//   }

//   // Save results to action_results table
//   let actionResultId: string | null = null;

//   const { data: actionRecord, error: actionError } = await supabase
//     .from('action_results')
//     .insert({
//       organization_id: context.organizationId,
//       action_type: 'username_search',
//       entity_type: 'username',
//       entity_id: usernameId,
//       entity_value: args.username,
//       results: {
//         username: data.username,
//         found_count: data.found_count,
//         sites_checked: data.sites_checked,
//         results: data.results,
//       },
//       summary: {
//         total: data.found_count,
//         sites_checked: data.sites_checked,
//         social: data.results.filter(s => s.category === 'social').length,
//         dating: data.results.filter(s => s.category === 'dating').length,
//         gaming: data.results.filter(s => s.category === 'gaming').length,
//         developer: data.results.filter(s => s.category === 'developer').length,
//         adult: data.results.filter(s => s.category === 'adult').length,
//         other: data.results.filter(s => !['social', 'dating', 'gaming', 'developer', 'adult'].includes(s.category)).length,
//       },
//       credits_spent: creditCost,
//       created_by: context.userId,
//     })
//     .select('id')
//     .single();

//   if (!actionError && actionRecord) {
//     actionResultId = actionRecord.id;
//   }

//   // Categorize results
//   const socialSites = data.results.filter(s => s.category === 'social');
//   const datingSites = data.results.filter(s => s.category === 'dating');
//   const gamingSites = data.results.filter(s => s.category === 'gaming');
//   const adultSites = data.results.filter(s => s.category === 'adult');
//   const developerSites = data.results.filter(s => s.category === 'developer');
//   const otherSites = data.results.filter(s => !['social', 'dating', 'gaming', 'adult', 'developer'].includes(s.category));

//   // Simple message for the widget
//   let message: string;
//   if (data.found_count === 0) {
//     message = `Searched ${data.sites_checked} sites. No accounts found for "${args.username}".`;
//   } else {
//     message = `Searched ${data.sites_checked} sites. Found ${data.found_count} accounts.`;
//   }

//   return {
//     success: true,
//     result: {
//       username: args.username,
//       username_id: usernameId,
//       action_result_id: actionResultId,
//       view_url: usernameId ? `/usernames/${usernameId}?action=username_search` : null,
//       sites_checked: data.sites_checked,
//       total_found: data.found_count,
//       social_count: socialSites.length,
//       dating_count: datingSites.length,
//       gaming_count: gamingSites.length,
//       adult_count: adultSites.length,
//       developer_count: developerSites.length,
//       other_count: otherSites.length,
//       social_sites: socialSites.map(s => ({ name: s.name, url: s.url })),
//       dating_sites: datingSites.map(s => ({ name: s.name, url: s.url })),
//       gaming_sites: gamingSites.map(s => ({ name: s.name, url: s.url })),
//       adult_sites: adultSites.map(s => ({ name: s.name, url: s.url })),
//       developer_sites: developerSites.map(s => ({ name: s.name, url: s.url })),
//       other_sites: otherSites.map(s => ({ name: s.name, url: s.url, category: s.category })),
//       scan_duration_ms: data.scan_duration_ms,
//       message,
//     },
//     creditsCost: creditCost,
//   };
// }

// // =====================================================
// // HIBP Tools Implementation
// // =====================================================

// async function executeBreachCheck(
//   args: { email: string },
//   context: { organizationId: string; userId: string }
// ): Promise<ToolResult> {
//   const creditCost = hibp.HIBP_CREDIT_COST;

//   console.log('[Breach Check] Starting breach check for:', args.email);

//   // Use centralized credit spending (checks and deducts atomically)
//   const spendResult = await spendCreditsForTool(
//     context.organizationId,
//     creditCost,
//     'breach_check',
//     `Breach check: ${args.email}`
//   );

//   if (!spendResult.success) {
//     console.log('[Breach Check] Credit check failed:', spendResult.error);
//     return {
//       success: false,
//       result: null,
//       error: spendResult.error || `Insufficient credits. This action requires ${creditCost} credits.`,
//       creditsCost: 0,
//     };
//   }

//   console.log('[Breach Check] Credits spent, calling HIBP API...');
//   const result = await hibp.checkBreaches(args.email);

//   if (result.error) {
//     console.log('[Breach Check] HIBP API error:', result.error);
//     return {
//       success: false,
//       result: { error: result.error, message: result.error },
//       error: result.error,
//       creditsCost: creditCost,
//     };
//   }

//   const data = result.data!;
//   console.log(`[Breach Check] Found ${data.breachCount} breaches for ${args.email}`);

//   // Find or create email record
//   let emailId: string | null = null;

//   const { data: existingEmail } = await supabase
//     .from('emails')
//     .select('id')
//     .eq('organization_id', context.organizationId)
//     .ilike('address', args.email)
//     .maybeSingle();

//   if (existingEmail) {
//     emailId = existingEmail.id;
//   }

//   // Save results to action_results table
//   let actionResultId: string | null = null;

//   const { data: actionRecord, error: actionError } = await supabase
//     .from('action_results')
//     .insert({
//       organization_id: context.organizationId,
//       action_type: 'breach_check',
//       entity_type: 'email',
//       entity_id: emailId,
//       entity_value: args.email,
//       results: {
//         email: data.email,
//         breaches: data.breaches,
//         pastes: data.pastes,
//         breachCount: data.breachCount,
//         pasteCount: data.pasteCount,
//         exposedDataTypes: data.exposedDataTypes,
//         mostRecentBreach: data.mostRecentBreach,
//         oldestBreach: data.oldestBreach,
//         totalPwnCount: data.totalPwnCount,
//         sensitiveBreaches: data.sensitiveBreaches,
//       },
//       summary: {
//         total: data.breachCount,
//         sensitive: data.sensitiveBreaches.length,
//         exposed_types: data.exposedDataTypes.length,
//         total_pwn_count: data.totalPwnCount,
//       },
//       credits_spent: creditCost,
//       created_by: context.userId,
//     })
//     .select('id')
//     .single();

//   if (!actionError && actionRecord) {
//     actionResultId = actionRecord.id;
//   }

//   // Simple message for the widget
//   let message: string;
//   if (data.breachCount === 0) {
//     message = `No breaches found for "${args.email}". This email appears safe.`;
//   } else {
//     const sensitiveNote = data.sensitiveBreaches.length > 0
//       ? ` (${data.sensitiveBreaches.length} sensitive!)`
//       : '';
//     message = `Found ${data.breachCount} breaches${sensitiveNote}. ${data.totalPwnCount.toLocaleString()} total records exposed.`;
//   }

//   return {
//     success: true,
//     result: {
//       email: args.email,
//       email_id: emailId,
//       action_result_id: actionResultId,
//       view_url: emailId ? `/emails/${emailId}?action=breach_check` : null,
//       breach_count: data.breachCount,
//       total_records_exposed: data.totalPwnCount,
//       exposed_data_types: data.exposedDataTypes,
//       sensitive_breaches: data.sensitiveBreaches,
//       most_recent_breach: data.mostRecentBreach,
//       breaches: data.breaches.slice(0, 5).map(b => ({
//         name: b.Name,
//         title: b.Title,
//         date: b.BreachDate,
//         records: b.PwnCount,
//         data_exposed: b.DataClasses.slice(0, 5),
//         is_sensitive: b.IsSensitive,
//       })),
//       message,
//     },
//     creditsCost: creditCost,
//   };
// }

// // =====================================================
// // Deep Breach Search (Dehashed) Implementation
// // =====================================================

// import * as dehashed from './dehashed.js';

// async function executeDeepBreachSearch(
//   args: { email: string },
//   context: { organizationId: string; userId: string }
// ): Promise<ToolResult> {
//   const creditCost = 5;

//   const spendResult = await spendCreditsForTool(
//     context.organizationId,
//     creditCost,
//     'deep_breach_search',
//     `Deep breach search: ${args.email}`
//   );

//   if (!spendResult.success) {
//     return {
//       success: false,
//       result: {
//         error: 'insufficient_credits',
//         message: `This action requires ${creditCost} credits. ${spendResult.error}`,
//         credits_required: creditCost,
//       },
//       creditsCost: 0,
//     };
//   }

//   const result = await dehashed.searchDehashed(args.email, 'email');

//   if (result.error) {
//     return {
//       success: false,
//       result: null,
//       error: result.error,
//       creditsCost: creditCost,
//     };
//   }

//   const data = result.data!;

//   // Find email ID
//   let emailId: string | null = null;
//   const { data: existingEmail } = await supabase
//     .from('emails')
//     .select('id')
//     .eq('organization_id', context.organizationId)
//     .ilike('address', args.email)
//     .maybeSingle();

//   if (existingEmail) {
//     emailId = existingEmail.id;
//   }

//   const hasAshleyMadison = (data.ashleyMadisonData?.length || 0) > 0;

//   // Save to action_results
//   await supabase.from('action_results').insert({
//     organization_id: context.organizationId,
//     action_type: 'deep_breach_search',
//     entity_type: 'email',
//     entity_id: emailId,
//     entity_value: args.email,
//     results: data,
//     summary: {
//       total_entries: data.totalEntries,
//       has_passwords: data.hasPasswords,
//       has_ashley_madison: hasAshleyMadison,
//       databases_count: data.databasesFound?.length || 0,
//     },
//     credits_spent: creditCost,
//     created_by: context.userId,
//   });

//   const message = data.totalEntries > 0
//     ? `Found ${data.totalEntries} leak entries${data.hasPasswords ? ' (includes passwords!)' : ''}${hasAshleyMadison ? ' ⚠️ Ashley Madison detected!' : ''}`
//     : 'No leak entries found for this email.';

//   return {
//     success: true,
//     result: {
//       email: args.email,
//       email_id: emailId,
//       view_url: emailId ? `/emails/${emailId}?action=deep_breach` : null,
//       total_entries: data.totalEntries,
//       has_passwords: data.hasPasswords,
//       has_ashley_madison: hasAshleyMadison,
//       unique_passwords: data.uniquePasswords,
//       unique_usernames: data.uniqueUsernames,
//       databases_found: data.databasesFound?.slice(0, 10),
//       sensitive_breaches: data.sensitiveBreaches,
//       entries_preview: data.entries?.slice(0, 5).map((e: any) => ({
//         database: e.database_name,
//         username: e.username,
//         has_password: !!e.password || !!e.hashed_password,
//         ip_address: e.ip_address,
//       })),
//       message,
//     },
//     creditsCost: creditCost,
//   };
// }

// // =====================================================
// // Court Records Tools Implementation
// // =====================================================

// import * as courtListener from './courtListener.js';

// async function executeCourtRecordSearch(
//   args: { entity_type: 'person' | 'business'; entity_id: string; name: string },
//   context: { organizationId: string; userId: string }
// ): Promise<ToolResult> {
//   const creditCost = 3;

//   const spendResult = await spendCreditsForTool(
//     context.organizationId,
//     creditCost,
//     'court_record_search',
//     `Court search: ${args.name}`
//   );

//   if (!spendResult.success) {
//     return {
//       success: false,
//       result: {
//         error: 'insufficient_credits',
//         message: `This action requires ${creditCost} credits. ${spendResult.error}`,
//         credits_required: creditCost,
//       },
//       creditsCost: 0,
//     };
//   }

//   const result = await courtListener.searchCourtRecords(args.name);

//   if (result.error) {
//     return {
//       success: false,
//       result: null,
//       error: result.error,
//       creditsCost: creditCost,
//     };
//   }

//   const data = result.data!;

//   // Save to court_record_searches
//   await supabase.from('court_record_searches').insert({
//     organization_id: context.organizationId,
//     entity_id: args.entity_id,
//     entity_type: args.entity_type,
//     query: args.name,
//     total_results: data.totalResults,
//     cases_count: data.cases?.length || 0,
//     opinions_count: data.opinions?.length || 0,
//     has_criminal_cases: data.hasCriminalCases,
//     has_bankruptcy: data.hasBankruptcy,
//     has_active_cases: data.hasActiveCases,
//     court_breakdown: data.courtBreakdown,
//     cases: data.cases,
//     opinions: data.opinions,
//     credits_spent: creditCost,
//   });

//   const viewUrl = args.entity_type === 'person'
//     ? `/people/${args.entity_id}?action=court_records`
//     : `/businesses/${args.entity_id}?action=court_records`;

//   const message = data.totalResults > 0
//     ? `Found ${data.cases?.length || 0} cases and ${data.opinions?.length || 0} opinions${data.hasCriminalCases ? ' (includes criminal!)' : ''}${data.hasBankruptcy ? ' (includes bankruptcy)' : ''}`
//     : 'No federal court records found.';

//   return {
//     success: true,
//     result: {
//       name: args.name,
//       entity_id: args.entity_id,
//       entity_type: args.entity_type,
//       view_url: viewUrl,
//       total_results: data.totalResults,
//       cases_count: data.cases?.length || 0,
//       opinions_count: data.opinions?.length || 0,
//       has_criminal: data.hasCriminalCases,
//       has_bankruptcy: data.hasBankruptcy,
//       has_active: data.hasActiveCases,
//       court_breakdown: data.courtBreakdown,
//       cases_preview: data.cases?.slice(0, 3).map((c: any) => ({
//         case_name: c.case_name,
//         court: c.court,
//         date_filed: c.date_filed,
//         status: c.date_terminated ? 'Closed' : 'Active',
//       })),
//       message,
//     },
//     creditsCost: creditCost,
//   };
// }

// async function executePartyRecordSearch(
//   args: { entity_type: 'person' | 'business'; entity_id: string; name: string },
//   context: { organizationId: string; userId: string }
// ): Promise<ToolResult> {
//   const creditCost = 2;

//   const spendResult = await spendCreditsForTool(
//     context.organizationId,
//     creditCost,
//     'party_search',
//     `Party search: ${args.name}`
//   );

//   if (!spendResult.success) {
//     return {
//       success: false,
//       result: {
//         error: 'insufficient_credits',
//         message: `This action requires ${creditCost} credits. ${spendResult.error}`,
//         credits_required: creditCost,
//       },
//       creditsCost: 0,
//     };
//   }

//   const result = await courtListener.searchParties(args.name);

//   if (result.error) {
//     return {
//       success: false,
//       result: null,
//       error: result.error,
//       creditsCost: creditCost,
//     };
//   }

//   const data = result.data!;

//   // Save to action_results
//   await supabase.from('action_results').insert({
//     organization_id: context.organizationId,
//     action_type: 'parties_search',
//     entity_type: args.entity_type,
//     entity_id: args.entity_id,
//     entity_value: args.name,
//     results: data,
//     summary: {
//       total_results: data.totalResults,
//       role_breakdown: data.roleBreakdown,
//     },
//     credits_spent: creditCost,
//     created_by: context.userId,
//   });

//   const viewUrl = args.entity_type === 'person'
//     ? `/people/${args.entity_id}?action=party_records`
//     : `/businesses/${args.entity_id}?action=party_records`;

//   const message = data.totalResults > 0
//     ? `Found ${data.totalResults} party record(s) in federal courts.`
//     : 'No party records found.';

//   return {
//     success: true,
//     result: {
//       name: args.name,
//       entity_id: args.entity_id,
//       view_url: viewUrl,
//       total_results: data.totalResults,
//       role_breakdown: data.roleBreakdown,
//       parties_preview: data.parties?.slice(0, 3).map((p: any) => ({
//         name: p.name,
//         roles: p.party_types?.map((t: any) => t.name).join(', '),
//       })),
//       message,
//     },
//     creditsCost: creditCost,
//   };
// }

// async function executeBankruptcySearch(
//   args: { entity_type: 'person' | 'business'; entity_id: string; name: string },
//   context: { organizationId: string; userId: string }
// ): Promise<ToolResult> {
//   const creditCost = 3;

//   const spendResult = await spendCreditsForTool(
//     context.organizationId,
//     creditCost,
//     'bankruptcy_search',
//     `Bankruptcy search: ${args.name}`
//   );

//   if (!spendResult.success) {
//     return {
//       success: false,
//       result: {
//         error: 'insufficient_credits',
//         message: `This action requires ${creditCost} credits. ${spendResult.error}`,
//         credits_required: creditCost,
//       },
//       creditsCost: 0,
//     };
//   }

//   const result = await courtListener.searchBankruptcy(args.name);

//   if (result.error) {
//     return {
//       success: false,
//       result: null,
//       error: result.error,
//       creditsCost: creditCost,
//     };
//   }

//   const data = result.data!;

//   // Save to action_results
//   await supabase.from('action_results').insert({
//     organization_id: context.organizationId,
//     action_type: 'bankruptcy_search',
//     entity_type: args.entity_type,
//     entity_id: args.entity_id,
//     entity_value: args.name,
//     results: data,
//     summary: {
//       total_results: data.totalResults,
//       bankruptcies_count: data.bankruptcies?.length || 0,
//       chapter_breakdown: data.chapterBreakdown,
//     },
//     credits_spent: creditCost,
//     created_by: context.userId,
//   });

//   const viewUrl = args.entity_type === 'person'
//     ? `/people/${args.entity_id}?action=bankruptcy_records`
//     : `/businesses/${args.entity_id}?action=bankruptcy_records`;

//   const count = data.bankruptcies?.length || 0;
//   const message = count > 0
//     ? `Found ${count} bankruptcy filing(s)!`
//     : 'No bankruptcy filings found.';

//   return {
//     success: true,
//     result: {
//       name: args.name,
//       entity_id: args.entity_id,
//       view_url: viewUrl,
//       total_results: data.totalResults,
//       bankruptcies_count: count,
//       chapter_breakdown: data.chapterBreakdown,
//       bankruptcies_preview: data.bankruptcies?.slice(0, 3).map((b: any) => ({
//         chapter: b.chapter,
//         trustee: b.trustee_str,
//       })),
//       message,
//     },
//     creditsCost: creditCost,
//   };
// }

// async function executeJudgeSearch(
//   args: { person_id: string; name: string },
//   context: { organizationId: string; userId: string }
// ): Promise<ToolResult> {
//   const creditCost = 3;

//   const spendResult = await spendCreditsForTool(
//     context.organizationId,
//     creditCost,
//     'judge_search',
//     `Judge lookup: ${args.name}`
//   );

//   if (!spendResult.success) {
//     return {
//       success: false,
//       result: {
//         error: 'insufficient_credits',
//         message: `This action requires ${creditCost} credits. ${spendResult.error}`,
//         credits_required: creditCost,
//       },
//       creditsCost: 0,
//     };
//   }

//   const result = await courtListener.searchJudges(args.name);

//   if (result.error) {
//     return {
//       success: false,
//       result: null,
//       error: result.error,
//       creditsCost: creditCost,
//     };
//   }

//   const data = result.data!;

//   // Save to action_results
//   await supabase.from('action_results').insert({
//     organization_id: context.organizationId,
//     action_type: 'judges_search',
//     entity_type: 'person',
//     entity_id: args.person_id,
//     entity_value: args.name,
//     results: data,
//     summary: {
//       total_results: data.totalResults,
//       judges_count: data.judges?.length || 0,
//     },
//     credits_spent: creditCost,
//     created_by: context.userId,
//   });

//   const count = data.judges?.length || 0;
//   const message = count > 0
//     ? `Found ${count} federal judge record(s).`
//     : 'No federal judges found with this name.';

//   return {
//     success: true,
//     result: {
//       name: args.name,
//       person_id: args.person_id,
//       view_url: `/people/${args.person_id}?action=judge_records`,
//       total_results: data.totalResults,
//       judges_count: count,
//       judges_preview: data.judges?.slice(0, 2).map((j: any) => ({
//         name: j.name_full,
//         positions: j.positions?.slice(0, 2).map((p: any) => p.court_name).join(', '),
//         political_affiliation: j.political_affiliations?.[0]?.political_party,
//       })),
//       message,
//     },
//     creditsCost: creditCost,
//   };
// }

// async function executeFinancialDisclosureSearch(
//   args: { person_id: string; name: string },
//   context: { organizationId: string; userId: string }
// ): Promise<ToolResult> {
//   const creditCost = 5;

//   const spendResult = await spendCreditsForTool(
//     context.organizationId,
//     creditCost,
//     'financial_disclosures',
//     `Financial disclosures: ${args.name}`
//   );

//   if (!spendResult.success) {
//     return {
//       success: false,
//       result: {
//         error: 'insufficient_credits',
//         message: `This action requires ${creditCost} credits. ${spendResult.error}`,
//         credits_required: creditCost,
//       },
//       creditsCost: 0,
//     };
//   }

//   const result = await courtListener.searchFinancialDisclosures(args.name);

//   if (result.error) {
//     return {
//       success: false,
//       result: null,
//       error: result.error,
//       creditsCost: creditCost,
//     };
//   }

//   const data = result.data!;

//   // Save to action_results
//   await supabase.from('action_results').insert({
//     organization_id: context.organizationId,
//     action_type: 'financial_disclosures',
//     entity_type: 'person',
//     entity_id: args.person_id,
//     entity_value: args.name,
//     results: data,
//     summary: {
//       total_results: data.totalResults,
//       total_investments: data.totalInvestments,
//       total_gifts: data.totalGifts,
//       total_debts: data.totalDebts,
//       years_available: data.yearsAvailable,
//     },
//     credits_spent: creditCost,
//     created_by: context.userId,
//   });

//   const count = data.disclosures?.length || 0;
//   const message = count > 0
//     ? `Found ${count} financial disclosure(s) with ${data.totalInvestments} investments, ${data.totalGifts} gifts, ${data.totalDebts} debts.`
//     : 'No financial disclosures found (person may not be a federal judge).';

//   return {
//     success: true,
//     result: {
//       name: args.name,
//       person_id: args.person_id,
//       view_url: `/people/${args.person_id}?action=financial_disclosures`,
//       total_results: data.totalResults,
//       disclosures_count: count,
//       total_investments: data.totalInvestments,
//       total_gifts: data.totalGifts,
//       total_debts: data.totalDebts,
//       years_available: data.yearsAvailable,
//       message,
//     },
//     creditsCost: creditCost,
//   };
// }

// // =====================================================
// // Phone Carrier Lookup
// // =====================================================
// async function executePhoneCarrierLookup(
//   args: { phone_id?: string; phone_number: string },
//   context: { organizationId: string; userId: string }
// ): Promise<ToolResult> {
//   const creditCost = phoneLookup.PHONE_LOOKUP_CREDIT_COST;

//   // Check if service is available
//   if (!phoneLookup.isServiceAvailable()) {
//     return {
//       success: false,
//       result: {
//         error: 'service_unavailable',
//         message: 'Phone lookup service is not configured. Please add NUMVERIFY_API_KEY to environment.',
//       },
//       creditsCost: 0,
//     };
//   }

//   // Spend credits
//   const spendResult = await spendCreditsForTool(
//     context.organizationId,
//     creditCost,
//     'phone_lookup',
//     `Phone lookup: ${args.phone_number}`
//   );

//   if (!spendResult.success) {
//     return {
//       success: false,
//       result: {
//         error: 'insufficient_credits',
//         message: `This action requires ${creditCost} credits. ${spendResult.error}`,
//         credits_required: creditCost,
//       },
//       creditsCost: 0,
//     };
//   }

//   // Perform lookup
//   const result = await phoneLookup.lookupPhone(args.phone_number);

//   if (result.error) {
//     return {
//       success: false,
//       result: null,
//       error: result.error,
//       creditsCost: creditCost,
//     };
//   }

//   const data = result.data!;

//   // Find or create phone record to get view URL
//   let phoneId = args.phone_id;
//   let createdNewRecord = false;
//   if (!phoneId) {
//     // Normalize phone number for lookup
//     const normalized = args.phone_number.replace(/\D/g, '');

//     // Try to find existing phone record
//     const { data: existingPhone } = await supabase
//       .from('phones')
//       .select('id')
//       .eq('organization_id', context.organizationId)
//       .or(`number_e164.ilike.%${normalized}%,phone->>number_e164.ilike.%${normalized}%`)
//       .maybeSingle();

//     if (existingPhone) {
//       phoneId = existingPhone.id;
//     } else {
//       // Create new phone record with the lookup data
//       // Convert international format to E.164 (e.g., "+1 786-274-0326" -> "+17862740326")
//       const e164Number = data.formatted?.international
//         ? data.formatted.international.replace(/[\s\-\(\)\.]/g, '')
//         : args.phone_number;
//       const { data: newPhone } = await supabase
//         .from('phones')
//         .insert({
//           organization_id: context.organizationId,
//           phone: { number_e164: e164Number },
//           number_e164: e164Number,
//           carrier: data.carrier,
//           line_type: data.lineType,
//           country: data.country?.name,
//         })
//         .select('id')
//         .single();
//       phoneId = newPhone?.id;
//       createdNewRecord = true;
//     }
//   }

//   const viewUrl = phoneId ? `/phones/${phoneId}?action=phone_lookup` : null;

//   // Save to action_results
//   await supabase.from('action_results').insert({
//     organization_id: context.organizationId,
//     action_type: 'phone_lookup',
//     entity_type: 'phone',
//     entity_id: phoneId || null,
//     entity_value: args.phone_number,
//     results: data,
//     summary: {
//       valid: data.valid,
//       carrier: data.carrier,
//       line_type: data.lineType,
//       country: data.country?.name,
//       location: data.location,
//     },
//     credits_spent: creditCost,
//     created_by: context.userId,
//   });

//   // Update phone record if phone_id provided
//   if (args.phone_id && data) {
//     const updateData: Record<string, unknown> = {};
//     if (data.carrier) updateData.carrier = data.carrier;
//     if (data.lineType && data.lineType !== 'unknown') updateData.line_type = data.lineType;
//     if (data.country?.code) updateData.country = data.country.code;
//     if (data.location) updateData.region = data.location;

//     if (Object.keys(updateData).length > 0) {
//       await supabase
//         .from('phones')
//         .update(updateData)
//         .eq('id', args.phone_id);
//     }
//   }

//   // Build response message
//   const parts: string[] = [];
//   if (data.valid) {
//     parts.push(`Valid ${data.lineType} number`);
//   } else {
//     parts.push('Invalid phone number');
//   }
//   if (data.carrier) parts.push(`Carrier: ${data.carrier}`);
//   if (data.country?.name) parts.push(`Country: ${data.country.name}`);
//   if (data.location) parts.push(`Location: ${data.location}`);

//   const baseMessage = parts.join(' | ');
//   const finalMessage = createdNewRecord
//     ? `${baseMessage} (created new phone record)`
//     : baseMessage;

//   return {
//     success: true,
//     result: {
//       phone_number: args.phone_number,
//       phone_id: phoneId,
//       view_url: viewUrl,
//       created_new_record: createdNewRecord,
//       valid: data.valid,
//       line_type: data.lineType,
//       carrier: data.carrier,
//       country: data.country?.name,
//       country_code: data.country?.code,
//       location: data.location,
//       formatted_international: data.formatted.international,
//       formatted_local: data.formatted.local,
//       message: finalMessage,
//       investigation_tips: getPhoneLookupTips(data),
//     },
//     creditsCost: creditCost,
//   };
// }

// function getPhoneLookupTips(data: phoneLookup.PhoneLookupResult): string[] {
//   const tips: string[] = [];

//   if (data.lineType === 'voip') {
//     tips.push('VoIP numbers are often used for privacy or burner accounts - may indicate subject is trying to stay anonymous');
//   }
//   if (data.lineType === 'mobile') {
//     tips.push('Mobile numbers are typically tied to a specific individual and carrier contract');
//   }
//   if (data.lineType === 'landline') {
//     tips.push('Landlines are usually associated with a physical address - can help verify location claims');
//   }
//   if (data.carrier) {
//     tips.push('Carrier information can help verify if claimed location matches carrier coverage area');
//   }
//   if (!data.valid) {
//     tips.push('Invalid numbers may be disconnected, fake, or incorrectly formatted - verify with subject');
//   }

//   return tips;
// }

// // =====================================================
// // Domain Intelligence Functions
// // =====================================================

// async function executeDnsLookup(
//   args: { domain: string; domain_id?: string },
//   context: { organizationId: string; userId: string }
// ): Promise<ToolResult> {
//   const creditCost = dnsLookup.DNS_LOOKUP_CREDIT_COST;

//   // Spend credits
//   const spendResult = await spendCreditsForTool(
//     context.organizationId,
//     creditCost,
//     'dns_lookup',
//     `DNS lookup: ${args.domain}`
//   );

//   if (!spendResult.success) {
//     return {
//       success: false,
//       result: {
//         error: 'insufficient_credits',
//         message: `This action requires ${creditCost} credits. ${spendResult.error}`,
//         credits_required: creditCost,
//       },
//       creditsCost: 0,
//     };
//   }

//   // Perform lookup
//   const result = await dnsLookup.lookupDns(args.domain);

//   if (result.error) {
//     return {
//       success: false,
//       result: null,
//       error: result.error,
//       creditsCost: creditCost,
//     };
//   }

//   const data = result.data!;

//   // Find or create domain record to get view URL
//   let domainId = args.domain_id;
//   let createdNewRecord = false;
//   if (!domainId) {
//     // Try to find existing domain record
//     const { data: existingDomain } = await supabase
//       .from('domains')
//       .select('id')
//       .eq('organization_id', context.organizationId)
//       .ilike('name', args.domain)
//       .maybeSingle();

//     if (existingDomain) {
//       domainId = existingDomain.id;
//     } else {
//       // Create new domain record
//       const { data: newDomain } = await supabase
//         .from('domains')
//         .insert({
//           organization_id: context.organizationId,
//           name: args.domain,
//         })
//         .select('id')
//         .single();
//       domainId = newDomain?.id;
//       createdNewRecord = true;
//     }
//   }

//   const viewUrl = domainId ? `/domains/${domainId}?action=dns_lookup` : null;

//   // Save to action_results
//   await supabase.from('action_results').insert({
//     organization_id: context.organizationId,
//     action_type: 'dns_lookup',
//     entity_type: 'domain',
//     entity_id: domainId || null,
//     entity_value: args.domain,
//     results: data,
//     summary: {
//       a_records: data.records.a.length,
//       mx_records: data.records.mx.length,
//       ns_records: data.records.ns.length,
//       has_mail: data.summary.hasMailServer,
//       mail_providers: data.summary.mailProviders,
//     },
//     credits_spent: creditCost,
//     created_by: context.userId,
//   });

//   // Build message
//   const parts: string[] = [];
//   if (data.records.a.length > 0) parts.push(`${data.records.a.length} A record(s): ${data.records.a.slice(0, 3).join(', ')}`);
//   if (data.summary.hasMailServer) {
//     parts.push(`Mail server: ${data.summary.mailProviders.length > 0 ? data.summary.mailProviders.join(', ') : 'custom'}`);
//   }
//   if (data.records.ns.length > 0) parts.push(`${data.records.ns.length} nameserver(s)`);

//   const baseMessage = parts.join(' | ') || 'DNS lookup complete';
//   const finalMessage = createdNewRecord
//     ? `${baseMessage} (created new domain record)`
//     : baseMessage;

//   return {
//     success: true,
//     result: {
//       domain: data.domain,
//       domain_id: domainId,
//       view_url: viewUrl,
//       created_new_record: createdNewRecord,
//       records: data.records,
//       summary: data.summary,
//       message: finalMessage,
//     },
//     creditsCost: creditCost,
//   };
// }

// async function executeWhoisLookup(
//   args: { domain: string; domain_id?: string },
//   context: { organizationId: string; userId: string }
// ): Promise<ToolResult> {
//   const creditCost = whoisLookup.WHOIS_LOOKUP_CREDIT_COST;

//   // Spend credits
//   const spendResult = await spendCreditsForTool(
//     context.organizationId,
//     creditCost,
//     'whois_lookup',
//     `WHOIS lookup: ${args.domain}`
//   );

//   if (!spendResult.success) {
//     return {
//       success: false,
//       result: {
//         error: 'insufficient_credits',
//         message: `This action requires ${creditCost} credits. ${spendResult.error}`,
//         credits_required: creditCost,
//       },
//       creditsCost: 0,
//     };
//   }

//   // Perform lookup
//   const result = await whoisLookup.lookupWhois(args.domain);

//   if (result.error) {
//     return {
//       success: false,
//       result: null,
//       error: result.error,
//       creditsCost: creditCost,
//     };
//   }

//   const data = result.data!;

//   // Find or create domain record to get view URL
//   let domainId = args.domain_id;
//   let createdNewRecord = false;
//   if (!domainId) {
//     // Try to find existing domain record
//     const { data: existingDomain } = await supabase
//       .from('domains')
//       .select('id')
//       .eq('organization_id', context.organizationId)
//       .ilike('name', args.domain)
//       .maybeSingle();

//     if (existingDomain) {
//       domainId = existingDomain.id;
//     } else {
//       // Create new domain record
//       const { data: newDomain } = await supabase
//         .from('domains')
//         .insert({
//           organization_id: context.organizationId,
//           name: args.domain,
//         })
//         .select('id')
//         .single();
//       domainId = newDomain?.id;
//       createdNewRecord = true;
//     }
//   }

//   const viewUrl = domainId ? `/domains/${domainId}?action=whois_lookup` : null;

//   // Save to action_results
//   await supabase.from('action_results').insert({
//     organization_id: context.organizationId,
//     action_type: 'whois_lookup',
//     entity_type: 'domain',
//     entity_id: domainId || null,
//     entity_value: args.domain,
//     results: data,
//     summary: {
//       available: data.available,
//       registrar: data.registrar,
//       created_date: data.createdDate,
//       expires_date: data.expiresDate,
//       age: data.summary.age,
//       expires_in: data.summary.expiresIn,
//       is_expiring_soon: data.summary.isExpiringSoon,
//       is_new_domain: data.summary.isNewDomain,
//       privacy_protected: data.summary.privacyProtected,
//     },
//     credits_spent: creditCost,
//     created_by: context.userId,
//   });

//   // Build message
//   if (data.available) {
//     const availableMessage = createdNewRecord
//       ? 'Domain appears to be available for registration (created new domain record)'
//       : 'Domain appears to be available for registration';
//     return {
//       success: true,
//       result: {
//         domain: data.domain,
//         domain_id: domainId,
//         view_url: viewUrl,
//         created_new_record: createdNewRecord,
//         available: true,
//         message: availableMessage,
//       },
//       creditsCost: creditCost,
//     };
//   }

//   const parts: string[] = [];
//   if (data.registrar) parts.push(`Registrar: ${data.registrar}`);
//   if (data.summary.age) parts.push(`Age: ${data.summary.age}`);
//   if (data.summary.expiresIn) parts.push(`Expires: ${data.summary.expiresIn}`);
//   if (data.summary.isNewDomain) parts.push('New domain (<90 days)');
//   if (data.summary.isExpiringSoon) parts.push('Expiring soon');
//   if (data.summary.privacyProtected) parts.push('Privacy protected');

//   const baseMessage = parts.join(' | ') || 'WHOIS lookup complete';
//   const finalMessage = createdNewRecord
//     ? `${baseMessage} (created new domain record)`
//     : baseMessage;

//   return {
//     success: true,
//     result: {
//       domain: data.domain,
//       domain_id: domainId,
//       view_url: viewUrl,
//       created_new_record: createdNewRecord,
//       available: false,
//       registrar: data.registrar,
//       created_date: data.createdDate,
//       expires_date: data.expiresDate,
//       nameservers: data.nameservers,
//       age: data.summary.age,
//       expires_in: data.summary.expiresIn,
//       is_new_domain: data.summary.isNewDomain,
//       is_expiring_soon: data.summary.isExpiringSoon,
//       privacy_protected: data.summary.privacyProtected,
//       message: finalMessage,
//     },
//     creditsCost: creditCost,
//   };
// }

// // =====================================================
// // IP Intelligence Functions
// // =====================================================

// async function executeIpGeolocation(
//   args: { ip: string; ip_id?: string },
//   context: { organizationId: string; userId: string }
// ): Promise<ToolResult> {
//   const creditCost = ipGeolocation.IP_GEOLOCATION_CREDIT_COST;

//   // Spend credits
//   const spendResult = await spendCreditsForTool(
//     context.organizationId,
//     creditCost,
//     'ip_geolocation',
//     `IP geolocation: ${args.ip}`
//   );

//   if (!spendResult.success) {
//     return {
//       success: false,
//       result: {
//         error: 'insufficient_credits',
//         message: `This action requires ${creditCost} credits. ${spendResult.error}`,
//         credits_required: creditCost,
//       },
//       creditsCost: 0,
//     };
//   }

//   // Perform lookup
//   const result = await ipGeolocation.lookupIpGeolocation(args.ip);

//   if (result.error) {
//     return {
//       success: false,
//       result: null,
//       error: result.error,
//       creditsCost: creditCost,
//     };
//   }

//   const data = result.data!;

//   // Find or create IP record to get view URL
//   let ipId = args.ip_id;
//   let createdNewRecord = false;
//   if (!ipId) {
//     // Try to find existing IP record
//     const { data: existingIp } = await supabase
//       .from('ip_addresses')
//       .select('id')
//       .eq('organization_id', context.organizationId)
//       .eq('address', args.ip)
//       .maybeSingle();

//     if (existingIp) {
//       ipId = existingIp.id;
//     } else {
//       // Create new IP record with geolocation data
//       const { data: newIp } = await supabase
//         .from('ip_addresses')
//         .insert({
//           organization_id: context.organizationId,
//           address: args.ip,
//           country: data.country,
//           region: data.regionName,
//           city: data.city,
//           isp: data.isp,
//           timezone: data.timezone,
//           is_proxy: data.proxy,
//           is_hosting: data.hosting,
//           is_mobile: data.mobile,
//         })
//         .select('id')
//         .single();
//       ipId = newIp?.id;
//       createdNewRecord = true;
//     }
//   }

//   const viewUrl = ipId ? `/ips/${ipId}?action=ip_geolocation` : null;

//   // Save to action_results
//   await supabase.from('action_results').insert({
//     organization_id: context.organizationId,
//     action_type: 'ip_geolocation',
//     entity_type: 'ip_address',
//     entity_id: ipId || null,
//     entity_value: args.ip,
//     results: data,
//     summary: {
//       location: data.summary.location,
//       network: data.summary.network,
//       country: data.countryCode,
//       is_proxy: data.proxy,
//       is_hosting: data.hosting,
//       is_mobile: data.mobile,
//       risk_flags: data.summary.riskFlags,
//     },
//     credits_spent: creditCost,
//     created_by: context.userId,
//   });

//   // Build message
//   const parts: string[] = [];
//   parts.push(data.summary.location);
//   if (data.isp) parts.push(`ISP: ${data.isp}`);
//   if (data.proxy) parts.push('Proxy/VPN');
//   if (data.hosting) parts.push('Datacenter');
//   if (data.mobile) parts.push('Mobile');

//   const baseMessage = parts.join(' | ');
//   const finalMessage = createdNewRecord
//     ? `${baseMessage} (created new IP record)`
//     : baseMessage;

//   return {
//     success: true,
//     result: {
//       ip: data.ip,
//       ip_id: ipId,
//       view_url: viewUrl,
//       created_new_record: createdNewRecord,
//       valid: data.valid,
//       location: data.summary.location,
//       country: data.country,
//       country_code: data.countryCode,
//       region: data.regionName,
//       city: data.city,
//       coordinates: data.lat && data.lon ? { lat: data.lat, lon: data.lon } : null,
//       timezone: data.timezone,
//       isp: data.isp,
//       organization: data.org,
//       asn: data.as,
//       is_proxy: data.proxy,
//       is_hosting: data.hosting,
//       is_mobile: data.mobile,
//       risk_flags: data.summary.riskFlags,
//       message: finalMessage,
//       investigation_tips: getIpGeolocationTips(data),
//     },
//     creditsCost: creditCost,
//   };
// }

// function getIpGeolocationTips(data: ipGeolocation.IpGeolocationResult): string[] {
//   const tips: string[] = [];

//   if (data.proxy) {
//     tips.push('IP is detected as a proxy/VPN - subject may be hiding their real location');
//   }
//   if (data.hosting) {
//     tips.push('IP belongs to a hosting provider - may be a server, not a personal device');
//   }
//   if (data.mobile) {
//     tips.push('Mobile network IP - location may change frequently');
//   }
//   if (data.isp && data.org && data.isp !== data.org) {
//     tips.push(`ISP (${data.isp}) differs from organization (${data.org}) - verify which is accurate`);
//   }

//   return tips;
// }

// async function executeReverseDns(
//   args: { ip: string; ip_id?: string },
//   context: { organizationId: string; userId: string }
// ): Promise<ToolResult> {
//   const creditCost = dnsLookup.DNS_LOOKUP_CREDIT_COST;

//   // Spend credits
//   const spendResult = await spendCreditsForTool(
//     context.organizationId,
//     creditCost,
//     'reverse_dns',
//     `Reverse DNS: ${args.ip}`
//   );

//   if (!spendResult.success) {
//     return {
//       success: false,
//       result: {
//         error: 'insufficient_credits',
//         message: `This action requires ${creditCost} credits. ${spendResult.error}`,
//         credits_required: creditCost,
//       },
//       creditsCost: 0,
//     };
//   }

//   // Perform lookup
//   const result = await dnsLookup.reverseDns(args.ip);

//   if (result.error) {
//     return {
//       success: false,
//       result: null,
//       error: result.error,
//       creditsCost: creditCost,
//     };
//   }

//   const hostnames = result.data || [];

//   // Find or create IP record to get view URL
//   let ipId = args.ip_id;
//   let createdNewRecord = false;
//   if (!ipId) {
//     // Try to find existing IP record
//     const { data: existingIp } = await supabase
//       .from('ip_addresses')
//       .select('id')
//       .eq('organization_id', context.organizationId)
//       .eq('address', args.ip)
//       .maybeSingle();

//     if (existingIp) {
//       ipId = existingIp.id;
//     } else {
//       // Create new IP record with hostname
//       const { data: newIp } = await supabase
//         .from('ip_addresses')
//         .insert({
//           organization_id: context.organizationId,
//           address: args.ip,
//           hostname: hostnames[0] || null,
//         })
//         .select('id')
//         .single();
//       ipId = newIp?.id;
//       createdNewRecord = true;
//     }
//   }

//   const viewUrl = ipId ? `/ips/${ipId}?action=reverse_dns` : null;

//   // Save to action_results
//   await supabase.from('action_results').insert({
//     organization_id: context.organizationId,
//     action_type: 'reverse_dns',
//     entity_type: 'ip_address',
//     entity_id: ipId || null,
//     entity_value: args.ip,
//     results: { hostnames },
//     summary: {
//       hostname_count: hostnames.length,
//       primary_hostname: hostnames[0] || null,
//     },
//     credits_spent: creditCost,
//     created_by: context.userId,
//   });

//   // Build message
//   const baseMessage = hostnames.length > 0
//     ? `Found ${hostnames.length} hostname(s): ${hostnames.slice(0, 3).join(', ')}${hostnames.length > 3 ? '...' : ''}`
//     : 'No PTR records found for this IP';

//   const finalMessage = createdNewRecord
//     ? `${baseMessage} (created new IP record)`
//     : baseMessage;

//   return {
//     success: true,
//     result: {
//       ip: args.ip,
//       ip_id: ipId,
//       view_url: viewUrl,
//       created_new_record: createdNewRecord,
//       hostnames,
//       primary_hostname: hostnames[0] || null,
//       message: finalMessage,
//     },
//     creditsCost: creditCost,
//   };
// }
