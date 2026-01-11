import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme } from 'react-native';
import { ModernVedicTheme as vedicTheme } from '../../theme/ModernVedicTheme';

interface EmptyStateProps {
    icon?: string;
    title: string;
    message: string;
    actionLabel?: string;
    onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
    icon = '🔍',
    title,
    message,
    actionLabel,
    onAction
}) => {
    const isDarkMode = useColorScheme() === 'dark';
    const colors = vedicTheme.colors;

    return (
        <View style={styles.container}>
            <Text style={styles.icon}>{icon}</Text>
            <Text style={[styles.title, { color: isDarkMode ? '#fff' : colors.text }]}>
                {title}
            </Text>
            <Text style={[styles.message, { color: isDarkMode ? '#aaa' : colors.textSecondary }]}>
                {message}
            </Text>

            {actionLabel && onAction && (
                <TouchableOpacity
                    style={[styles.button, { backgroundColor: colors.primary }]}
                    onPress={onAction}
                >
                    <Text style={styles.buttonText}>{actionLabel}</Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    icon: {
        fontSize: 64,
        marginBottom: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 8,
    },
    message: {
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
    },
    button: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 24,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
