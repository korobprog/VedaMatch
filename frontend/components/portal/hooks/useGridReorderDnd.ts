import type { MutableRefObject } from 'react';
import { useCallback, useRef, useState } from 'react';
import { LayoutChangeEvent, View } from 'react-native';

interface GridItemWithId {
    id: string;
}

interface UseGridReorderDndParams<T extends GridItemWithId> {
    items: T[];
    onReorder: (fromIndex: number, toIndex: number) => void;
    onDropOnItem?: (movingId: string, targetId: string) => boolean | void;
    hitSlop?: number;
}

interface UseGridReorderDndResult {
    itemRefs: MutableRefObject<Record<string, View | null>>;
    onLayout: (id: string, event: LayoutChangeEvent) => void;
    onDragStart: () => void;
    onDragEnd: (itemId: string, absX: number, absY: number) => void;
    isDragging: boolean;
}

export const useGridReorderDnd = <T extends GridItemWithId>({
    items,
    onReorder,
    onDropOnItem,
    hitSlop = 20,
}: UseGridReorderDndParams<T>): UseGridReorderDndResult => {
    const [isDragging, setIsDragging] = useState(false);
    const itemRefs = useRef<Record<string, View | null>>({});
    const itemLayouts = useRef<Record<string, { x: number; y: number; width: number; height: number }>>({});

    const onLayout = useCallback((id: string, event: LayoutChangeEvent) => {
        const { x, y, width, height } = event.nativeEvent.layout;
        itemLayouts.current[id] = { x, y, width, height };
    }, []);

    const onDragStart = useCallback(() => {
        setIsDragging(true);
    }, []);

    const onDragEnd = useCallback((itemId: string, absX: number, absY: number) => {
        setIsDragging(false);

        const movingIndex = items.findIndex((item) => item.id === itemId);
        if (movingIndex === -1) return;
        if (items.length <= 1) return;

        let targetId: string | null = null;
        let droppedOnOwnItem = false;
        let closestTarget: { id: string; distance: number } | null = null;
        let measuredCount = 0;

        const finalize = () => {
            measuredCount += 1;
            if (measuredCount < items.length) return;
            if (droppedOnOwnItem) return;

            const resolvedTargetId = targetId || closestTarget?.id || null;
            if (!resolvedTargetId || resolvedTargetId === itemId) return;

            if (onDropOnItem?.(itemId, resolvedTargetId)) {
                return;
            }

            const fromIndex = items.findIndex((item) => item.id === itemId);
            const toIndex = items.findIndex((item) => item.id === resolvedTargetId);
            if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;
            onReorder(fromIndex, toIndex);
        };

        items.forEach((item) => {
            const ref = itemRefs.current[item.id];
            if (!ref) {
                finalize();
                return;
            }

            (ref as any).measureInWindow((x: number, y: number, width: number, height: number) => {
                const inBounds = (
                    x !== undefined &&
                    y !== undefined &&
                    width > 0 &&
                    height > 0 &&
                    absX >= x - hitSlop &&
                    absX <= x + width + hitSlop &&
                    absY >= y - hitSlop &&
                    absY <= y + height + hitSlop
                );

                if (item.id === itemId && inBounds) {
                    droppedOnOwnItem = true;
                }

                if (
                    inBounds &&
                    item.id !== itemId &&
                    !targetId
                ) {
                    targetId = item.id;
                }

                if (
                    x !== undefined &&
                    y !== undefined &&
                    width > 0 &&
                    height > 0 &&
                    item.id !== itemId
                ) {
                    const centerX = x + width / 2;
                    const centerY = y + height / 2;
                    const distance = Math.hypot(absX - centerX, absY - centerY);

                    if (!closestTarget || distance < closestTarget.distance) {
                        closestTarget = { id: item.id, distance };
                    }
                }
                finalize();
            });
        });
    }, [hitSlop, items, onDropOnItem, onReorder]);

    return {
        itemRefs,
        onLayout,
        onDragStart,
        onDragEnd,
        isDragging,
    };
};
