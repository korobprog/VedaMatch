import React, { useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    Platform,
    Image,
    ImageBackground,
} from 'react-native';
import { BlurView } from '@react-native-community/blur';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ChevronLeft, Plus, Trash2, Clock, Calendar as CalendarIcon, Film } from 'lucide-react-native';
import { RootStackParamList } from '../../types/navigation';
import { useSettings } from '../../context/SettingsContext';
import { usePortalLayout } from '../../context/PortalLayoutContext';
import { useUser } from '../../context/UserContext';
import { useRoleTheme } from '../../hooks/useRoleTheme';
import { usePressFeedback } from '../../hooks/usePressFeedback';
import { ClockWidget } from '../../components/portal/ClockWidget';
import { CalendarWidget } from '../../components/portal/CalendarWidget';
import { CirclesPanelWidget } from '../../components/portal/CirclesPanelWidget';
import { CirclesQuickWidget } from '../../components/portal/CirclesQuickWidget';

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
    const { user } = useUser();
    const { vTheme, isDarkMode, portalBackgroundType, portalBackground } = useSettings();
    const { colors: roleColors } = useRoleTheme(user?.role, isDarkMode);
    const triggerTapFeedback = usePressFeedback();
    const { layout, currentPage, addWidget, removeWidget } = usePortalLayout();
    const isPhotoBg = portalBackgroundType === 'image' && Boolean(portalBackground);

    useEffect(() => {
        if (!isPhotoBg || !portalBackground || !portalBackground.startsWith('http')) return;
        Image.prefetch(portalBackground).catch(() => { });
    }, [isPhotoBg, portalBackground]);

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

    const getWidgetName = (type: WidgetOption['type']) => {
        switch (type) {
            case 'clock':
                return 'Часы';
            case 'calendar':
                return 'Календарь';
            case 'circles_quick':
                return 'Кружки (быстрый)';
            default:
                return 'Панель кружков';
        }
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

    const content = (
        <View style={[styles.container, { backgroundColor: isPhotoBg ? 'transparent' : roleColors.background }]}>
            <StatusBar barStyle={isPhotoBg || isDarkMode ? 'light-content' : 'dark-content'} />

            <View
                style={[
                    styles.header,
                    {
                        borderBottomColor: isPhotoBg ? 'rgba(255,255,255,0.24)' : roleColors.border,
                        backgroundColor: isPhotoBg ? 'rgba(15,23,42,0.58)' : roleColors.surfaceElevated,
                    },
                ]}
            >
                {(isPhotoBg || isDarkMode) && (
                    <BlurView
                        style={StyleSheet.absoluteFill}
                        blurType={isDarkMode ? 'dark' : 'light'}
                        blurAmount={12}
                        reducedTransparencyFallbackColor={isPhotoBg ? 'rgba(15,23,42,0.72)' : roleColors.surfaceElevated}
                    />
                )}
                <TouchableOpacity
                    onPress={() => {
                        triggerTapFeedback();
                        navigation.goBack();
                    }}
                    style={[
                        styles.backButton,
                        {
                            backgroundColor: isPhotoBg ? 'rgba(255,255,255,0.18)' : roleColors.surface,
                            borderColor: isPhotoBg ? 'rgba(255,255,255,0.3)' : roleColors.border,
                        },
                    ]}
                    activeOpacity={0.86}
                >
                    <ChevronLeft size={24} color={isPhotoBg ? '#FFFFFF' : roleColors.textPrimary} />
                </TouchableOpacity>
                <View style={styles.titleWrap}>
                    <Text style={[styles.title, { color: isPhotoBg ? '#FFFFFF' : roleColors.textPrimary }]}>Виджеты</Text>
                    <Text style={[styles.subtitle, { color: isPhotoBg ? 'rgba(255,255,255,0.82)' : roleColors.textSecondary }]}>
                        Настройте быстрый доступ на портале
                    </Text>
                </View>
                <View style={{ width: 42 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={[styles.sectionBadge, { backgroundColor: isPhotoBg ? 'rgba(255,255,255,0.16)' : roleColors.accentSoft }]}>
                    <Text style={[styles.sectionBadgeText, { color: isPhotoBg ? '#FFFFFF' : roleColors.accent }]}>Доступные виджеты</Text>
                </View>

                {WIDGET_OPTIONS.map((option, index) => {
                    const activeCount = activeWidgets.filter(w => w.type === option.type && w.size === option.size).length;
                    const optionActive = activeCount > 0;

                    return (
                        <View
                            key={`${option.type}-${option.size}-${index}`}
                            style={[
                                styles.card,
                                {
                                    backgroundColor: isPhotoBg ? 'rgba(255,255,255,0.14)' : roleColors.surfaceElevated,
                                    borderColor: optionActive ? roleColors.accent : (isPhotoBg ? 'rgba(255,255,255,0.28)' : roleColors.border),
                                },
                            ]}
                        >
                            {(isPhotoBg || isDarkMode) && (
                                <BlurView
                                    style={[StyleSheet.absoluteFill, { borderRadius: 24 }]}
                                    blurType={isDarkMode ? 'dark' : 'light'}
                                    blurAmount={10}
                                    reducedTransparencyFallbackColor={isPhotoBg ? 'rgba(15,23,42,0.72)' : roleColors.surfaceElevated}
                                />
                            )}
                            <View style={styles.cardHeader}>
                                <View style={[styles.iconContainer, { backgroundColor: isPhotoBg ? 'rgba(255,255,255,0.2)' : roleColors.accentSoft, borderColor: isPhotoBg ? 'rgba(255,255,255,0.26)' : roleColors.border }]}>
                                    <option.icon size={20} color={isPhotoBg ? '#FFFFFF' : roleColors.accent} />
                                </View>
                                <View style={styles.cardInfo}>
                                    <View style={styles.titleRow}>
                                        <Text style={[styles.cardTitle, { color: isPhotoBg ? '#FFFFFF' : roleColors.textPrimary }]}>{option.title}</Text>
                                        <View style={[styles.sizePill, { backgroundColor: isPhotoBg ? 'rgba(255,255,255,0.16)' : roleColors.accentSoft }]}>
                                            <Text style={[styles.sizePillText, { color: isPhotoBg ? '#FFFFFF' : roleColors.accent }]}>{option.size}</Text>
                                        </View>
                                    </View>
                                    <Text style={[styles.cardDesc, { color: isPhotoBg ? 'rgba(255,255,255,0.82)' : roleColors.textSecondary }]}>
                                        {option.description}
                                    </Text>
                                </View>
                            </View>

                            <View style={[styles.previewContainer, { borderColor: isPhotoBg ? 'rgba(255,255,255,0.2)' : roleColors.border, backgroundColor: isPhotoBg ? 'rgba(255,255,255,0.08)' : roleColors.surface }]}>
                                <View pointerEvents="none" style={styles.previewInner}>
                                    {renderWidgetPreview(option)}
                                </View>
                            </View>

                            <View style={[styles.cardFooter, { borderTopColor: isPhotoBg ? 'rgba(255,255,255,0.2)' : roleColors.border }]}>
                                <Text style={[styles.statusText, { color: isPhotoBg ? 'rgba(255,255,255,0.84)' : roleColors.textSecondary }]}>
                                    {activeCount > 0 ? `Активно: ${activeCount}` : 'Не используется'}
                                </Text>
                                <TouchableOpacity
                                    style={[styles.addButton, { backgroundColor: roleColors.accent }]}
                                    onPress={() => {
                                        triggerTapFeedback();
                                        handleAddWidget(option);
                                    }}
                                    activeOpacity={0.88}
                                >
                                    <Plus size={19} color="#FFF" />
                                    <Text style={styles.addButtonText}>Добавить</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    );
                })}

                <Text style={[styles.sectionTitle, { color: isPhotoBg ? 'rgba(255,255,255,0.86)' : roleColors.textSecondary, marginTop: 18 }]}>
                    Удаление активных виджетов
                </Text>

                {activeWidgets.length > 0 ? (
                    <View style={styles.activeList}>
                        {activeWidgets.map((widget) => (
                            <View
                                key={widget.id}
                                style={[
                                    styles.activeItem,
                                    {
                                        backgroundColor: isPhotoBg ? 'rgba(255,255,255,0.14)' : roleColors.surfaceElevated,
                                        borderColor: isPhotoBg ? 'rgba(255,255,255,0.28)' : roleColors.border,
                                    },
                                ]}
                            >
                                {(isPhotoBg || isDarkMode) && (
                                    <BlurView
                                        style={[StyleSheet.absoluteFill, { borderRadius: 16 }]}
                                        blurType={isDarkMode ? 'dark' : 'light'}
                                        blurAmount={8}
                                        reducedTransparencyFallbackColor={isPhotoBg ? 'rgba(15,23,42,0.72)' : roleColors.surfaceElevated}
                                    />
                                )}
                                <View style={[styles.activeIcon, { backgroundColor: isPhotoBg ? 'rgba(255,255,255,0.18)' : roleColors.accentSoft, borderColor: isPhotoBg ? 'rgba(255,255,255,0.24)' : roleColors.border }]}>
                                    {widget.type === 'clock' ? (
                                        <Clock size={16} color={isPhotoBg ? '#FFFFFF' : roleColors.accent} />
                                    ) : widget.type === 'calendar' ? (
                                        <CalendarIcon size={16} color={isPhotoBg ? '#FFFFFF' : roleColors.accent} />
                                    ) : (
                                        <Film size={16} color={isPhotoBg ? '#FFFFFF' : roleColors.accent} />
                                    )}
                                </View>
                                <View style={styles.activeInfo}>
                                    <Text style={[styles.activeTitle, { color: isPhotoBg ? '#FFFFFF' : roleColors.textPrimary }]}>
                                        {getWidgetName(widget.type as WidgetOption['type'])}
                                    </Text>
                                    <Text style={[styles.activeMeta, { color: isPhotoBg ? 'rgba(255,255,255,0.8)' : roleColors.textSecondary }]}>
                                        Размер: {widget.size}
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    style={[styles.removeButton, { borderColor: isPhotoBg ? 'rgba(248,113,113,0.6)' : '#FCA5A5', backgroundColor: isPhotoBg ? 'rgba(248,113,113,0.16)' : '#FEE2E2' }]}
                                    onPress={() => {
                                        triggerTapFeedback();
                                        handleRemoveWidget(widget.id);
                                    }}
                                    activeOpacity={0.85}
                                >
                                    <Trash2 size={18} color="#EF4444" />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                ) : (
                    <View
                        style={[
                            styles.emptyState,
                            {
                                backgroundColor: isPhotoBg ? 'rgba(255,255,255,0.14)' : roleColors.surfaceElevated,
                                borderColor: isPhotoBg ? 'rgba(255,255,255,0.28)' : roleColors.border,
                            },
                        ]}
                    >
                        {(isPhotoBg || isDarkMode) && (
                            <BlurView
                                style={[StyleSheet.absoluteFill, { borderRadius: 16 }]}
                                blurType={isDarkMode ? 'dark' : 'light'}
                                blurAmount={8}
                                reducedTransparencyFallbackColor={isPhotoBg ? 'rgba(15,23,42,0.72)' : roleColors.surfaceElevated}
                            />
                        )}
                        <Text style={[styles.emptyTitle, { color: isPhotoBg ? '#FFFFFF' : roleColors.textPrimary }]}>
                            Пока нет активных виджетов
                        </Text>
                        <Text style={[styles.emptySub, { color: isPhotoBg ? 'rgba(255,255,255,0.82)' : roleColors.textSecondary }]}>
                            Добавьте нужные виджеты из списка выше
                        </Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );

    if (isPhotoBg && portalBackground) {
        return (
            <ImageBackground source={{ uri: portalBackground }} style={styles.container} resizeMode="cover" fadeDuration={0}>
                <View style={styles.photoOverlay}>{content}</View>
            </ImageBackground>
        );
    }

    return content;
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
        paddingBottom: 14,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        overflow: 'hidden',
    },
    photoOverlay: {
        flex: 1,
        backgroundColor: 'rgba(7,12,23,0.34)',
    },
    backButton: {
        width: 42,
        height: 42,
        borderRadius: 21,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    titleWrap: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        letterSpacing: -0.4,
    },
    subtitle: {
        marginTop: 2,
        fontSize: 13,
        fontWeight: '600',
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 120,
    },
    sectionBadge: {
        alignSelf: 'flex-start',
        minHeight: 30,
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 6,
        marginBottom: 14,
        justifyContent: 'center',
    },
    sectionBadgeText: {
        fontSize: 12,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
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
        overflow: 'hidden',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.16,
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
        borderWidth: 1,
    },
    cardInfo: {
        flex: 1,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        marginBottom: 4,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
        flex: 1,
    },
    cardDesc: {
        fontSize: 13,
        lineHeight: 19,
    },
    sizePill: {
        borderRadius: 999,
        paddingHorizontal: 9,
        paddingVertical: 4,
    },
    sizePillText: {
        fontSize: 11,
        fontWeight: '700',
    },
    previewContainer: {
        marginVertical: 12,
        padding: 10,
        minHeight: 210,
        borderRadius: 14,
        borderWidth: 1,
        justifyContent: 'center',
    },
    previewInner: {
        alignSelf: 'center',
        width: '100%',
        alignItems: 'center',
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
        fontWeight: '700',
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 18,
        paddingVertical: 11,
        borderRadius: 999,
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
        overflow: 'hidden',
    },
    activeIcon: {
        width: 34,
        height: 34,
        borderRadius: 10,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    activeInfo: {
        flex: 1,
    },
    activeTitle: {
        fontSize: 17,
        fontWeight: '700',
    },
    activeMeta: {
        marginTop: 2,
        fontSize: 12,
        fontWeight: '600',
    },
    removeButton: {
        width: 34,
        height: 34,
        borderRadius: 10,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyState: {
        marginTop: 8,
        borderRadius: 16,
        borderWidth: 1,
        paddingVertical: 20,
        paddingHorizontal: 16,
        overflow: 'hidden',
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '800',
        textAlign: 'center',
    },
    emptySub: {
        marginTop: 6,
        fontSize: 14,
        textAlign: 'center',
    },
});

export default WidgetSelectionScreen;
