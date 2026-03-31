import React from 'react';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft } from 'lucide-react-native';
import {
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
    type StyleProp,
    type ViewStyle,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { ScreenScaffold } from '../../../components/theme/ScreenScaffold';
import { RootStackParamList } from '../../../types/navigation';

export const LILA_COLORS = {
    ink: '#2A1810',
    parchment: '#F6E9CF',
    lotus: '#E06C4F',
    lotusSoft: '#F2B7A6',
    gold: '#C7942F',
    saffron: '#D97706',
    crimson: '#8E2F1E',
    emerald: '#3A7D62',
    veil: 'rgba(42,24,16,0.74)',
    surface: 'rgba(255,244,224,0.9)',
    surfaceStrong: 'rgba(255,250,238,0.96)',
    border: 'rgba(199,148,47,0.42)',
};

const SERIF_FONT = Platform.select({
    ios: 'Georgia',
    android: 'serif',
    default: 'serif',
});

type LilaScreenLayoutProps = {
    badge: string;
    title: string;
    subtitle: string;
    children: React.ReactNode;
    headerRight?: React.ReactNode;
    showBack?: boolean;
};

type LilaCardProps = {
    children: React.ReactNode;
    tone?: 'surface' | 'gold' | 'night';
    onPress?: () => void;
    style?: StyleProp<ViewStyle>;
};

type LilaPillProps = {
    label: string;
    tone?: 'gold' | 'night' | 'surface';
};

type LilaPrimaryButtonProps = {
    label: string;
    onPress?: () => void;
    tone?: 'gold' | 'night';
};

export const LilaScreenLayout: React.FC<LilaScreenLayoutProps> = ({
    badge,
    title,
    subtitle,
    children,
    headerRight,
    showBack = true,
}) => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

    return (
        <ScreenScaffold variant="portal" enableAura transparentBackground>
            <View style={styles.root}>
                <View pointerEvents="none" style={styles.backgroundLayer}>
                    <View style={styles.mandalaLarge} />
                    <View style={styles.mandalaSmall} />
                    <View style={styles.rangoli} />
                </View>
                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    <LinearGradient
                        colors={[LILA_COLORS.ink, LILA_COLORS.crimson, LILA_COLORS.saffron]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.hero}
                    >
                        <View style={styles.heroTop}>
                            {showBack ? (
                                <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
                                    <ArrowLeft size={20} color={LILA_COLORS.parchment} />
                                </Pressable>
                            ) : <View style={styles.backButtonPlaceholder} />}
                            {headerRight}
                        </View>
                        <LilaPill label={badge} tone="gold" />
                        <Text style={styles.heroTitle}>{title}</Text>
                        <Text style={styles.heroSubtitle}>{subtitle}</Text>
                    </LinearGradient>
                    {children}
                </ScrollView>
            </View>
        </ScreenScaffold>
    );
};

export const LilaCard: React.FC<LilaCardProps> = ({ children, tone = 'surface', onPress, style }) => {
    const toneStyle = tone === 'gold'
        ? styles.cardGold
        : tone === 'night'
            ? styles.cardNight
            : styles.cardSurface;
    const Container = onPress ? Pressable : View;

    return (
        <Container style={[styles.cardBase, toneStyle, style]} {...(onPress ? { onPress } : {})}>
            {children}
        </Container>
    );
};

export const LilaPill: React.FC<LilaPillProps> = ({ label, tone = 'surface' }) => {
    const pillStyle = tone === 'gold'
        ? styles.pillGold
        : tone === 'night'
            ? styles.pillNight
            : styles.pillSurface;
    const textStyle = tone === 'surface' ? styles.pillLabelDark : styles.pillLabelLight;

    return (
        <View style={[styles.pill, pillStyle]}>
            <Text style={[styles.pillLabel, textStyle]}>{label}</Text>
        </View>
    );
};

export const LilaPrimaryButton: React.FC<LilaPrimaryButtonProps> = ({ label, onPress, tone = 'gold' }) => (
    <Pressable onPress={onPress} style={[styles.primaryButton, tone === 'night' ? styles.primaryButtonNight : styles.primaryButtonGold]}>
        <Text style={[styles.primaryButtonLabel, tone === 'night' ? styles.primaryButtonLabelNight : styles.primaryButtonLabelGold]}>{label}</Text>
    </Pressable>
);

export const LilaSectionTitle: React.FC<{ title: string; subtitle?: string }> = ({ title, subtitle }) => (
    <View style={styles.sectionTitleWrap}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
    </View>
);

export const LilaMetric: React.FC<{ label: string; value: string; tone?: 'dark' | 'light' }> = ({ label, value, tone = 'dark' }) => (
    <View style={styles.metric}>
        <Text style={[styles.metricValue, tone === 'light' ? styles.metricValueLight : styles.metricValueDark]}>{value}</Text>
        <Text style={[styles.metricLabel, tone === 'light' ? styles.metricLabelLight : styles.metricLabelDark]}>{label}</Text>
    </View>
);

