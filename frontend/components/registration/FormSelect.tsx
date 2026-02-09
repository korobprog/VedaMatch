import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface FormSelectProps {
    label: string;
    value: string;
    placeholder: string;
    theme: any;
    onPress: () => void;
    disabled?: boolean;
    loading?: boolean;
    loadingText?: string;
}

export const FormSelect: React.FC<FormSelectProps> = ({
    label,
    value,
    placeholder,
    theme,
    onPress,
    disabled = false,
    loading = false,
    loadingText = 'Loading...',
}) => {
    return (
        <View style={styles.container}>
            <Text style={styles.label}>{label}</Text>
            <TouchableOpacity
                style={[
                    styles.input,
                    { justifyContent: 'center' }
                ]}
                onPress={onPress}
                disabled={disabled}
                activeOpacity={0.7}
            >
                <Text style={{ color: value ? '#F8FAFC' : 'rgba(248,250,252,0.4)', fontSize: 16 }}>
                    {loading ? loadingText : (value || placeholder)}
                </Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 4,
    },
    label: {
        fontSize: 14,
        marginBottom: 8,
        marginTop: 16,
        fontWeight: '700',
        color: '#F8FAFC',
        opacity: 0.9,
    },
    input: {
        borderWidth: 1.5,
        borderRadius: 12,
        padding: 12,
        height: 54,
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderColor: 'rgba(255,255,255,0.12)',
    },
});
