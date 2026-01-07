import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface RadioGroupProps {
    label: string;
    options: string[];
    value: string;
    onChange: (val: string) => void;
    theme: any;
    layout?: 'row' | 'column';
}

export const RadioGroup: React.FC<RadioGroupProps> = ({
    label,
    options,
    value,
    onChange,
    theme,
    layout = 'row'
}) => {
    return (
        <View>
            <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
            <View style={[styles.container, { flexDirection: layout === 'row' ? 'row' : 'column' }]}>
                {options.map((opt) => (
                    <TouchableOpacity
                        key={opt}
                        style={[
                            styles.radioBtn,
                            {
                                borderColor: theme.borderColor,
                                backgroundColor: value === opt ? theme.button : 'transparent'
                            }
                        ]}
                        onPress={() => onChange(opt)}
                    >
                        <Text style={{ color: value === opt ? theme.buttonText : theme.text }}>{opt}</Text>
                    </TouchableOpacity>
                ))}
            </View>
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
    container: {
        flexWrap: 'wrap',
        marginBottom: 10,
    },
    radioBtn: {
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderWidth: 1,
        borderRadius: 20,
        marginRight: 10,
        marginBottom: 10,
    },
});
