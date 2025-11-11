export enum ActionKey {
	DiscoverProperties = 'discover_properties',
	DiscoverEmails = 'discover_emails',
	DiscoverPhones = 'discover_phones',
	DiscoverProfiles = 'discover_profiles',
	SearchWebMentions = 'search_web_mentions',
	LinkEntity = 'link_entity',
	UnlinkEntity = 'unlink_entity',
	CreateEntity = 'create_entity'
}

const ACTION_COSTS: Record<ActionKey, number> = {
	[ActionKey.DiscoverProperties]: 2,
	[ActionKey.DiscoverEmails]: 2,
	[ActionKey.DiscoverPhones]: 2,
	[ActionKey.DiscoverProfiles]: 2,
	[ActionKey.SearchWebMentions]: 2,
	[ActionKey.LinkEntity]: 1,
	[ActionKey.UnlinkEntity]: 0,
	[ActionKey.CreateEntity]: 1
};

// Action feature flags (enable/disable actions globally)
const ACTION_FLAGS: Record<ActionKey, boolean> = {
	[ActionKey.DiscoverProperties]: true,
	[ActionKey.DiscoverEmails]: true,
	[ActionKey.DiscoverPhones]: true,
	[ActionKey.DiscoverProfiles]: true,
	[ActionKey.SearchWebMentions]: true,
	[ActionKey.LinkEntity]: true,
	[ActionKey.UnlinkEntity]: true,
	[ActionKey.CreateEntity]: true
};

// Exported alias requested by product to be used in components
export const ENABLE_ACTION_FLAGS = ACTION_FLAGS;

export function getActionCost(key: ActionKey): number {
	return ACTION_COSTS[key];
}

export function setActionCost(key: ActionKey, value: number) {
	ACTION_COSTS[key] = value;
}

export function isActionEnabled(key: ActionKey): boolean {
	return ACTION_FLAGS[key];
}

export function setActionEnabled(key: ActionKey, enabled: boolean) {
	ACTION_FLAGS[key] = enabled;
}


