import React from 'react';
import { Calendar as CalendarIcon, Clock, Film } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { PortalWidget } from '../../../types/portal';
import { CalendarWidget } from '../CalendarWidget';
import { CirclesPanelWidget } from '../CirclesPanelWidget';
import { CirclesQuickWidget } from '../CirclesQuickWidget';
import { ClockWidget } from '../ClockWidget';

export type WidgetType = PortalWidget['type'];
export type WidgetSize = PortalWidget['size'];

export interface WidgetCatalogEntry {
    type: WidgetType;
    size: WidgetSize;
    title: string;
    description: string;
    icon: LucideIcon;
    maxCount: number;
    render: () => React.ReactNode;
}

export const getWidgetKey = (widget: Pick<PortalWidget, 'type' | 'size'>): string => `${widget.type}:${widget.size}`;

export const WIDGET_CATALOG: WidgetCatalogEntry[] = [
    {
        type: 'clock',
        size: '2x1',
        title: 'Большие часы',
        description: 'Отображает время и дату в широком формате',
        icon: Clock,
        maxCount: 1,
        render: () => <ClockWidget size="2x1" />,
    },
    {
        type: 'clock',
        size: '1x1',
        title: 'Компактные часы',
        description: 'Минималистичные часы 1x1',
        icon: Clock,
        maxCount: 1,
        render: () => <ClockWidget size="1x1" />,
    },
    {
        type: 'calendar',
        size: '2x2',
        title: 'Календарь',
        description: 'Полный обзор месяца с подсветкой текущей даты',
        icon: CalendarIcon,
        maxCount: 1,
        render: () => <CalendarWidget size="2x2" />,
    },
    {
        type: 'circles_quick',
        size: '1x1',
        title: 'Кружки (быстрый)',
        description: 'Открытие ленты, удержание для быстрого создания',
        icon: Film,
        maxCount: 1,
        render: () => <CirclesQuickWidget />,
    },
    {
        type: 'circles_panel',
        size: '2x2',
        title: 'Панель кружков',
        description: 'Создание + кружки друзей + мини-превью',
        icon: Film,
        maxCount: 1,
        render: () => <CirclesPanelWidget isVisible />,
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

