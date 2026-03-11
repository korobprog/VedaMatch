import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('../../../context/SettingsContext', () => ({
    useSettings: () => ({
        vTheme: {
            colors: {
                background: '#ffffff',
                primary: '#111111',
            },
        },
        isDarkMode: false,
    }),
}));

const WidgetSelectionScreen = require('../../../screens/portal/WidgetSelectionScreen').default;

describe('WidgetSelectionScreen', () => {
    it('redirects legacy route into Portal widgets page', () => {
        const navigation = {
            replace: jest.fn(),
        };

        render(
            <WidgetSelectionScreen
                navigation={navigation}
                route={{ params: { source: 'portal_swipe' } }}
            />,
        );

        expect(navigation.replace).toHaveBeenCalledWith('Portal', {
            initialPage: 'widgets',
            returnToWidget: true,
        });
    });
});