export const LilaProgressBar: React.FC<{ progress: number; accent?: string }> = ({ progress, accent = LILA_COLORS.gold }) => (
    <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.max(0, Math.min(progress, 1)) * 100}%`, backgroundColor: accent }]} />
    </View>
);

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: '#1F140F',
    },
    backgroundLayer: {
        ...StyleSheet.absoluteFillObject,
    },
    mandalaLarge: {
        position: 'absolute',
        top: -90,
        right: -50,
        width: 240,
        height: 240,
        borderRadius: 120,
        borderWidth: 1,
        borderColor: 'rgba(255,213,128,0.18)',
        backgroundColor: 'rgba(255,213,128,0.05)',
    },
    mandalaSmall: {
        position: 'absolute',
        bottom: 140,
        left: -40,
        width: 170,
        height: 170,
        borderRadius: 85,
        borderWidth: 1,
        borderColor: 'rgba(224,108,79,0.18)',
        backgroundColor: 'rgba(224,108,79,0.05)',
    },
    rangoli: {
        position: 'absolute',
        top: 210,
        left: 28,
        right: 28,
        height: 1,
        backgroundColor: 'rgba(255,244,224,0.18)',
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 18,
        paddingTop: 18,
        paddingBottom: 36,
        gap: 14,
    },
    hero: {
        borderRadius: 28,
        paddingHorizontal: 18,
        paddingTop: 14,
        paddingBottom: 18,
        borderWidth: 1,
        borderColor: 'rgba(255,244,224,0.16)',
        overflow: 'hidden',
    },
    heroTop: {
        minHeight: 40,
        marginBottom: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,244,224,0.14)',
        borderWidth: 1,
        borderColor: 'rgba(255,244,224,0.18)',
    },
    backButtonPlaceholder: {
        width: 40,
        height: 40,
    },
    heroTitle: {
        marginTop: 12,
        color: LILA_COLORS.parchment,
        fontSize: 30,
        lineHeight: 36,
        fontWeight: '700',
        fontFamily: SERIF_FONT,
    },
    heroSubtitle: {
        marginTop: 8,
        color: 'rgba(255,244,224,0.84)',
        fontSize: 14,
        lineHeight: 20,
    },
    cardBase: {
        borderRadius: 22,
        padding: 16,
        borderWidth: 1,
    },
    cardSurface: {
        backgroundColor: LILA_COLORS.surface,
        borderColor: LILA_COLORS.border,
    },
    cardGold: {
        backgroundColor: 'rgba(199,148,47,0.16)',
        borderColor: 'rgba(255,221,166,0.3)',
    },
    cardNight: {
        backgroundColor: LILA_COLORS.veil,
        borderColor: 'rgba(255,244,224,0.12)',
    },
    pill: {
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 999,
        borderWidth: 1,
    },
    pillSurface: {
        backgroundColor: 'rgba(255,250,238,0.82)',
        borderColor: LILA_COLORS.border,
    },
    pillGold: {
        backgroundColor: 'rgba(255,221,166,0.18)',
        borderColor: 'rgba(255,221,166,0.34)',
    },
    pillNight: {
        backgroundColor: 'rgba(42,24,16,0.65)',
        borderColor: 'rgba(255,244,224,0.16)',
    },
    pillLabel: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.4,
    },
    pillLabelLight: {
        color: LILA_COLORS.parchment,
    },
    pillLabelDark: {
        color: LILA_COLORS.ink,
    },
    primaryButton: {
        minHeight: 50,
        paddingHorizontal: 18,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    primaryButtonGold: {
        backgroundColor: '#F1C36D',
        borderColor: '#FFE1A8',
    },
    primaryButtonNight: {
        backgroundColor: LILA_COLORS.ink,
        borderColor: 'rgba(255,244,224,0.12)',
    },
    primaryButtonLabel: {
        fontSize: 14,
        fontWeight: '800',
        letterSpacing: 0.2,
    },
    primaryButtonLabelGold: {
        color: '#3A2212',
    },
    primaryButtonLabelNight: {
        color: LILA_COLORS.parchment,
    },
    sectionTitleWrap: {
        gap: 4,
    },
    sectionTitle: {
        color: LILA_COLORS.parchment,
        fontSize: 19,
        fontWeight: '700',
        fontFamily: SERIF_FONT,
    },
    sectionSubtitle: {
        color: 'rgba(255,244,224,0.74)',
        fontSize: 13,
        lineHeight: 18,
    },
    metric: {
        flex: 1,
        minWidth: 90,
        gap: 4,
    },
    metricValue: {
        fontSize: 20,
        fontWeight: '800',
    },
    metricValueDark: {
        color: LILA_COLORS.ink,
    },
    metricValueLight: {
        color: LILA_COLORS.parchment,
    },
    metricLabel: {
        fontSize: 12,
    },
    metricLabelDark: {
        color: 'rgba(42,24,16,0.68)',
    },
    metricLabelLight: {
        color: 'rgba(255,244,224,0.72)',
    },
    progressTrack: {
        width: '100%',
        height: 9,
        borderRadius: 999,
        backgroundColor: 'rgba(42,24,16,0.12)',
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 999,
    },
});
