import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../../context/SettingsContext';

export type AdsSectionMode = 'ads' | 'festivals';

interface FestivalSectionSwitchProps {
    mode: AdsSectionMode;
    onChange: (mode: AdsSectionMode) => void;
}

export const FestivalSectionSwitch: React.FC<FestivalSectionSwitchProps> = ({ mode, onChange }) => {
    const { t } = useTranslation();
    const { vTheme } = useSettings();
    const colors = vTheme.colors;

    return (
        <View style={[styles.container, { backgroundColor: colors.surface || '#F5EFE4' }]}>
            <TouchableOpacity
                style={[
                    styles.button,
                    mode === 'ads' && { backgroundColor: colors.primary },
                ]}
                onPress={() => onChange('ads')}
            >
                <Text style={[styles.buttonText, { color: mode === 'ads' ? '#fff' : colors.text }]}>
                    {t('ads.sections.ads')}
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[
                    styles.button,
                    mode === 'festivals' && { backgroundColor: colors.primary },
                ]}
                onPress={() => onChange('festivals')}
            >
                <Text style={[styles.buttonText, { color: mode === 'festivals' ? '#fff' : colors.text }]}>
                    {t('ads.sections.festivals')}
                </Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        marginHorizontal: 16,
        marginTop: 8,
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
