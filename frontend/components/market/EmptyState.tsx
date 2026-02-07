import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSettings } from '../../context/SettingsContext';
import { ShoppingBag } from 'lucide-react-native';

interface EmptyStateProps {
    icon?: string | React.ReactNode;
    title: string;
    message: string;
    actionLabel?: string;
    onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
    icon,
    title,
    message,
    actionLabel,
    onAction
}) => {
    const { isDarkMode } = useSettings();

    return (
        <View style={styles.container}>
            <View style={styles.iconContainer}>
                {typeof icon === 'string' ? (
                    <Text style={styles.icon}>{icon}</Text>
                ) : (
                    icon || <ShoppingBag size={64} color="rgba(255,255,255,0.1)" />
                )}
            </View>
            <Text style={[styles.title, { color: isDarkMode ? '#fff' : '#000' }]}>
                {title}
            </Text>
            <Text style={[styles.message, { color: isDarkMode ? 'rgba(255,255,255,0.4)' : '#666' }]}>
                {message}
            </Text>

            {actionLabel && onAction && (
                <TouchableOpacity
                    style={[styles.button, { backgroundColor: '#F59E0B' }]}
                    onPress={onAction}
                    activeOpacity={0.8}
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
    iconContainer: {
        marginBottom: 20,
    },
    icon: {
        fontSize: 64,
    },
    title: {
        fontSize: 18,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 8,
    },
    message: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 30,
    },
    button: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 20,
    },
    buttonText: {
        color: '#1a1a2e',
        fontSize: 14,
        fontWeight: '900',
    },
});

