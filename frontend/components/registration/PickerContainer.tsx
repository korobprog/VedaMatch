import React from 'react';
import { View, ScrollView, StyleSheet, ViewStyle } from 'react-native';

interface PickerContainerProps {
    theme: any;
    children: React.ReactNode;
    style?: ViewStyle;
    maxHeight?: number;
}

import { BlurView } from '@react-native-community/blur';

export const PickerContainer: React.FC<PickerContainerProps> = ({
    theme,
    children,
    style,
    maxHeight = 250,
}) => {
    return (
        <View style={[
            styles.pickerContainer,
            style
        ]}>
            <BlurView
                style={StyleSheet.absoluteFill}
                blurType="dark"
                blurAmount={10}
            />
            <ScrollView style={{ maxHeight }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                <View style={{ paddingVertical: 4 }}>
                    {children}
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    pickerContainer: {
        borderWidth: 1.5,
        borderRadius: 14,
        marginTop: 8,
        overflow: 'hidden',
        zIndex: 1000,
        backgroundColor: 'rgba(15,23,42,0.8)',
        borderColor: 'rgba(255,255,255,0.15)',
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 10,
    },
});
