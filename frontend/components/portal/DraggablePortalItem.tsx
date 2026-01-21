import React, { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    withSequence,
    runOnJS,
} from 'react-native-reanimated';

interface DraggablePortalItemProps {
    children: React.ReactNode;
    isEditMode: boolean;
    id: string;
    onDragStart: () => void;
    onDragEnd: (id: string, x: number, y: number) => void;
    onLayout?: (e: any) => void;
    onPress?: () => void;
    onSecondaryLongPress?: () => void; // For "extra long" press actions
}

export const DraggablePortalItem: React.FC<DraggablePortalItemProps> = ({
    children,
    isEditMode,
    id,
    onDragStart,
    onDragEnd,
    onLayout,
    onPress,
    onSecondaryLongPress,
}) => {
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const isDragging = useSharedValue(false);
    const zIndex = useSharedValue(1);
    const scale = useSharedValue(1);
    const opacity = useSharedValue(1);
    const isLongPressActive = useRef(false);
    const secondaryTriggered = useSharedValue(false);

    // Create combined gesture for tap, long-press, and drag
    const tapGesture = Gesture.Tap()
        .enabled(!isEditMode)
        .maxDuration(250)
        .onEnd(() => {
            if (onPress && !isLongPressActive.current) {
                runOnJS(onPress)();
            }
        });

    // Long press gesture - activates drag mode (doesn't enter edit mode)
    const longPressGesture = Gesture.LongPress()
        .minDuration(400)
        .onStart(() => {
            isLongPressActive.current = true;
            isDragging.value = true;
            secondaryTriggered.value = false;
            zIndex.value = 1000;
            scale.value = withSpring(1.15);
            opacity.value = withTiming(0.9);
            // Call drag start - this should NOT enter edit mode
            runOnJS(onDragStart)();
        });

    // Secondary (extra long) press gesture
    const secondaryLongPressGesture = Gesture.LongPress()
        .minDuration(1000)
        .onStart(() => {
            if (onSecondaryLongPress && !secondaryTriggered.value) {
                secondaryTriggered.value = true;
                // Give a subtle haptic-like scale bump
                scale.value = withSequence(
                    withTiming(1.25, { duration: 100 }),
                    withSpring(1.15)
                );
                runOnJS(onSecondaryLongPress)();
            }
        });

    // Pan gesture - follows finger when dragging
    const panGesture = Gesture.Pan()
        .manualActivation(true)
        .onTouchesMove((evt, state) => {
            // Only activate pan if we're in drag mode (long press was triggered)
            if (isDragging.value || isEditMode) {
                state.activate();
            } else {
                state.fail();
            }
        })
        .onStart(() => {
            if (isEditMode && !isDragging.value) {
                // In edit mode, start dragging immediately on pan
                isDragging.value = true;
                zIndex.value = 1000;
                scale.value = withSpring(1.15);
                opacity.value = withTiming(0.9);
                runOnJS(onDragStart)();
            }
        })
        .onUpdate((event) => {
            if (isDragging.value) {
                translateX.value = event.translationX;
                translateY.value = event.translationY;
            }
        })
        .onEnd((event) => {
            if (isDragging.value) {
                const finalX = event.absoluteX;
                const finalY = event.absoluteY;

                runOnJS(onDragEnd)(id, finalX, finalY);

                // Snap back to original position
                translateX.value = withSpring(0, { damping: 12 });
                translateY.value = withSpring(0, { damping: 12 });
                scale.value = withSpring(1);
                opacity.value = withTiming(1);
                zIndex.value = 1;
                isDragging.value = false;
                isLongPressActive.current = false;
            }
        })
        .onFinalize(() => {
            // Reset everything on gesture finalize
            isDragging.value = false;
            isLongPressActive.current = false;
            secondaryTriggered.value = false;
            translateX.value = withSpring(0, { damping: 12 });
            translateY.value = withSpring(0, { damping: 12 });
            scale.value = withSpring(1);
            opacity.value = withTiming(1);
            zIndex.value = 1;
        });

    // Combine gestures: long press triggers drag mode, then pan follows
    // We run the longPress and secondaryLongPress simultaneously
    const composedGesture = Gesture.Race(
        tapGesture,
        Gesture.Simultaneous(
            secondaryLongPressGesture,
            Gesture.Simultaneous(longPressGesture, panGesture)
        )
    );

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: translateX.value },
            { translateY: translateY.value },
            { scale: scale.value },
        ],
        zIndex: zIndex.value,
        opacity: opacity.value,
    }));

    return (
        <GestureDetector gesture={composedGesture}>
            <Animated.View
                style={[styles.container, animatedStyle]}
                onLayout={onLayout}
            >
                {children}
            </Animated.View>
        </GestureDetector>
    );
};

const styles = StyleSheet.create({
    container: {
        zIndex: 1,
    },
});
