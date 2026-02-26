import { PortalLayout, PortalWidget } from '../types/portal';

const VALID_WIDGET_TYPES = new Set<PortalWidget['type']>(['clock', 'calendar', 'circles_quick', 'circles_panel']);
const VALID_WIDGET_SIZES = new Set<PortalWidget['size']>(['1x1', '2x1', '2x2']);
type NewWidgetInput = Omit<PortalWidget, 'id' | 'position'>;
type AddWidgetResult = { ok: true } | { ok: false; reason: 'duplicate' };

export const getWidgetSignature = (widget: Pick<PortalWidget, 'type' | 'size'>): string => `${widget.type}:${widget.size}`;

export const hasWidgetDuplicate = (
    widgets: PortalWidget[],
    candidate: Pick<PortalWidget, 'type' | 'size'>,
): boolean => widgets.some((widget) => getWidgetSignature(widget) === getWidgetSignature(candidate));

export const normalizeWidgetPositions = (widgets: PortalWidget[]): PortalWidget[] => (
    widgets.map((widget, index) => ({ ...widget, position: index }))
);

export const addWidgetToCanvas = (
    widgets: PortalWidget[],
    widget: NewWidgetInput,
    createId: () => string = () => `widget-${Date.now()}`,
): { widgets: PortalWidget[]; result: AddWidgetResult } => {
    const orderedWidgets = normalizeWidgetPositions(widgets);
    if (hasWidgetDuplicate(orderedWidgets, widget)) {
        return { widgets: orderedWidgets, result: { ok: false, reason: 'duplicate' } };
    }

    const nextWidget: PortalWidget = {
        ...widget,
        id: createId(),
        position: orderedWidgets.length,
    };

    return {
        widgets: [...orderedWidgets, nextWidget],
        result: { ok: true },
    };
};

export const removeWidgetFromCanvas = (widgets: PortalWidget[], widgetId: string): PortalWidget[] => {
    const filteredWidgets = widgets.filter((widget) => widget.id !== widgetId);
    return normalizeWidgetPositions(filteredWidgets);
};

export const reorderWidgetCanvas = (widgets: PortalWidget[], fromIndex: number, toIndex: number): PortalWidget[] => {
    const orderedWidgets = normalizeWidgetPositions([...widgets]);
    if (orderedWidgets.length === 1 && fromIndex === 0 && toIndex >= 0) {
        const [singleWidget] = orderedWidgets;
        return [{ ...singleWidget, position: toIndex }];
    }
    if (fromIndex < 0 || toIndex < 0 || fromIndex >= orderedWidgets.length || toIndex >= orderedWidgets.length) {
        return orderedWidgets;
    }
    const [movedWidget] = orderedWidgets.splice(fromIndex, 1);
    orderedWidgets.splice(toIndex, 0, movedWidget);
    return normalizeWidgetPositions(orderedWidgets);
};

export const normalizeWidgetCanvasLayout = (inputLayout: PortalLayout): { layout: PortalLayout; changed: boolean } => {
    const rawLayout = inputLayout as PortalLayout & {
        widgetCanvas?: {
            widgets?: PortalWidget[];
            lastModified?: number;
        };
    };

    const existingWidgetCanvas = rawLayout.widgetCanvas;

    const layout: PortalLayout = {
        ...inputLayout,
        pages: inputLayout.pages.map((page) => ({
            ...page,
            items: page.items.map((item) => item.type === 'folder'
                ? { ...item, items: [...item.items] }
                : { ...item }),
            widgets: [...(page.widgets || [])],
        })),
        quickAccess: [...inputLayout.quickAccess],
        widgetCanvas: {
            widgets: [...(existingWidgetCanvas?.widgets || [])],
            lastModified: existingWidgetCanvas?.lastModified || 0,
        },
    };

    let changed = false;

    const legacyWidgets = layout.pages.flatMap((page) => page.widgets || []);
    if (!existingWidgetCanvas) {
        layout.widgetCanvas.widgets = [...legacyWidgets];
        changed = true;
    }

    const seen = new Set<string>();
    const normalizedWidgets: PortalWidget[] = [];
    layout.widgetCanvas.widgets.forEach((widget, index) => {
        if (!VALID_WIDGET_TYPES.has(widget.type) || !VALID_WIDGET_SIZES.has(widget.size)) {
            changed = true;
            return;
        }

        const key = getWidgetSignature(widget);
        if (seen.has(key)) {
            changed = true;
            return;
        }
        seen.add(key);

        const id = widget.id || `widget-${key}-${index}`;
        const position = normalizedWidgets.length;
        if (id !== widget.id || widget.position !== position) {
            changed = true;
        }

        normalizedWidgets.push({
            ...widget,
            id,
            position,
        });
    });

    layout.widgetCanvas.widgets = normalizeWidgetPositions(normalizedWidgets);

    layout.pages = layout.pages.map((page) => {
        if ((page.widgets || []).length === 0) {
            return page;
        }
        changed = true;
        return {
            ...page,
            widgets: [],
        };
    });

    if (layout.widgetCanvas.lastModified <= 0) {
        changed = true;
        layout.widgetCanvas.lastModified = Date.now();
    }

    if (changed) {
        layout.widgetCanvas.lastModified = Date.now();
        layout.lastModified = Date.now();
        layout.syncedWithServer = false;
    }

    return { layout, changed };
};
