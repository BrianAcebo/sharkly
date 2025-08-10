import { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, Search, User } from 'lucide-react';
import { cn } from '../../utils/common';
import { Button } from '../ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '../ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { TeamMember } from '../../types/leads';

interface TeamMemberSelectProps {
  teamMembers: TeamMember[];
  selectedMember: TeamMember | undefined;
  onMemberSelect: (member: TeamMember | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
}

export function TeamMemberSelect({
  teamMembers,
  selectedMember,
  onMemberSelect,
  placeholder = "Select team member...",
  disabled = false,
  isLoading = false
}: TeamMemberSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredMembers = useMemo(() => {
    if (!searchQuery) return teamMembers;
    
    const query = searchQuery.toLowerCase();
    return teamMembers.filter(member => 
      member.profile.first_name.toLowerCase().includes(query) ||
      member.profile.last_name.toLowerCase().includes(query) ||
      member.role.toLowerCase().includes(query)
    );
  }, [teamMembers, searchQuery]);

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getDisplayName = (member: TeamMember) => {
    const firstName = member.profile.first_name || '';
    const lastName = member.profile.last_name || '';
    return `${firstName} ${lastName}`.trim() || 'Unknown User';
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled || isLoading}
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600"></div>
              <span>Loading team members...</span>
            </div>
          ) : selectedMember ? (
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={selectedMember.profile.avatar} alt={getDisplayName(selectedMember)} />
                <AvatarFallback className="text-xs">
                  {getInitials(selectedMember.profile.first_name, selectedMember.profile.last_name)}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">{getDisplayName(selectedMember)}</span>
              <span className="text-xs text-gray-500">({selectedMember.role})</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-gray-400" />
              <span className="text-gray-500">{placeholder}</span>
            </div>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <CommandInput
              placeholder="Search team members..."
              value={searchQuery}
              onValueChange={setSearchQuery}
              className="border-0 focus:ring-0"
            />
          </div>
          <CommandList>
            <CommandEmpty>No team member found.</CommandEmpty>
            <CommandGroup>
              {filteredMembers.map((member) => (
                <CommandItem
                  key={member.id}
                  value={member.id}
                  onSelect={() => {
                    onMemberSelect(member);
                    setOpen(false);
                    setSearchQuery('');
                  }}
                  className="flex items-center gap-3 px-3 py-2"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={member.profile.avatar} alt={getDisplayName(member)} />
                    <AvatarFallback className="text-xs">
                      {getInitials(member.profile.first_name, member.profile.last_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="font-medium truncate">{getDisplayName(member)}</span>
                    <span className="text-xs text-gray-500 capitalize">{member.role}</span>
                  </div>
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4",
                      selectedMember?.id === member.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
            {teamMembers.length > 0 && (
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    onMemberSelect(undefined);
                    setOpen(false);
                    setSearchQuery('');
                  }}
                  className="flex items-center gap-3 px-3 py-2 text-gray-500"
                >
                  <div className="h-8 w-8 flex items-center justify-center">
                    <span className="text-xs">—</span>
                  </div>
                  <span>Unassigned</span>
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4",
                      !selectedMember ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
} 