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
        <View>
            <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
            <TouchableOpacity
                style={[
                    styles.input,
                    {
                        backgroundColor: theme.inputBackground,
                        borderColor: theme.borderColor,
                        justifyContent: 'center'
                    }
                ]}
                onPress={onPress}
                disabled={disabled}
            >
                <Text style={{ color: value ? theme.inputText : theme.subText }}>
                    {loading ? loadingText : (value || placeholder)}
                </Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    label: {
        fontSize: 14,
        marginBottom: 6,
        marginTop: 12,
        fontWeight: '600',
    },
    input: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        height: 50,
    },
});
