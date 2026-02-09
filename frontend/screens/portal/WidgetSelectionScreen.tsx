import React, { useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Dimensions,
    StatusBar,
    Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ChevronLeft, Plus, Trash2, Clock, Calendar as CalendarIcon, Film } from 'lucide-react-native';
import { RootStackParamList } from '../../types/navigation';
import { useSettings } from '../../context/SettingsContext';
import { usePortalLayout } from '../../context/PortalLayoutContext';
import { ClockWidget } from '../../components/portal/ClockWidget';
import { CalendarWidget } from '../../components/portal/CalendarWidget';
import { CirclesPanelWidget } from '../../components/portal/CirclesPanelWidget';
import { CirclesQuickWidget } from '../../components/portal/CirclesQuickWidget';

const { width } = Dimensions.get('window');

type Props = NativeStackScreenProps<RootStackParamList, 'WidgetSelection'>;

interface WidgetOption {
    type: 'clock' | 'calendar' | 'circles_quick' | 'circles_panel';
    size: '1x1' | '2x1' | '2x2';
    title: string;
    description: string;
    icon: any;
}

const WIDGET_OPTIONS: WidgetOption[] = [
    {
        type: 'clock',
        size: '2x1',
        title: 'Большие часы',
        description: 'Отображает время и дату в широком формате',
        icon: Clock,
    },
    {
        type: 'clock',
        size: '1x1',
        title: 'Компактные часы',
        description: 'Минималистичные часы 1x1',
        icon: Clock,
    },
    {
        type: 'calendar',
        size: '2x2',
        title: 'Календарь',
        description: 'Полный обзор месяца с подсветкой текущей даты',
        icon: CalendarIcon,
    },
    {
        type: 'circles_quick',
        size: '1x1',
        title: 'Кружки (быстрый)',
        description: 'Открытие ленты, удержание для быстрого создания',
        icon: Film,
    },
    {
        type: 'circles_panel',
        size: '2x2',
        title: 'Панель кружков',
        description: 'Создать, кружки друзей, лента и мини-превью',
        icon: Film,
    },
];

const WidgetSelectionScreen: React.FC<Props> = ({ navigation }) => {
    const { vTheme, isDarkMode } = useSettings();
    const { layout, currentPage, addWidget, removeWidget } = usePortalLayout();

    const activeWidgets = useMemo(() => {
        return layout.pages[currentPage]?.widgets || [];
    }, [layout, currentPage]);

    const handleAddWidget = (option: WidgetOption) => {
        addWidget({
            type: option.type,
            size: option.size,
        });
    };

    const handleRemoveWidget = (id: string) => {
        removeWidget(id);
    };

    const isWidgetActive = (type: string, size: string) => {
        return activeWidgets.some(w => w.type === type && w.size === size);
    };

    const renderWidgetPreview = (option: WidgetOption) => {
        switch (option.type) {
            case 'clock':
                return <ClockWidget size={option.size} />;
            case 'calendar':
                return <CalendarWidget size={option.size as any} />;
            case 'circles_quick':
                return <CirclesQuickWidget />;
            case 'circles_panel':
                return <CirclesPanelWidget />;
            default:
                return null;
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: vTheme.colors.background }]}>
            <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

            {/* Header */}
            <View style={[styles.header, { borderBottomColor: vTheme.colors.divider }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ChevronLeft size={28} color={vTheme.colors.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: vTheme.colors.text }]}>Виджеты</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={[styles.sectionTitle, { color: vTheme.colors.textSecondary }]}>
                    Доступные виджеты
                </Text>

                {WIDGET_OPTIONS.map((option, index) => {
                    const activeCount = activeWidgets.filter(w => w.type === option.type && w.size === option.size).length;

                    return (
                        <View
                            key={`${option.type}-${option.size}-${index}`}
                            style={[
                                styles.card,
                                {
                                    backgroundColor: vTheme.colors.backgroundSecondary,
                                    borderColor: vTheme.colors.divider
                                }
                            ]}
                        >
                            <View style={styles.cardHeader}>
                                <View style={[styles.iconContainer, { backgroundColor: `${vTheme.colors.primary}15` }]}>
                                    <option.icon size={22} color={vTheme.colors.primary} />
                                </View>
                                <View style={styles.cardInfo}>
                                    <Text style={[styles.cardTitle, { color: vTheme.colors.text }]}>{option.title}</Text>
                                    <Text style={[styles.cardDesc, { color: vTheme.colors.textSecondary }]}>{option.description}</Text>
                                </View>
                            </View>

                            <View style={styles.previewContainer}>
                                {renderWidgetPreview(option)}
                            </View>

                            <View style={styles.cardFooter}>
                                <Text style={[styles.statusText, { color: vTheme.colors.textSecondary }]}>
                                    {activeCount > 0 ? `Активно: ${activeCount}` : 'Не используется'}
                                </Text>
                                <TouchableOpacity
                                    style={[styles.addButton, { backgroundColor: vTheme.colors.primary }]}
                                    onPress={() => handleAddWidget(option)}
                                >
                                    <Plus size={20} color="#FFF" />
                                    <Text style={styles.addButtonText}>Добавить</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    );
                })}

                {activeWidgets.length > 0 && (
                    <>
                        <Text style={[styles.sectionTitle, { color: vTheme.colors.textSecondary, marginTop: 32 }]}>
                            Удаление активных виджетов
                        </Text>
                        <View style={styles.activeList}>
                            {activeWidgets.map((widget) => (
                                <View
                                    key={widget.id}
                                    style={[
                                        styles.activeItem,
                                        {
                                            backgroundColor: vTheme.colors.backgroundSecondary,
                                            borderColor: vTheme.colors.divider
                                        }
                                    ]}
                                >
                                    <View style={styles.activeInfo}>
                                        <Text style={[styles.activeTitle, { color: vTheme.colors.text }]}>
                                            {widget.type === 'clock'
                                                ? 'Часы'
                                                : widget.type === 'calendar'
                                                    ? 'Календарь'
                                                    : widget.type === 'circles_quick'
                                                        ? 'Кружки (быстрый)'
                                                        : 'Панель кружков'} ({widget.size})
                                        </Text>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.removeButton}
                                        onPress={() => handleRemoveWidget(widget.id)}
                                    >
                                        <Trash2 size={20} color="#FF4444" />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>
                    </>
                )}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: Platform.OS === 'ios' ? 50 : 20,
        paddingBottom: 16,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
    },
    backButton: {
        padding: 4,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 100,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 16,
    },
    card: {
        borderRadius: 24,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
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
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    cardInfo: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 4,
    },
    cardDesc: {
        fontSize: 13,
        opacity: 0.8,
    },
    previewContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 10,
        padding: 10,
    },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
    },
    addButtonText: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 14,
        marginLeft: 8,
    },
    activeList: {
        marginTop: 8,
    },
    activeItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
    },
    activeInfo: {
        flex: 1,
    },
    activeTitle: {
        fontSize: 16,
        fontWeight: '600',
    },
    removeButton: {
        padding: 8,
    },
});

export default WidgetSelectionScreen;
