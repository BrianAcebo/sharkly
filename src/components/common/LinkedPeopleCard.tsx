import ComponentCard from './ComponentCard';
import LinkedPeopleList, { LinkedPersonItem } from './LinkedPeopleList';
import { Button } from '../ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '../ui/dropdown-menu';
import { Coins, Pencil, Zap } from 'lucide-react';
import { getActionCost, ActionKey, ENABLE_ACTION_FLAGS } from '../../constants/costs';
import React from 'react';

export default function LinkedPeopleCard({
	title = 'People',
	items,
	onUnlink,
	onEdit,
	actions,
	displayName
}: {
	title?: string;
	items: LinkedPersonItem[];
	onUnlink?: (personId: string) => void | Promise<void>;
	onEdit?: () => void;
	actions?: React.ReactNode;
	displayName?: string;
}) {
	return (
		<ComponentCard>
			<div className="mb-3 flex items-center justify-between">
				<h3 className="text-lg font-semibold">{title}</h3>
				<div className="flex items-center gap-2">
					{actions ??
						((ENABLE_ACTION_FLAGS[ActionKey.DiscoverProfiles] || ENABLE_ACTION_FLAGS[ActionKey.LinkEntity]) ? (
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button size="sm" variant="outline" disabled={!ENABLE_ACTION_FLAGS[ActionKey.LinkEntity]}>
									<Zap className="size-4" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<DropdownMenuLabel>Perform Action</DropdownMenuLabel>
								<div className="flex justify-between gap-2">
									<div>
										<DropdownMenuItem className="group flex cursor-pointer items-center justify-between gap-2" disabled={!ENABLE_ACTION_FLAGS[ActionKey.DiscoverProfiles]}>
											Discover people
										</DropdownMenuItem>
									</div>
									<div className="w-20">
										<DropdownMenuItem disabled={!ENABLE_ACTION_FLAGS[ActionKey.LinkEntity]}>
											<span className="border-l pl-3 text-sm text-gray-500">
												{getActionCost(ActionKey.LinkEntity)} <Coins className="ml-0.5 inline-block size-3" />
											</span>
										</DropdownMenuItem>
									</div>
								</div>
								<DropdownMenuSeparator />
								<DropdownMenuItem disabled>Actions will run for {displayName ?? 'selection'}</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					) : null)}
					{onEdit ? (
						<Button size="sm" variant="outline" onClick={onEdit}>
							<Pencil className="size-4" />
						</Button>
					) : null}
				</div>
			</div>
			<LinkedPeopleList items={items} onUnlink={onUnlink} />
		</ComponentCard>
	);
}


