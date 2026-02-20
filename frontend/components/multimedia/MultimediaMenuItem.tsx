import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { useSettings } from '../../context/SettingsContext';
import { useUser } from '../../context/UserContext';
import { useRoleTheme } from '../../hooks/useRoleTheme';

const { width } = Dimensions.get('window');

// 16px padding on both sides, 12px gap between items. 
// Allows for 2 items per row with nice iOS-style proportions.
const ITEM_WIDTH = Math.floor((width - 32 - 12) / 2);

export interface MultimediaMenuItemProps {
    id: string;
    title: string;
    icon: LucideIcon;
    color: string;
    onPress: () => void;
}

export const MultimediaMenuItem: React.FC<MultimediaMenuItemProps> = ({ title, icon: Icon, color, onPress }) => {
    const { isDarkMode, vTheme } = useSettings();
    const { user } = useUser();
    const { colors: roleColors } = useRoleTheme(user?.role, isDarkMode);

    // iOS-style colors: vivid, slight transparency for backgrounds
    const bgColor = isDarkMode ? `${color}1A` : `${color}15`; // 10-15% opacity
    const activeOpacity = 0.7;

    return (
        <TouchableOpacity
            activeOpacity={activeOpacity}
            style={[
                styles.container,
                {
                    backgroundColor: bgColor,
                    borderColor: isDarkMode ? `${color}33` : `${color}20`,
                },
            ]}
            onPress={onPress}
        >
            <View style={[styles.iconContainer, { backgroundColor: color, ...vTheme.shadows.soft }]}>
                <Icon size={24} color="#FFF" />
            </View>
            <Text style={[styles.title, { color: roleColors.textPrimary }]} numberOfLines={1}>
                {title}
            </Text>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        width: ITEM_WIDTH,
        height: 72,
        borderRadius: 16, // iOS standard for large elements
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12, // iOS squircle approximation
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    title: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600', // iOS uses semibold for primary list items
        letterSpacing: -0.3, // iOS tracking
    },
});
