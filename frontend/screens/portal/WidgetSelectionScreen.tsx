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
import { ArrowDown, ArrowUp, Calendar as CalendarIcon, ChevronLeft, Clock, Film, Plus, Trash2 } from 'lucide-react-native';
import { RootStackParamList } from '../../types/navigation';
import { PortalWidget } from '../../types/portal';
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
type WidgetType = 'clock' | 'calendar' | 'circles_quick' | 'circles_panel';

interface WidgetOption {
    type: WidgetType;
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
        description: 'Создание + кружки друзей + мини-превью',
        icon: Film,
    },
];

const getWidgetName = (type: WidgetType): string => {
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

const WidgetSelectionScreen: React.FC<Props> = ({ navigation, route }) => {
    const { user } = useUser();
    const { isDarkMode, portalBackgroundType, portalBackground } = useSettings();
    const { colors: roleColors } = useRoleTheme(user?.role, isDarkMode);
    const triggerTapFeedback = usePressFeedback();
    const { layout, currentPage, addWidget, removeWidget, reorderWidgets } = usePortalLayout();
    const isPhotoBg = portalBackgroundType === 'image' && Boolean(portalBackground);
    const openSource = route.params?.source || 'unknown';

    useEffect(() => {
        if (!isPhotoBg || !portalBackground || !portalBackground.startsWith('http')) return;
        Image.prefetch(portalBackground).catch(() => { });
    }, [isPhotoBg, portalBackground]);

    const activeWidgets = useMemo(() => {
        return layout.pages[currentPage]?.widgets || [];
    }, [layout, currentPage]);

    const handleAddWidget = (option: WidgetOption) => {
        triggerTapFeedback();
        addWidget({
            type: option.type,
            size: option.size,
        });
    };

    const handleRemoveWidget = (id: string) => {
        triggerTapFeedback();
        removeWidget(id);
    };

    const handleMoveWidget = (fromIndex: number, direction: -1 | 1) => {
        const toIndex = fromIndex + direction;
        if (toIndex < 0 || toIndex >= activeWidgets.length) return;
        triggerTapFeedback();
        reorderWidgets(fromIndex, toIndex);
    };

    const handleBackToPortal = () => {
        console.log(`[portal_widgets_back] source=${openSource}`);
        triggerTapFeedback();
        navigation.navigate('Portal', { resetToGridAt: Date.now() });
    };

    const renderLiveWidget = (widget: PortalWidget) => {
        switch (widget.type) {
            case 'clock':
                return <ClockWidget size={widget.size as any} />;
            case 'calendar':
                return <CalendarWidget size={widget.size as any} />;
            case 'circles_quick':
                return <CirclesQuickWidget />;
            case 'circles_panel':
                return <CirclesPanelWidget isVisible />;
            default:
                return null;
        }
    };

    const renderOptionPreview = (option: WidgetOption) => {
        if (option.type === 'circles_quick' || option.type === 'circles_panel') {
            return (
                <View style={[styles.mockCirclesCard, { borderColor: isPhotoBg ? 'rgba(255,255,255,0.2)' : roleColors.border }]}>
                    <View style={styles.mockCirclesHeader}>
                        <Film size={14} color={isPhotoBg ? '#FFFFFF' : roleColors.accent} />
                        <Text style={[styles.mockCirclesTitle, { color: isPhotoBg ? '#FFFFFF' : roleColors.textPrimary }]}>Кружки</Text>
                    </View>
                    <View style={styles.mockCirclesRow}>
                        {[0, 1, 2, 3].map((idx) => (
                            <View
                                key={`mock-circle-${idx}`}
                                style={[
                                    styles.mockCircle,
                                    { backgroundColor: isPhotoBg ? 'rgba(255,255,255,0.24)' : roleColors.accentSoft },
                                ]}
                            />
                        ))}
                    </View>
                    <Text style={[styles.mockCirclesCaption, { color: isPhotoBg ? 'rgba(255,255,255,0.8)' : roleColors.textSecondary }]}>
                        Статичный preview без сети
                    </Text>
                </View>
            );
        }

        if (option.type === 'clock') {
            return <ClockWidget size={option.size} />;
        }

        return <CalendarWidget size={option.size as any} />;
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
                    onPress={handleBackToPortal}
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
                        Управляйте виджетами отдельно от портала
                    </Text>
                </View>
                <TouchableOpacity
                    onPress={handleBackToPortal}
                    style={[
                        styles.portalButton,
                        {
                            backgroundColor: isPhotoBg ? 'rgba(255,255,255,0.18)' : roleColors.surface,
                            borderColor: isPhotoBg ? 'rgba(255,255,255,0.3)' : roleColors.border,
                        },
                    ]}
                    activeOpacity={0.86}
                >
                    <Text style={[styles.portalButtonText, { color: isPhotoBg ? '#FFFFFF' : roleColors.textPrimary }]}>Портал</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={[styles.sectionBadge, { backgroundColor: isPhotoBg ? 'rgba(255,255,255,0.16)' : roleColors.accentSoft }]}>
                    <Text style={[styles.sectionBadgeText, { color: isPhotoBg ? '#FFFFFF' : roleColors.accent }]}>Мои виджеты</Text>
                </View>

                {activeWidgets.length > 0 ? (
                    <View style={styles.liveWidgetsList}>
                        {activeWidgets.map((widget, index) => (
                            <View
                                key={widget.id}
                                style={[
                                    styles.liveWidgetCard,
                                    {
                                        backgroundColor: isPhotoBg ? 'rgba(255,255,255,0.14)' : roleColors.surfaceElevated,
                                        borderColor: isPhotoBg ? 'rgba(255,255,255,0.28)' : roleColors.border,
                                    },
                                ]}
                            >
                                {(isPhotoBg || isDarkMode) && (
                                    <BlurView
                                        style={[StyleSheet.absoluteFill, { borderRadius: 18 }]}
                                        blurType={isDarkMode ? 'dark' : 'light'}
                                        blurAmount={8}
                                        reducedTransparencyFallbackColor={isPhotoBg ? 'rgba(15,23,42,0.72)' : roleColors.surfaceElevated}
                                    />
                                )}
                                <View style={styles.liveWidgetHeader}>
                                    <Text style={[styles.liveWidgetTitle, { color: isPhotoBg ? '#FFFFFF' : roleColors.textPrimary }]}>
                                        {index + 1}. {getWidgetName(widget.type as WidgetType)}
                                    </Text>
                                    <View style={[styles.sizePill, { backgroundColor: isPhotoBg ? 'rgba(255,255,255,0.16)' : roleColors.accentSoft }]}>
                                        <Text style={[styles.sizePillText, { color: isPhotoBg ? '#FFFFFF' : roleColors.accent }]}>{widget.size}</Text>
                                    </View>
                                </View>
                                <View style={[styles.liveWidgetFrame, { borderColor: isPhotoBg ? 'rgba(255,255,255,0.2)' : roleColors.border }]}>
                                    {renderLiveWidget(widget)}
                                </View>
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
                        <Text style={[styles.emptyTitle, { color: isPhotoBg ? '#FFFFFF' : roleColors.textPrimary }]}>Пока нет активных виджетов</Text>
                        <Text style={[styles.emptySub, { color: isPhotoBg ? 'rgba(255,255,255,0.82)' : roleColors.textSecondary }]}>
                            Добавьте первый виджет из каталога ниже
                        </Text>
                        <TouchableOpacity
                            style={[styles.emptyCta, { backgroundColor: roleColors.accent }]}
                            onPress={() => handleAddWidget(WIDGET_OPTIONS[0])}
                            activeOpacity={0.88}
                        >
                            <Plus size={16} color="#FFF" />
                            <Text style={styles.emptyCtaText}>Добавить часы</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <Text style={[styles.sectionTitle, { color: isPhotoBg ? 'rgba(255,255,255,0.86)' : roleColors.textSecondary }]}>Управление</Text>

                {activeWidgets.length > 0 ? (
                    <View style={styles.activeList}>
                        {activeWidgets.map((widget, index) => (
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
                                        {getWidgetName(widget.type as WidgetType)}
                                    </Text>
                                    <Text style={[styles.activeMeta, { color: isPhotoBg ? 'rgba(255,255,255,0.8)' : roleColors.textSecondary }]}>
                                        Размер: {widget.size}
                                    </Text>
                                </View>
                                <View style={styles.activeActions}>
                                    <TouchableOpacity
                                        style={[
                                            styles.actionButton,
                                            {
                                                borderColor: isPhotoBg ? 'rgba(255,255,255,0.35)' : roleColors.border,
                                                opacity: index === 0 ? 0.4 : 1,
                                            },
                                        ]}
                                        disabled={index === 0}
                                        onPress={() => handleMoveWidget(index, -1)}
                                        activeOpacity={0.85}
                                    >
                                        <ArrowUp size={16} color={isPhotoBg ? '#FFFFFF' : roleColors.textPrimary} />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[
                                            styles.actionButton,
                                            {
                                                borderColor: isPhotoBg ? 'rgba(255,255,255,0.35)' : roleColors.border,
                                                opacity: index === activeWidgets.length - 1 ? 0.4 : 1,
                                            },
                                        ]}
                                        disabled={index === activeWidgets.length - 1}
                                        onPress={() => handleMoveWidget(index, 1)}
                                        activeOpacity={0.85}
                                    >
                                        <ArrowDown size={16} color={isPhotoBg ? '#FFFFFF' : roleColors.textPrimary} />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.removeButton, { borderColor: isPhotoBg ? 'rgba(248,113,113,0.6)' : '#FCA5A5', backgroundColor: isPhotoBg ? 'rgba(248,113,113,0.16)' : '#FEE2E2' }]}
                                        onPress={() => handleRemoveWidget(widget.id)}
                                        activeOpacity={0.85}
                                    >
                                        <Trash2 size={18} color="#EF4444" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}
                    </View>
                ) : (
                    <Text style={[styles.managementHint, { color: isPhotoBg ? 'rgba(255,255,255,0.82)' : roleColors.textSecondary }]}>
                        После добавления виджетов здесь появятся кнопки перестановки и удаления.
                    </Text>
                )}

                <Text style={[styles.sectionTitle, { color: isPhotoBg ? 'rgba(255,255,255,0.86)' : roleColors.textSecondary, marginTop: 18 }]}>
                    Добавить виджеты
                </Text>

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
                                    {renderOptionPreview(option)}
                                </View>
                            </View>

                            <View style={[styles.cardFooter, { borderTopColor: isPhotoBg ? 'rgba(255,255,255,0.2)' : roleColors.border }]}>
                                <Text style={[styles.statusText, { color: isPhotoBg ? 'rgba(255,255,255,0.84)' : roleColors.textSecondary }]}>
                                    {activeCount > 0 ? `Активно: ${activeCount}` : 'Не используется'}
                                </Text>
                                <TouchableOpacity
                                    style={[styles.addButton, { backgroundColor: roleColors.accent }]}
                                    onPress={() => handleAddWidget(option)}
                                    activeOpacity={0.88}
                                >
                                    <Plus size={19} color="#FFF" />
                                    <Text style={styles.addButtonText}>Добавить</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    );
                })}
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
        paddingHorizontal: 8,
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
        textAlign: 'center',
    },
    portalButton: {
        minWidth: 70,
        height: 42,
        borderRadius: 21,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 10,
    },
    portalButtonText: {
        fontSize: 12,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.3,
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
        marginTop: 10,
    },
    liveWidgetsList: {
        marginBottom: 12,
    },
    liveWidgetCard: {
        borderRadius: 18,
        borderWidth: 1,
        padding: 14,
        marginBottom: 12,
        overflow: 'hidden',
    },
    liveWidgetHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    liveWidgetTitle: {
        fontSize: 15,
        fontWeight: '700',
    },
    liveWidgetFrame: {
        borderRadius: 14,
        borderWidth: 1,
        minHeight: 140,
        paddingVertical: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    managementHint: {
        fontSize: 13,
        lineHeight: 19,
        marginBottom: 6,
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
        padding: 14,
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
        fontSize: 16,
        fontWeight: '700',
    },
    activeMeta: {
        marginTop: 2,
        fontSize: 12,
        fontWeight: '600',
    },
    activeActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    actionButton: {
        width: 32,
        height: 32,
        borderRadius: 10,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
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
        marginBottom: 12,
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
        marginBottom: 14,
    },
    emptyCta: {
        alignSelf: 'center',
        borderRadius: 999,
        paddingHorizontal: 14,
        paddingVertical: 9,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    emptyCtaText: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 13,
    },
    mockCirclesCard: {
        width: '100%',
        maxWidth: 240,
        borderRadius: 14,
        borderWidth: 1,
        padding: 12,
    },
    mockCirclesHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    mockCirclesTitle: {
        fontSize: 12,
        fontWeight: '700',
    },
    mockCirclesRow: {
        flexDirection: 'row',
        marginTop: 10,
        justifyContent: 'space-between',
    },
    mockCircle: {
        width: 34,
        height: 34,
        borderRadius: 17,
    },
    mockCirclesCaption: {
        marginTop: 10,
        fontSize: 11,
        fontWeight: '600',
        textAlign: 'center',
    },
});

export default WidgetSelectionScreen;
