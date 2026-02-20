import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Platform } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { useSettings } from '../../context/SettingsContext';
import { useUser } from '../../context/UserContext';
import { useRoleTheme } from '../../hooks/useRoleTheme';

// iOS-style calculations:
// 16px horizontal padding, 12px gap between items
// On thin phones (~375px), min width for item is 140px, max 160px
// Using flex: 1 and minWidth/maxWidth allows proper scaling on iPads
const { width } = Dimensions.get('window');
const SPACING = 16;
const GAP = 12;
const COLUMNS = width > 600 ? 3 : 2;

// Base calculation to fit available columns with gaps
const BASE_WIDTH = (width - (SPACING * 2) - (GAP * (COLUMNS - 1))) / COLUMNS;

export interface MultimediaMenuItemProps {
    id: string;
    title: string;
    icon: LucideIcon;
    color: string;
    onPress: () => void;
    index: number; // to staggered animations if needed
}

export const MultimediaMenuItem: React.FC<MultimediaMenuItemProps> = ({ title, icon: Icon, color, onPress }) => {
    const { isDarkMode, vTheme } = useSettings();
    const { user } = useUser();
    const { colors: roleColors } = useRoleTheme(user?.role, isDarkMode);

    // Vivid background colors typical of iOS Control Center / Media widgets
    // The icon container uses the solid color, the background uses a very low opacity of it
    const bgColor = isDarkMode ? '#1C1C1E' : '#FFFFFF';
    const borderColor = isDarkMode ? '#38383A' : '#E5E5EA';
    const textColorPrimary = isDarkMode ? '#FFFFFF' : '#000000';

    return (
        <TouchableOpacity
            activeOpacity={0.7} // Standard iOS feedback
            style={[
                styles.container,
                {
                    width: BASE_WIDTH,
                    backgroundColor: bgColor, 
                },
                vTheme.shadows.soft,
            ]}
            onPress={onPress}
        >
            <View style={[styles.cardBg, { backgroundColor: isDarkMode ? `${color}25` : `${color}15`, borderColor: isDarkMode ? `${color}40` : `${color}30` }]}>
                <View style={[styles.iconBox, { backgroundColor: color }]}>
                    <Icon size={24} color="#FFF" />
                </View>
                <View style={styles.textContainer}>
                    <Text
                        style={[styles.title, { color: textColorPrimary }]}
                        numberOfLines={2}
                        adjustsFontSizeToFit
                        minimumFontScale={0.8}
                    >
                        {title}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        // Height scaled for thumb interaction zone and larger font sizes 
        height: 76,
        borderRadius: 20, // Squircle equivalent for RN
        marginBottom: GAP,
        // Add subtle shadow to the container itself
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 12,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    cardBg: {
        flex: 1,
        borderRadius: 20,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12, // slightly tighter inner padding to leave room for text
        overflow: 'hidden', // to keep any inner elements inside the border radius
    },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: 12, // iOS prefers more rounded inner rectangles
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
        // Subtle inner shadow effect
        ...Platform.select({
            ios: {
                shadowColor: '#FFF',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.2,
                shadowRadius: 1,
            },
        }),
    },
    textContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    title: {
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: -0.24, // iOS system font tracking
        lineHeight: 18,
    },
});
