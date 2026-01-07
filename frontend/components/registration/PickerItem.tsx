import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

interface PickerItemProps {
    theme: any;
    label: string;
    onPress: () => void;
}

export const PickerItem: React.FC<PickerItemProps> = ({ theme, label, onPress }) => {
    return (
        <TouchableOpacity
            style={[styles.pickerItem, { borderBottomColor: '#333' }]} // Default or theme based
            onPress={onPress}
        >
            <Text style={{ color: theme.inputText }}>{label}</Text>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    pickerItem: {
        padding: 12,
        borderBottomWidth: 0.5,
    },
});
