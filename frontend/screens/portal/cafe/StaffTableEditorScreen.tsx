import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    PanResponder,
    Alert,
    ActivityIndicator,
    Modal,
    TextInput,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, PlusCircle, X, Trash2 } from 'lucide-react-native';
import { cafeService } from '../../../services/cafeService';
import { CafeTable } from '../../../types/cafe';
import { useUser } from '../../../context/UserContext';
import { useSettings } from '../../../context/SettingsContext';
import { useRoleTheme } from '../../../hooks/useRoleTheme';
import { SemanticColorTokens } from '../../../theme/semanticTokens';

const { width, height } = Dimensions.get('window');
const EDITOR_WIDTH = width - 32;
const EDITOR_HEIGHT = height * 0.6;
const TABLE_SIZE = 60;

type RouteParams = {
    StaffTableEditor: {
        cafeId: number;
        cafeName: string;
    };
};

interface TablePosition {
    id: number;
    number: string;
    name: string;
    x: number;
    y: number;
    seats: number;
    isOccupied: boolean;
}

const StaffTableEditorScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<RouteProp<RouteParams, 'StaffTableEditor'>>();
    const { t } = useTranslation();
    const { user } = useUser();
    const { isDarkMode } = useSettings();
    const { colors } = useRoleTheme(user?.role, isDarkMode);
    const { cafeId, cafeName } = route.params;
    const styles = React.useMemo(() => createStyles(colors), [colors]);

    const [tables, setTables] = useState<TablePosition[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selectedTable, setSelectedTable] = useState<TablePosition | null>(null);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    // Edit modal state
    const [editNumber, setEditNumber] = useState('');
    const [editName, setEditName] = useState('');
    const [editSeats, setEditSeats] = useState('');
    const isMountedRef = useRef(true);
    const latestLoadRequestRef = useRef(0);
    const dragStartRef = useRef<Record<number, { x: number; y: number }>>({});

    useEffect(() => {
        void loadTables();
        return () => {
            isMountedRef.current = false;
            latestLoadRequestRef.current += 1;
            dragStartRef.current = {};
        };
    }, [cafeId]);

    const loadTables = useCallback(async () => {
        const requestId = ++latestLoadRequestRef.current;
        try {
            if (isMountedRef.current) {
                setLoading(true);
            }
            const data = await cafeService.getTables(cafeId);
            if (requestId !== latestLoadRequestRef.current || !isMountedRef.current) {
                return;
            }

            // Convert to editor format with normalized positions
            const tablePositions: TablePosition[] = data.map((table: CafeTable) => ({
                id: table.id,
                number: table.number,
                name: table.name,
                x: (table.posX / 100) * EDITOR_WIDTH,
                y: (table.posY / 100) * EDITOR_HEIGHT,
                seats: table.seats,
                isOccupied: table.isOccupied,
            }));

            setTables(tablePositions);
        } catch (error) {
            if (requestId !== latestLoadRequestRef.current || !isMountedRef.current) {
                return;
            }
            console.error('Error loading tables:', error);
            Alert.alert(t('common.error'), t('cafe.staff.tables.loadError'));
        } finally {
            if (requestId === latestLoadRequestRef.current && isMountedRef.current) {
                setLoading(false);
            }
        }
    }, [cafeId, t]);

    const handleTableDrag = (tableId: number, dx: number, dy: number) => {
        const start = dragStartRef.current[tableId];
        if (!start) {
            return;
        }
        setTables(prev => prev.map(table => {
            if (table.id === tableId) {
                const newX = Math.max(0, Math.min(EDITOR_WIDTH - TABLE_SIZE, start.x + dx));
                const newY = Math.max(0, Math.min(EDITOR_HEIGHT - TABLE_SIZE, start.y + dy));
                return { ...table, x: newX, y: newY };
            }
            return table;
        }));
        setHasChanges(true);
    };

    const handleTablePress = (table: TablePosition) => {
        setSelectedTable(table);
        setEditNumber(table.number);
        setEditName(table.name);
        setEditSeats(table.seats.toString());
        setEditModalVisible(true);
    };

    const handleTableUpdate = async () => {
        if (!selectedTable) return;

        try {
            setSaving(true);
            const updatedTable = await cafeService.updateTable(cafeId, selectedTable.id, {
                number: editNumber,
                name: editName,
                seats: parseInt(editSeats) || 2,
            });

            setTables(prev => prev.map(table => {
                if (table.id === selectedTable.id) {
                    return {
                        ...table,
                        number: updatedTable.number,
                        name: updatedTable.name,
                        seats: updatedTable.seats,
                    };
                }
                return table;
            }));

            setEditModalVisible(false);
            setSelectedTable(null);
        } catch (error) {
            console.error('Error updating table:', error);
            Alert.alert(t('common.error'), t('cafe.staff.tables.saveError'));
        } finally {
            setSaving(false);
        }
    };

    const handleAddTable = async () => {
        try {
            setSaving(true);
            const nextNumber = (tables.length + 1).toString();

            const tableData = {
                number: nextNumber,
                name: t('cafe.detail.tableInfo', { tableNumber: nextNumber }),
                posX: 50,
                posY: 50,
                seats: 2,
                isActive: true,
            };

            const createdTable = await cafeService.createTable(cafeId, tableData);

            const newTable: TablePosition = {
                id: createdTable.id,
                number: createdTable.number,
                name: createdTable.name,
                x: (50 / 100) * EDITOR_WIDTH,
                y: (50 / 100) * EDITOR_HEIGHT,
                seats: createdTable.seats,
                isOccupied: false,
            };

            setTables(prev => [...prev, newTable]);
        } catch (error) {
            console.error('Error adding table:', error);
            Alert.alert(t('common.error'), t('cafe.staff.tables.saveError'));
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteTable = () => {
        if (!selectedTable) return;

        Alert.alert(
            t('cafe.staff.tables.deleteConfirmTitle'),
            t('cafe.staff.tables.deleteConfirmDesc', { number: selectedTable.number }),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('common.delete'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setSaving(true);
                            await cafeService.deleteTable(cafeId, selectedTable.id);
                            setTables(prev => prev.filter(t => t.id !== selectedTable.id));
                            setEditModalVisible(false);
                            setSelectedTable(null);
                        } catch (error) {
                            console.error('Error deleting table:', error);
                            Alert.alert(t('common.error'), t('cafe.staff.tables.saveError'));
                        } finally {
                            setSaving(false);
                        }
                    },
                },
            ]
        );
    };

    const handleSave = async () => {
        try {
            setSaving(true);

            // Convert positions back to percentages
            const layoutData = tables.map(table => ({
                id: table.id,
                posX: Math.round((table.x / EDITOR_WIDTH) * 100),
                posY: Math.round((table.y / EDITOR_HEIGHT) * 100),
            }));

            await cafeService.updateFloorLayout(cafeId, layoutData);

            Alert.alert(t('common.success'), t('cafe.staff.tables.saveSuccess'));
            setHasChanges(false);
        } catch (error) {
            console.error('Error saving floor layout:', error);
            Alert.alert(t('common.error'), t('cafe.staff.tables.saveError'));
        } finally {
            setSaving(false);
        }
    };

    const renderTable = (table: TablePosition) => {
        const panResponder = PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: () => {
                dragStartRef.current[table.id] = { x: table.x, y: table.y };
            },
            onPanResponderMove: (_, gestureState) => {
                handleTableDrag(table.id, gestureState.dx, gestureState.dy);
            },
            onPanResponderRelease: () => {
                delete dragStartRef.current[table.id];
            },
            onPanResponderTerminate: () => {
                delete dragStartRef.current[table.id];
            },
        });

        return (
            <View
                key={table.id}
                {...panResponder.panHandlers}
                style={[
                    styles.table,
                    {
                        left: table.x,
                        top: table.y,
                    },
                    table.isOccupied && styles.tableOccupied,
                ]}
            >
                <TouchableOpacity
                    style={styles.tableInner}
                    onLongPress={() => handleTablePress(table)}
                    delayLongPress={500}
                >
                    <Text style={styles.tableNumber}>{table.number}</Text>
                    <Text style={styles.tableSeats}>{t('cafe.staff.tables.seatsCount', { count: table.seats })}</Text>
                </TouchableOpacity>
            </View>
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.accent} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <ArrowLeft size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>{t('cafe.staff.tables.title')}</Text>
                    <Text style={styles.headerSubtitle}>{t('cafe.staff.tables.count', { count: tables.length })}</Text>
                </View>
                <TouchableOpacity onPress={handleAddTable}>
                    <PlusCircle size={28} color={colors.accent} />
                </TouchableOpacity>
            </View>

            {/* Instructions */}
            <View style={styles.instructions}>
                <Text style={styles.instructionText}>
                    {t('cafe.staff.tables.instruction')}
                </Text>
            </View>

            {/* Editor area */}
            <View style={styles.editorContainer}>
                <View style={styles.editor}>
                    {/* Grid background */}
                    <View style={styles.grid}>
                        {Array.from({ length: 10 }).map((_, row) => (
                            <View key={row} style={styles.gridRow}>
                                {Array.from({ length: 10 }).map((_, col) => (
                                    <View key={col} style={styles.gridCell} />
                                ))}
                            </View>
                        ))}
                    </View>

                    {/* Tables */}
                    {tables.map(renderTable)}
                </View>
            </View>

            {/* Bottom actions */}
            {hasChanges && (
                <View style={styles.saveBar}>
                    <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={loadTables}
                    >
                        <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                        onPress={handleSave}
                        disabled={saving}
                    >
                        {saving ? (
                            <ActivityIndicator color={colors.textPrimary} size="small" />
                        ) : (
                            <Text style={styles.saveButtonText}>{t('cafe.staff.tables.save')}</Text>
                        )}
                    </TouchableOpacity>
                </View>
            )}

            {/* Edit modal */}
            <Modal
                visible={editModalVisible}
                animationType="slide"
                transparent
                onRequestClose={() => setEditModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{t('cafe.staff.tables.editTitle')}</Text>
                            <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                                <X size={24} color={colors.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalBody}>
                            <Text style={styles.inputLabel}>{t('cafe.staff.tables.number')}</Text>
                            <TextInput
                                style={styles.input}
                                value={editNumber}
                                onChangeText={setEditNumber}
                                keyboardType="numeric"
                                placeholderTextColor={colors.textSecondary}
                            />

                            <Text style={styles.inputLabel}>{t('cafe.staff.tables.name')}</Text>
                            <TextInput
                                style={styles.input}
                                value={editName}
                                onChangeText={setEditName}
                                placeholder={t('cafe.staff.tables.namePlaceholder')}
                                placeholderTextColor={colors.textSecondary}
                            />

                            <Text style={styles.inputLabel}>{t('cafe.staff.tables.seats')}</Text>
                            <TextInput
                                style={styles.input}
                                value={editSeats}
                                onChangeText={setEditSeats}
                                keyboardType="numeric"
                                placeholderTextColor={colors.textSecondary}
                            />
                        </View>

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.deleteButton}
                                onPress={handleDeleteTable}
                            >
                                <Trash2 size={20} color={colors.danger} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.updateButton}
                                onPress={handleTableUpdate}
                            >
                                <Text style={styles.updateButtonText}>{t('common.save')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const createStyles = (colors: SemanticColorTokens) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        paddingTop: 48,
        backgroundColor: colors.surfaceElevated,
    },
    headerCenter: {
        alignItems: 'center',
    },
    headerTitle: {
        color: colors.textPrimary,
        fontSize: 18,
        fontWeight: '600',
    },
    headerSubtitle: {
        color: colors.textSecondary,
        fontSize: 12,
    },
    instructions: {
        padding: 12,
        backgroundColor: colors.accentSoft,
    },
    instructionText: {
        color: colors.accent,
        fontSize: 12,
        textAlign: 'center',
    },
    editorContainer: {
        flex: 1,
        padding: 16,
    },
    editor: {
        flex: 1,
        backgroundColor: colors.surfaceElevated,
        borderRadius: 12,
        overflow: 'hidden',
        position: 'relative',
    },
    grid: {
        ...StyleSheet.absoluteFillObject,
        opacity: 0.3,
    },
    gridRow: {
        flex: 1,
        flexDirection: 'row',
    },
    gridCell: {
        flex: 1,
        borderWidth: 0.5,
        borderColor: colors.border,
    },
    table: {
        position: 'absolute',
        width: TABLE_SIZE,
        height: TABLE_SIZE,
        borderRadius: 8,
        backgroundColor: colors.accent,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tableOccupied: {
        backgroundColor: colors.success,
    },
    tableInner: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tableNumber: {
        color: colors.textPrimary,
        fontSize: 18,
        fontWeight: 'bold',
    },
    tableSeats: {
        color: colors.textSecondary,
        fontSize: 10,
    },
    saveBar: {
        flexDirection: 'row',
        padding: 16,
        paddingBottom: 32,
        backgroundColor: colors.surfaceElevated,
        gap: 12,
    },
    cancelButton: {
        flex: 1,
        backgroundColor: colors.surface,
        padding: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    cancelButtonText: {
        color: colors.textPrimary,
        fontSize: 15,
    },
    saveButton: {
        flex: 2,
        backgroundColor: colors.accent,
        padding: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    saveButtonDisabled: {
        opacity: 0.7,
    },
    saveButtonText: {
        color: colors.textPrimary,
        fontSize: 15,
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: colors.overlay,
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: colors.surfaceElevated,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 40,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    modalTitle: {
        color: colors.textPrimary,
        fontSize: 18,
        fontWeight: '600',
    },
    modalBody: {
        padding: 16,
    },
    inputLabel: {
        color: colors.textSecondary,
        fontSize: 13,
        marginBottom: 6,
        marginTop: 12,
    },
    input: {
        backgroundColor: colors.surface,
        borderRadius: 10,
        padding: 14,
        color: colors.textPrimary,
        fontSize: 16,
    },
    modalActions: {
        flexDirection: 'row',
        padding: 16,
        gap: 12,
    },
    deleteButton: {
        width: 48,
        height: 48,
        backgroundColor: colors.accentSoft,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    updateButton: {
        flex: 1,
        backgroundColor: colors.accent,
        padding: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    updateButtonText: {
        color: colors.textPrimary,
        fontSize: 16,
        fontWeight: '600',
    },
});

export default StaffTableEditorScreen;
