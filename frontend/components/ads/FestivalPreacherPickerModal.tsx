import React, { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Check, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Channel } from '../../types/channel';
import { useSettings } from '../../context/SettingsContext';

interface FestivalPreacherPickerModalProps {
    visible: boolean;
    channels: Channel[];
    selectedIds: number[];
    onClose: () => void;
    onApply: (ids: number[]) => void;
}

export const FestivalPreacherPickerModal: React.FC<FestivalPreacherPickerModalProps> = ({
    visible,
    channels,
    selectedIds,
    onClose,
    onApply,
}) => {
    const { t } = useTranslation();
    const { vTheme } = useSettings();
    const colors = vTheme.colors;
    const [draft, setDraft] = useState<number[]>(selectedIds);

    useEffect(() => {
        setDraft(selectedIds);
    }, [selectedIds, visible]);

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={[styles.sheet, { backgroundColor: colors.background }]}>
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: colors.text }]}>{t('ads.festivals.preacherPickerTitle')}</Text>
                        <TouchableOpacity onPress={onClose}>
                            <X size={18} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={styles.list}>
                        {channels.map((channel) => {
                            const id = channel.ID;
                            const selected = draft.includes(id);
                            return (
                                <TouchableOpacity
                                    key={id}
                                    style={[styles.row, { borderColor: colors.border || '#ddd' }]}
                                    onPress={() => {
                                        setDraft((prev) => {
                                            if (prev.includes(id)) {
                                                return prev.filter((item) => item !== id);
                                            }
                                            if (prev.length >= 20) {
                                                return prev;
                                            }
                                            return [...prev, id];
                                        });
                                    }}
                                >
                                    <Text style={[styles.rowLabel, { color: colors.text }]} numberOfLines={1}>
                                        {channel.title}
                                    </Text>
                                    <View style={[styles.checkbox, selected && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
                                        {selected ? <Check size={14} color="#fff" /> : null}
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    <TouchableOpacity
                        style={[styles.applyButton, { backgroundColor: colors.primary }]}
                        onPress={() => onApply(draft)}
                    >
                        <Text style={styles.applyButtonText}>{t('common.save')}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.35)',
        justifyContent: 'flex-end',
    },
    sheet: {
        maxHeight: '75%',
        borderTopLeftRadius: 18,
        borderTopRightRadius: 18,
        padding: 16,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    title: {
        fontSize: 17,
        fontWeight: '700',
    },
    list: {
        gap: 8,
        paddingBottom: 12,
    },
    row: {
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
    },
    rowLabel: {
        flex: 1,
        fontSize: 14,
        fontWeight: '600',
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 1,
        borderColor: '#bbb',
        alignItems: 'center',
        justifyContent: 'center',
    },
    applyButton: {
        marginTop: 8,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
    },
    applyButtonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
    },
});
