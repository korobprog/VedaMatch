import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../../context/SettingsContext';

export type FestivalViewMode = 'feed' | 'calendar';

interface FestivalViewSwitchProps {
    mode: FestivalViewMode;
    onChange: (mode: FestivalViewMode) => void;
}

export const FestivalViewSwitch: React.FC<FestivalViewSwitchProps> = ({ mode, onChange }) => {
    const { t } = useTranslation();
    const { vTheme } = useSettings();
    const colors = vTheme.colors;

    return (
        <View style={[styles.container, { backgroundColor: colors.surface || '#F5EFE4' }]}>
            <TouchableOpacity
                style={[
                    styles.button,
                    mode === 'feed' && { backgroundColor: colors.primary },
                ]}
                onPress={() => onChange('feed')}
            >
                <Text style={[styles.buttonText, { color: mode === 'feed' ? '#fff' : colors.text }]}>
                    {t('ads.festivals.feedTab')}
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[
                    styles.button,
                    mode === 'calendar' && { backgroundColor: colors.primary },
                ]}
                onPress={() => onChange('calendar')}
            >
                <Text style={[styles.buttonText, { color: mode === 'calendar' ? '#fff' : colors.text }]}>
                    {t('ads.festivals.calendarTab')}
                </Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        marginHorizontal: 16,
        marginTop: 6,
        marginBottom: 6,
        borderRadius: 18,
        padding: 4,
    },
    button: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 14,
        alignItems: 'center',
    },
    buttonText: {
        fontSize: 14,
        fontWeight: '700',
    },
});
