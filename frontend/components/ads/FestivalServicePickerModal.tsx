import React, { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Check, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Service } from '../../services/serviceService';
import { useSettings } from '../../context/SettingsContext';

interface FestivalServicePickerModalProps {
    visible: boolean;
    services: Service[];
    selectedIds: number[];
    onClose: () => void;
    onApply: (ids: number[]) => void;
}

export const FestivalServicePickerModal: React.FC<FestivalServicePickerModalProps> = ({
    visible,
    services,
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
                        <Text style={[styles.title, { color: colors.text }]}>{t('ads.festivals.servicePickerTitle')}</Text>
                        <TouchableOpacity onPress={onClose}>
                            <X size={18} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={styles.list}>
                        {services.map((service) => {
                            const id = service.id;
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
                                    <View style={styles.rowBody}>
                                        <Text style={[styles.rowLabel, { color: colors.text }]} numberOfLines={1}>
                                            {service.title}
                                        </Text>
                                        <Text style={[styles.rowSub, { color: colors.textSecondary }]} numberOfLines={1}>
                                            #{service.id}
                                        </Text>
                                    </View>
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
    rowBody: {
        flex: 1,
    },
    rowLabel: {
        fontSize: 14,
        fontWeight: '600',
    },
    rowSub: {
        marginTop: 2,
        fontSize: 11,
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
