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
        <View>
            <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
            <TextInput
                style={[
                    styles.input,
                    {
                        backgroundColor: theme.inputBackground,
                        color: theme.inputText,
                        borderColor: theme.borderColor
                    },
                    style
                ]}
                value={value}
                onChangeText={onChangeText}
                placeholderTextColor={theme.subText}
                {...props}
            />
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
