import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ModernVedicTheme as vedicTheme } from '../../theme/ModernVedicTheme';
import { AdType } from '../../types/ads';

interface AdTabSwitcherProps {
    activeTab: AdType;
    onTabChange: (tab: AdType) => void;
}

export const AdTabSwitcher: React.FC<AdTabSwitcherProps> = ({ activeTab, onTabChange }) => {
    const { t } = useTranslation();
    const isDarkMode = useColorScheme() === 'dark';
    const colors = vedicTheme.colors;

    return (
        <View style={styles.container}>
            <View style={[
                styles.switcherContainer,
                { backgroundColor: isDarkMode ? '#333' : '#FFF8F0' } // Soft Cream background
            ]}>
                <TouchableOpacity
                    style={[
                        styles.tab,
                        activeTab === 'looking' && styles.activeTab,
                        activeTab === 'looking' && { backgroundColor: isDarkMode ? '#444' : '#fff' }
                    ]}
                    onPress={() => onTabChange('looking')}
                >
                    <Text style={{ marginRight: 6 }}>🔍</Text>
                    <Text
                        style={[
                            styles.tabText,
                            { color: isDarkMode ? '#ddd' : colors.text },
                            activeTab === 'looking' && { color: colors.primary, fontWeight: 'bold' }
                        ]}
                    >
                        {t('ads.looking')}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        styles.tab,
                        activeTab === 'offering' && styles.activeTab,
                        activeTab === 'offering' && { backgroundColor: colors.primary }
                    ]}
                    onPress={() => onTabChange('offering')}
                >
                    <Text style={{ marginRight: 6 }}>🎁</Text>
                    <Text
                        style={[
                            styles.tabText,
                            { color: isDarkMode ? '#ddd' : colors.text },
                            activeTab === 'offering' && { color: '#fff', fontWeight: 'bold' }
                        ]}
                    >
                        {t('ads.offering')}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        styles.tab,
                        activeTab === 'my' && styles.activeTab,
                        activeTab === 'my' && { backgroundColor: isDarkMode ? '#444' : '#fff' }
                    ]}
                    onPress={() => onTabChange('my')}
                >
                    <Text style={{ marginRight: 6 }}>👤</Text>
                    <Text
                        style={[
                            styles.tabText,
                            { color: isDarkMode ? '#ddd' : colors.text },
                            activeTab === 'my' && { color: colors.primary, fontWeight: 'bold' }
                        ]}
                    >
                        {t('ads.my')}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        paddingBottom: 8,
    },
    switcherContainer: {
        flexDirection: 'row',
        borderRadius: 24,
        padding: 4,
        height: 48,
    },
    tab: {
        flexGrow: 1, // Changed from flex: 1
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 20,
        paddingHorizontal: 8, // Increased padding
        minWidth: 90, // Added minWidth
    },
    activeTab: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
    },
    tabText: {
        fontSize: 12, // Reduced from 13
        fontWeight: '500',
    },
});
