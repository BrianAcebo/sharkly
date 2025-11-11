
import type { EntityType } from "../types/entities";

export const handleSearchWebMentions = (originType: EntityType, originId: string, query: string) => {
    if (!query || !originType || !originId) return;

    const params = new URLSearchParams({
        prefill: query,
        auto: '1',
        originType,
        originId
    });
    
    window.open(`/web-search?${params.toString()}`, '_blank', 'noopener,noreferrer');
};