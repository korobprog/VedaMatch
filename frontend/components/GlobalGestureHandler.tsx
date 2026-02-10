import React, { ReactNode } from 'react';
import { Dimensions } from 'react-native';
import {
    Gesture,
    GestureDetector,
    GestureHandlerRootView
} from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { useSettings } from '../context/SettingsContext';
import { useUser } from '../context/UserContext';
import { navigationRef } from '../navigation/navigationRef';

interface GlobalGestureHandlerProps {
    children: ReactNode;
}

const { width } = Dimensions.get('window');
const SWIPE_THRESHOLD = 50;
const EDGE_THRESHOLD = 50; // Distance from edge to start the gesture

export const GlobalGestureHandler: React.FC<GlobalGestureHandlerProps> = ({
    children,
}) => {
    const { setIsMenuOpen, isMenuOpen } = useSettings();
    const { isLoggedIn } = useUser();

    const panGesture = Gesture.Pan()
        .activeOffsetX([-10, 10]) // Small movement to activate in both directions
        .failOffsetY([-20, 20]) // Fail if moving too much vertically
        .onEnd((event) => {
            const startX = (event as any).startX || 0;
            const isFromLeftEdge = startX < EDGE_THRESHOLD;
            const isFromRightEdge = startX > width - EDGE_THRESHOLD;

            // Left-to-right swipe from left edge → go to Portal home screen
            if (isLoggedIn && isFromLeftEdge && event.translationX > SWIPE_THRESHOLD) {
                if (navigationRef.isReady()) {
                    navigationRef.navigate('Portal', { resetToGridAt: Date.now() });
                }
            }

            // Right-to-left swipe from right edge → открыть меню настроек (справа)
            if (!isMenuOpen && isFromRightEdge && event.translationX < -SWIPE_THRESHOLD) {
                setIsMenuOpen(true);
            }
        })
        .runOnJS(true);

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <GestureDetector gesture={panGesture}>
                <Animated.View style={{ flex: 1 }}>
                    {children}
                </Animated.View>
            </GestureDetector>
        </GestureHandlerRootView>
    );
};
