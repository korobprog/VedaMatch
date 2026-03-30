import React, { useMemo } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { AndroidReleaseConfig } from '../services/androidReleaseService';

type Props = {
    visible: boolean;
    release: AndroidReleaseConfig | null;
    onDismiss: () => void;
    onDownload: () => void;
};

const splitReleaseNotes = (value: string): string[] =>
    value
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean)
        .slice(0, 3);

export const AndroidUpdatePrompt: React.FC<Props> = ({ visible, release, onDismiss, onDownload }) => {
    const releaseNotes = useMemo(() => splitReleaseNotes(release?.releaseNotes || ''), [release?.releaseNotes]);
    if (!release) {
        return null;
    }

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
            <View style={styles.backdrop}>
                <View style={styles.card}>
                    <Text style={styles.eyebrow}>Android update</Text>
                    <Text style={styles.title}>Доступна новая версия</Text>
                    <Text style={styles.version}>
                        {release.appVersion || `versionCode ${release.versionCode}`}
                    </Text>
                    <Text style={styles.body}>
                        Установите свежий APK, чтобы получить последние исправления и улучшения.
                    </Text>

                    {releaseNotes.length > 0 && (
                        <View style={styles.notes}>
                            {releaseNotes.map(note => (
                                <View key={note} style={styles.noteRow}>
                                    <View style={styles.noteDot} />
                                    <Text style={styles.noteText}>{note}</Text>
                                </View>
                            ))}
                        </View>
                    )}

                    <View style={styles.actions}>
                        <Pressable onPress={onDismiss} style={[styles.button, styles.secondaryButton]}>
                            <Text style={styles.secondaryButtonText}>Позже</Text>
                        </Pressable>
                        <Pressable onPress={onDownload} style={[styles.button, styles.primaryButton]}>
                            <Text style={styles.primaryButtonText}>Скачать APK</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(3, 7, 18, 0.7)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    card: {
        width: '100%',
        maxWidth: 360,
        backgroundColor: '#111827',
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    eyebrow: {
        color: '#67e8f9',
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1.2,
    },
    title: {
        marginTop: 10,
        color: '#f8fafc',
        fontSize: 22,
        fontWeight: '700',
    },
    version: {
        marginTop: 8,
        color: '#a7f3d0',
        fontSize: 14,
        fontWeight: '600',
    },
    body: {
        marginTop: 12,
        color: '#cbd5e1',
        fontSize: 14,
        lineHeight: 20,
    },
    notes: {
        marginTop: 16,
        gap: 10,
    },
    noteRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    noteDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#34d399',
        marginTop: 7,
        marginRight: 10,
    },
    noteText: {
        flex: 1,
        color: '#e2e8f0',
        fontSize: 13,
        lineHeight: 18,
    },
    actions: {
        marginTop: 22,
        flexDirection: 'row',
        gap: 10,
    },
    button: {
        flex: 1,
        borderRadius: 16,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    secondaryButton: {
        backgroundColor: 'rgba(255,255,255,0.08)',
    },
    primaryButton: {
        backgroundColor: '#22c55e',
    },
    secondaryButtonText: {
        color: '#e5e7eb',
        fontSize: 14,
        fontWeight: '600',
    },
    primaryButtonText: {
        color: '#052e16',
        fontSize: 14,
        fontWeight: '700',
    },
});
