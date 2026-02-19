export interface MessageWithID {
    id: string;
}

export const dedupeById = <T extends MessageWithID>(items: T[]): T[] => {
    if (items.length <= 1) return items;

    const seen = new Set<string>();
    const result: T[] = [];
    for (const item of items) {
        if (!item?.id || seen.has(item.id)) {
            continue;
        }
        seen.add(item.id);
        result.push(item);
    }
    return result;
};

export const prependHistoryPage = <T extends MessageWithID>(current: T[], older: T[]): T[] => {
    return dedupeById([...older, ...current]);
};

export const appendLiveMessage = <T extends MessageWithID>(current: T[], incoming: T): T[] => {
    return dedupeById([...current, incoming]);
};
