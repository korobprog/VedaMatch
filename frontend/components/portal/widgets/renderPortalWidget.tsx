import React from 'react';
import { PortalWidget } from '../../../types/portal';
import { findWidgetMeta } from './widgetCatalog';

export const renderPortalWidget = (widget: Pick<PortalWidget, 'type' | 'size'>): React.ReactNode => {
    const meta = findWidgetMeta(widget);
    if (!meta) return null;
    return meta.render();
};

