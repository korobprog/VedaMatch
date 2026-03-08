import React from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';

interface FormInputProps extends TextInputProps {
    label: string;
    theme: any;
    value: string;
    onChangeText: (text: string) => void;
}

export const FormInput: React.FC<FormInputProps> = ({
    label,
    theme,
    value,
    onChangeText,
    style,
    ...props
}) => {
    return (
        <View style={styles.container}>
            <Text style={styles.label}>{label}</Text>
            <TextInput
                style={[
                    styles.input,
                    {
                        backgroundColor: theme?.inputBackground ?? styles.input.backgroundColor,
                        borderColor: theme?.borderColor ?? styles.input.borderColor,
                        color: theme?.inputText ?? styles.input.color,
                    },
                    style
                ]}
                value={value}
                onChangeText={onChangeText}
                placeholderTextColor={theme?.subText ?? 'rgba(248,250,252,0.4)'}
                {...props}
            />
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
        fontSize: 16,
        height: 54,
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderColor: 'rgba(255,255,255,0.14)',
        color: '#F8FAFC',
        shadowColor: 'rgba(244, 197, 66, 0.22)',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 14,
        elevation: 2,
    },
});
