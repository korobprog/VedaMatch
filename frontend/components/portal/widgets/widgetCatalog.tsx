import React from 'react';
import { Calendar as CalendarIcon, Clock, Film } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { PortalWidget } from '../../../types/portal';
import { CalendarWidget } from '../CalendarWidget';
import { CirclesPanelWidget } from '../CirclesPanelWidget';
import { CirclesQuickWidget } from '../CirclesQuickWidget';
import { ClockWidget } from '../ClockWidget';
import { FeedMixWidget } from '../FeedMixWidget';
import { FeedQuickWidget } from '../FeedQuickWidget';

export type WidgetType = PortalWidget['type'];
export type WidgetSize = PortalWidget['size'];

export interface WidgetCatalogEntry {
    type: WidgetType;
    size: WidgetSize;
    titleKey: string;
    descriptionKey: string;
    icon: LucideIcon;
    maxCount: number;
    render: () => React.ReactNode;
}

export const getWidgetKey = (widget: Pick<PortalWidget, 'type' | 'size'>): string => `${widget.type}:${widget.size}`;

export const WIDGET_CATALOG: WidgetCatalogEntry[] = [
    {
        type: 'clock',
        size: '2x1',
        titleKey: 'portal.widgets.clockWide.title',
        descriptionKey: 'portal.widgets.clockWide.description',
        icon: Clock,
        maxCount: 1,
        render: () => <ClockWidget size="2x1" />,
    },
    {
        type: 'clock',
        size: '1x1',
        titleKey: 'portal.widgets.clockCompact.title',
        descriptionKey: 'portal.widgets.clockCompact.description',
        icon: Clock,
        maxCount: 1,
        render: () => <ClockWidget size="1x1" />,
    },
    {
        type: 'calendar',
        size: '2x2',
        titleKey: 'portal.widgets.calendar.title',
        descriptionKey: 'portal.widgets.calendar.description',
        icon: CalendarIcon,
        maxCount: 1,
        render: () => <CalendarWidget size="2x2" />,
    },
    {
        type: 'circles_quick',
        size: '1x1',
        titleKey: 'portal.widgets.circlesQuick.title',
        descriptionKey: 'portal.widgets.circlesQuick.description',
        icon: Film,
        maxCount: 1,
        render: () => <CirclesQuickWidget />,
    },
    {
        type: 'circles_panel',
        size: '2x2',
        titleKey: 'portal.widgets.circlesPanel.title',
        descriptionKey: 'portal.widgets.circlesPanel.description',
        icon: Film,
        maxCount: 1,
        render: () => <CirclesPanelWidget isVisible />,
    },
    {
        type: 'feed_quick',
        size: '1x1',
        titleKey: 'portal.widgets.feedQuick.title',
        descriptionKey: 'portal.widgets.feedQuick.description',
        icon: Film,
        maxCount: 1,
        render: () => <FeedQuickWidget />,
    },
    {
        type: 'feed_mix',
        size: '2x2',
        titleKey: 'portal.widgets.feedMix.title',
        descriptionKey: 'portal.widgets.feedMix.description',
        icon: Film,
        maxCount: 1,
        render: () => <FeedMixWidget />,
    },
];

export const findWidgetMeta = (widget: Pick<PortalWidget, 'type' | 'size'>): WidgetCatalogEntry | undefined => (
    WIDGET_CATALOG.find((entry) => entry.type === widget.type && entry.size === widget.size)
);

export const canAddWidget = (
    widgets: PortalWidget[],
    candidate: Pick<PortalWidget, 'type' | 'size'>,
): boolean => {
    const meta = findWidgetMeta(candidate);
    if (!meta) return false;
    const count = widgets.filter((widget) => getWidgetKey(widget) === getWidgetKey(candidate)).length;
    return count < meta.maxCount;
};
