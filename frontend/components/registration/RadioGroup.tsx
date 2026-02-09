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
        <View style={styles.outerContainer}>
            <Text style={styles.label}>{label}</Text>
            <View style={[styles.container, { flexDirection: layout === 'row' ? 'row' : 'column' }]}>
                {options.map((opt) => {
                    const isActive = value === opt;
                    return (
                        <TouchableOpacity
                            key={opt}
                            style={[
                                styles.radioBtn,
                                isActive && styles.activeRadioBtn
                            ]}
                            onPress={() => onChange(opt)}
                            activeOpacity={0.7}
                        >
                            <Text style={[
                                styles.radioText,
                                isActive && styles.activeRadioText
                            ]}>
                                {opt}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    outerContainer: {
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
    container: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    radioBtn: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderWidth: 1.5,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderColor: 'rgba(255,255,255,0.12)',
    },
    activeRadioBtn: {
        backgroundColor: 'rgba(255,183,77,0.15)',
        borderColor: '#FFB74D',
    },
    radioText: {
        color: 'rgba(248,250,252,0.6)',
        fontSize: 14,
        fontWeight: '600',
    },
    activeRadioText: {
        color: '#FFB74D',
        fontWeight: '700',
    },
});
