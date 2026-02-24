import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

const mockHandleNewChat = jest.fn();
const mockSetEditMode = jest.fn();

jest.mock('@react-native-community/blur', () => ({ BlurView: 'BlurView' }));

jest.mock('../../../components/portal/PortalBackgroundLayer', () => ({
    PortalBackgroundLayer: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    deriveEffectivePortalBackground: (portalBackgroundType: string, portalBackground: string, activeWallpaper: string, isSlideshowEnabled: boolean) => ({
        effectiveBackground: isSlideshowEnabled ? activeWallpaper : portalBackground,
        effectiveBackgroundType: isSlideshowEnabled ? 'image' : portalBackgroundType,
    }),
}));

jest.mock('../../../components/wallet/PortalLkmCircleButton', () => ({
    PortalLkmCircleButton: () => null,
}));

jest.mock('../../../components/portal/BellButton', () => ({
    BellButton: () => null,
}));

jest.mock('../../../context/ChatContext', () => ({
    useChat: () => ({
        handleNewChat: mockHandleNewChat,
    }),
}));

jest.mock('../../../context/PortalLayoutContext', () => ({
    usePortalLayout: () => ({
        layout: {
            widgetCanvas: { widgets: [], lastModified: 0 },
            quickAccess: [
                { id: 'qa-services', serviceId: 'services', type: 'service', position: 0 },
                { id: 'qa-calls', serviceId: 'calls', type: 'service', position: 1 },
                { id: 'qa-rooms', serviceId: 'rooms', type: 'service', position: 2 },
            ],
            iconSize: 'medium',
        },
        isEditMode: false,
        setEditMode: mockSetEditMode,
        addWidget: jest.fn(() => ({ ok: true })),
        removeWidget: jest.fn(),
        reorderWidgets: jest.fn(),
    }),
}));

jest.mock('../../../context/SettingsContext', () => ({
    useSettings: () => ({
        vTheme: {
            colors: {
                text: '#111111',
                textSecondary: '#777777',
                background: '#ffffff',
                backgroundSecondary: '#f5f5f5',
                primary: '#111111',
                divider: '#e5e7eb',
            },
        },
        isDarkMode: false,
        setIsMenuOpen: jest.fn(),
        portalIconStyle: 'glass',
        portalBackgroundType: 'color',
        portalBackground: '',
        activeWallpaper: '',
        isSlideshowEnabled: false,
        removeWallpaperSlide: jest.fn(),
        wallpaperSlides: [],
        setPortalBackground: jest.fn(),
        performanceMode: 'high_quality',
        runtimePerformanceState: null,
    }),
}));

jest.mock('../../../components/portal/widgets/WidgetCanvasGrid', () => ({
    WidgetCanvasGrid: () => null,
}));

jest.mock('../../../components/portal/widgets/WidgetPickerSheet', () => ({
    WidgetPickerSheet: () => null,
}));

jest.mock('../../../components/portal/PortalIcon', () => {
    const ReactNative = require('react-native');
    return {
        PortalIcon: ({ service, onPress }: { service: { id: string }; onPress: () => void }) => (
            <ReactNative.TouchableOpacity testID={`portal-icon-${service.id}`} onPress={onPress}>
                <ReactNative.Text>{service.id}</ReactNative.Text>
            </ReactNative.TouchableOpacity>
        ),
    };
});

const WidgetSelectionScreen = require('../../../screens/portal/WidgetSelectionScreen').default;

describe('WidgetSelectionScreen', () => {
    beforeEach(() => {
        mockHandleNewChat.mockClear();
        mockSetEditMode.mockClear();
    });

    it('opens assistant chat from services shortcut in widget dock', () => {
        const navigation = {
            navigate: jest.fn(),
            push: jest.fn(),
            canGoBack: jest.fn(() => true),
            goBack: jest.fn(),
        };
        const route = { params: {} };

        const screen = render(
            <WidgetSelectionScreen navigation={navigation} route={route} />,
        );

        fireEvent.press(screen.getByTestId('portal-icon-services'));

        expect(mockHandleNewChat).toHaveBeenCalledTimes(1);
        expect(navigation.navigate).toHaveBeenCalledWith('Chat');
    });
});
