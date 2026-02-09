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
            style={styles.pickerItem}
            onPress={onPress}
            activeOpacity={0.6}
        >
            <Text style={styles.text}>{label}</Text>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    pickerItem: {
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.08)',
    },
    text: {
        color: '#F8FAFC',
        fontSize: 15,
        fontWeight: '500',
    },
});
