import React from 'react';
import { View, ScrollView, StyleSheet, ViewStyle } from 'react-native';

interface PickerContainerProps {
    theme: any;
    children: React.ReactNode;
    style?: ViewStyle;
    maxHeight?: number;
}

export const PickerContainer: React.FC<PickerContainerProps> = ({
    theme,
    children,
    style,
    maxHeight = 200,
}) => {
    return (
        <View style={[
            styles.pickerContainer,
            {
                backgroundColor: theme.inputBackground,
                borderColor: theme.borderColor
            },
            style
        ]}>
            <ScrollView style={{ maxHeight }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                {children}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    pickerContainer: {
        borderWidth: 1,
        borderRadius: 8,
        marginTop: 5,
        overflow: 'hidden',
        zIndex: 1000,
    },
});
