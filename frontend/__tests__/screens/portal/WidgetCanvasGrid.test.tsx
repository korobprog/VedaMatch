import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

jest.mock('@react-native-community/blur', () => ({ BlurView: 'BlurView' }));

jest.mock('../../../context/SettingsContext', () => ({
    useSettings: () => ({
        vTheme: {
            colors: {
                text: '#111111',
                textSecondary: '#777777',
                backgroundSecondary: '#f5f5f5',
                divider: '#e5e7eb',
            },
        },
        portalBackgroundType: 'color',
        performanceMode: 'high_quality',
        runtimePerformanceState: null,
    }),
}));

jest.mock('../../../components/portal/widgets/renderPortalWidget', () => ({
    renderPortalWidget: () => null,
}));

const { WidgetCanvasGrid } = require('../../../components/portal/widgets/WidgetCanvasGrid');

describe('WidgetCanvasGrid', () => {
    it('enables edit mode on long press in empty canvas', () => {
        const onSetEditMode = jest.fn();
        const screen = render(
            <WidgetCanvasGrid
                widgets={[]}
                isEditMode={false}
                onSetEditMode={onSetEditMode}
                onRemoveWidget={jest.fn()}
                onReorderWidgets={jest.fn()}
            />,
        );

        fireEvent(screen.getByText('Пока нет виджетов'), 'onLongPress');
        expect(onSetEditMode).toHaveBeenCalledWith(true);
    });
});
