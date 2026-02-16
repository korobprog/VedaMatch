import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Image,
    Alert,
    ActivityIndicator,
    Platform,
    Switch,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Camera, Utensils, Pencil, Info, MapPin, Phone, Globe, MessageCircle, Instagram, Truck, ShoppingBag, UtensilsCrossed } from 'lucide-react-native';
import { launchImageLibrary, PhotoQuality } from 'react-native-image-picker';
import { cafeService } from '../../../services/cafeService';
import { useUser } from '../../../context/UserContext';
import { useSettings } from '../../../context/SettingsContext';
import { useRoleTheme } from '../../../hooks/useRoleTheme';
import { SemanticColorTokens } from '../../../theme/semanticTokens';
import { KeyboardAwareContainer } from '../../../components/ui/KeyboardAwareContainer';

const CreateCafeScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { t } = useTranslation();
    const { user } = useUser();
    const { isDarkMode } = useSettings();
    const { colors, roleTheme } = useRoleTheme(user?.role, isDarkMode);
    const styles = React.useMemo(() => createStyles(colors), [colors]);
    const cafeId = route.params?.cafeId;
    const isEditing = !!cafeId;

    const [loading, setLoading] = useState(isEditing);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [city, setCity] = useState('');
    const [address, setAddress] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [website, setWebsite] = useState('');
    const [telegram, setTelegram] = useState('');
    const [instagram, setInstagram] = useState('');
    const [hasDelivery, setHasDelivery] = useState(false);
    const [hasTakeaway, setHasTakeaway] = useState(true);
    const [hasDineIn, setHasDineIn] = useState(true);

    const [logo, setLogo] = useState<string | null>(null);
    const [cover, setCover] = useState<string | null>(null);
    const isMountedRef = useRef(true);
    const latestLoadRequestRef = useRef(0);
    const latestSubmitRequestRef = useRef(0);
    const latestUploadRequestRef = useRef(0);

    useEffect(() => {
        if (isEditing) {
            void loadCafeData();
        }
        return () => {
            isMountedRef.current = false;
            latestLoadRequestRef.current += 1;
            latestSubmitRequestRef.current += 1;
            latestUploadRequestRef.current += 1;
        };
    }, [isEditing]);

    const loadCafeData = useCallback(async () => {
        if (!cafeId) {
            if (isMountedRef.current) {
                setLoading(false);
                navigation.goBack();
            }
            return;
        }
        const requestId = ++latestLoadRequestRef.current;
        try {
            if (isMountedRef.current) {
                setLoading(true);
            }
            const cafe = await cafeService.getCafe(cafeId);
            if (requestId !== latestLoadRequestRef.current || !isMountedRef.current) {
                return;
            }
            setName(cafe.name);
            setDescription(cafe.description || '');
            setCity(cafe.city);
            setAddress(cafe.address || '');
            setPhone(cafe.phone || '');
            setEmail(cafe.email || '');
            setWebsite(cafe.website || '');
            setTelegram(cafe.telegram || '');
            setInstagram(cafe.instagram || '');
            setHasDelivery(cafe.hasDelivery);
            setHasTakeaway(cafe.hasTakeaway);
            setHasDineIn(cafe.hasDineIn);
            setLogo(cafe.logoUrl || null);
            setCover(cafe.coverUrl || null);
        } catch (error) {
            if (requestId === latestLoadRequestRef.current && isMountedRef.current) {
                Alert.alert(t('common.error'), t('cafe.form.errorLoad'));
                navigation.goBack();
            }
        } finally {
            if (requestId === latestLoadRequestRef.current && isMountedRef.current) {
                setLoading(false);
            }
        }
    }, [cafeId, navigation, t]);

    const handlePickImage = async (type: 'logo' | 'cover') => {
        const options = {
            mediaType: 'photo' as const,
            quality: 0.8 as PhotoQuality,
            maxWidth: type === 'logo' ? 500 : 1200,
            maxHeight: type === 'logo' ? 500 : 675,
        };

        launchImageLibrary(options, async (response) => {
            if (response.didCancel) return;
            if (response.errorMessage) {
                if (isMountedRef.current) {
                    Alert.alert(t('common.error'), response.errorMessage);
                }
                return;
            }

            if (response.assets && response.assets.length > 0) {
                const asset = response.assets[0];
                const requestId = ++latestUploadRequestRef.current;
                try {
                    const url = type === 'logo'
                        ? await cafeService.uploadLogo(asset)
                        : await cafeService.uploadCover(asset);
                    if (requestId !== latestUploadRequestRef.current || !isMountedRef.current) {
                        return;
                    }

                    if (type === 'logo') setLogo(url);
                    else setCover(url);
                } catch (error) {
                    if (requestId === latestUploadRequestRef.current && isMountedRef.current) {
                        Alert.alert(t('common.error'), t('cafe.form.errorUpload'));
                    }
                }
            }
        });
    };

    const handleSubmit = async () => {
        if (submitting) {
            return;
        }
        const trimmedName = name.trim();
        const trimmedCity = city.trim();
        if (!trimmedName || !trimmedCity) {
            Alert.alert(t('common.error'), t('cafe.form.errorFill'));
            return;
        }

        const requestId = ++latestSubmitRequestRef.current;
        setSubmitting(true);
        const data = {
            name: trimmedName,
            description: description.trim(),
            city: trimmedCity,
            address: address.trim(),
            phone: phone.trim(),
            email: email.trim(),
            website: website.trim(),
            telegram: telegram.trim(),
            instagram: instagram.trim(),
            hasDelivery,
            hasTakeaway,
            hasDineIn,
            logoUrl: logo,
            coverUrl: cover,
        };

        try {
            if (isEditing) {
                await cafeService.updateCafe(cafeId, data);
            } else {
                await cafeService.createCafe(data);
            }
            if (requestId === latestSubmitRequestRef.current && isMountedRef.current) {
                navigation.goBack();
            }
        } catch (error) {
            if (requestId === latestSubmitRequestRef.current && isMountedRef.current) {
                Alert.alert(t('common.error'), t('cafe.form.errorSave'));
            }
        } finally {
            if (requestId === latestSubmitRequestRef.current && isMountedRef.current) {
                setSubmitting(false);
            }
        }
    };

    if (loading) {
        return (
            <LinearGradient colors={roleTheme.gradient} style={styles.centerContainer}>
                <ActivityIndicator size="large" color={colors.accent} />
            </LinearGradient>
        );
    }

    return (
        <View style={styles.container}>
            <LinearGradient colors={roleTheme.gradient} style={StyleSheet.absoluteFill} />

            <SafeAreaView style={styles.header} edges={['top']}>
                <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
                    <ArrowLeft size={22} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>
                    {isEditing ? t('cafe.form.editTitle') : t('cafe.form.registerTitle')}
                </Text>
                <View style={{ width: 44 }} />
            </SafeAreaView>

            <KeyboardAwareContainer style={{ flex: 1 }}>
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Media Section */}
                    <View style={styles.mediaContainer}>
                        <TouchableOpacity
                            style={styles.coverUpload}
                            onPress={() => handlePickImage('cover')}
                            activeOpacity={0.9}
                        >
                            {cover ? (
                                <Image source={{ uri: cafeService.getImageUrl(cover) }} style={styles.coverImg} />
                            ) : (
                                <View style={styles.coverPlaceholder}>
                                    <Camera size={32} color={colors.textSecondary} />
                                    <Text style={styles.uploadLabel}>{t('cafe.form.addCover')}</Text>
                                </View>
                            )}
                            <LinearGradient
                                colors={['transparent', colors.overlay]}
                                style={StyleSheet.absoluteFill}
                            />
                        </TouchableOpacity>

                        <View style={styles.logoWrapper}>
                            <TouchableOpacity
                                style={styles.logoUpload}
                                onPress={() => handlePickImage('logo')}
                                activeOpacity={0.9}
                            >
                                {logo ? (
                                    <Image source={{ uri: cafeService.getImageUrl(logo) }} style={styles.logoImg} />
                                ) : (
                                    <View style={styles.logoPlaceholder}>
                                        <Utensils size={24} color={colors.textSecondary} />
                                    </View>
                                )}
                                <View style={styles.pencilBadge}>
                                    <Pencil size={12} color={colors.textPrimary} strokeWidth={3} />
                                </View>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.formContainer}>
                        {/* Basic Info Group */}
                        <View style={styles.glassGroup}>
                            <View style={styles.groupHeader}>
                                <Info size={18} color={colors.accent} />
                                <Text style={styles.groupTitle}>{t('cafe.form.basicInfo')}</Text>
                            </View>
                            <View style={styles.inputBox}>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder={t('cafe.form.name')}
                                    placeholderTextColor={colors.textSecondary}
                                    value={name}
                                    onChangeText={setName}
                                />
                            </View>
                            <View style={styles.inputBox}>
                                <TextInput
                                    style={[styles.textInput, { height: 100, textAlignVertical: 'top' }]}
                                    placeholder={t('cafe.form.description')}
                                    placeholderTextColor={colors.textSecondary}
                                    value={description}
                                    onChangeText={setDescription}
                                    multiline
                                    numberOfLines={4}
                                />
                            </View>
                        </View>

                        {/* Location Group */}
                        <View style={styles.glassGroup}>
                            <View style={styles.groupHeader}>
                                <MapPin size={18} color={colors.accent} />
                                <Text style={styles.groupTitle}>{t('cafe.form.location')}</Text>
                            </View>
                            <View style={styles.inputBox}>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder={t('cafe.form.city')}
                                    placeholderTextColor={colors.textSecondary}
                                    value={city}
                                    onChangeText={setCity}
                                />
                            </View>
                            <View style={styles.inputBox}>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder={t('cafe.form.address')}
                                    placeholderTextColor={colors.textSecondary}
                                    value={address}
                                    onChangeText={setAddress}
                                />
                            </View>
                        </View>

                        {/* Contact Group */}
                        <View style={styles.glassGroup}>
                            <View style={styles.groupHeader}>
                                <Phone size={18} color={colors.accent} />
                                <Text style={styles.groupTitle}>{t('cafe.form.contactSocial')}</Text>
                            </View>
                            <View style={styles.inputBox}>
                                <Phone size={16} color={colors.textSecondary} style={styles.innerIcon} />
                                <TextInput
                                    style={styles.textInput}
                                    placeholder={t('cafe.form.phone')}
                                    placeholderTextColor={colors.textSecondary}
                                    value={phone}
                                    onChangeText={setPhone}
                                    keyboardType="phone-pad"
                                />
                            </View>
                            <View style={styles.inputBox}>
                                <Globe size={16} color={colors.textSecondary} style={styles.innerIcon} />
                                <TextInput
                                    style={styles.textInput}
                                    placeholder={t('cafe.form.website')}
                                    placeholderTextColor={colors.textSecondary}
                                    value={website}
                                    onChangeText={setWebsite}
                                    autoCapitalize="none"
                                />
                            </View>
                            <View style={styles.socialRow}>
                                <View style={[styles.inputBox, { flex: 1, marginBottom: 0 }]}>
                                    <MessageCircle size={16} color={colors.textSecondary} style={styles.innerIcon} />
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder="Telegram"
                                        placeholderTextColor={colors.textSecondary}
                                        value={telegram}
                                        onChangeText={setTelegram}
                                        autoCapitalize="none"
                                    />
                                </View>
                                <View style={[styles.inputBox, { flex: 1, marginBottom: 0 }]}>
                                    <Instagram size={16} color={colors.textSecondary} style={styles.innerIcon} />
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder="Instagram"
                                        placeholderTextColor={colors.textSecondary}
                                        value={instagram}
                                        onChangeText={setInstagram}
                                        autoCapitalize="none"
                                    />
                                </View>
                            </View>
                        </View>

                        {/* Services Group */}
                        <View style={styles.glassGroup}>
                            <View style={styles.groupHeader}>
                                <Truck size={18} color={colors.accent} />
                                <Text style={styles.groupTitle}>{t('cafe.form.services')}</Text>
                            </View>
                            <View style={styles.switchRow}>
                                <View style={styles.switchInfo}>
                                    <UtensilsCrossed size={16} color={colors.textSecondary} />
                                    <Text style={styles.switchLabel}>{t('cafe.form.dineIn')}</Text>
                                </View>
                                <Switch
                                    value={hasDineIn}
                                    onValueChange={setHasDineIn}
                                    trackColor={{ false: colors.surface, true: colors.accent }}
                                    thumbColor={Platform.OS === 'ios' ? colors.textPrimary : (hasDineIn ? colors.textPrimary : colors.textSecondary)}
                                />
                            </View>
                            <View style={styles.switchRow}>
                                <View style={styles.switchInfo}>
                                    <ShoppingBag size={16} color={colors.textSecondary} />
                                    <Text style={styles.switchLabel}>{t('cafe.form.takeaway')}</Text>
                                </View>
                                <Switch
                                    value={hasTakeaway}
                                    onValueChange={setHasTakeaway}
                                    trackColor={{ false: colors.surface, true: colors.accent }}
                                    thumbColor={Platform.OS === 'ios' ? colors.textPrimary : (hasTakeaway ? colors.textPrimary : colors.textSecondary)}
                                />
                            </View>
                            <View style={styles.switchRow}>
                                <View style={styles.switchInfo}>
                                    <Truck size={16} color={colors.textSecondary} />
                                    <Text style={styles.switchLabel}>{t('cafe.form.delivery')}</Text>
                                </View>
                                <Switch
                                    value={hasDelivery}
                                    onValueChange={setHasDelivery}
                                    trackColor={{ false: colors.surface, true: colors.accent }}
                                    thumbColor={Platform.OS === 'ios' ? colors.textPrimary : (hasDelivery ? colors.textPrimary : colors.textSecondary)}
                                />
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[styles.submitBtn, submitting && styles.disabledBtn]}
                            onPress={handleSubmit}
                            disabled={submitting}
                        >
                            <LinearGradient
                                colors={[roleTheme.accent, roleTheme.accentStrong]}
                                style={styles.submitGradient}
                            >
                                {submitting ? (
                                    <ActivityIndicator color={colors.textPrimary} />
                                ) : (
                                    <Text style={styles.submitBtnText}>
                                        {isEditing ? t('cafe.form.saveChanges') : t('cafe.form.createBtn')}
                                    </Text>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAwareContainer>
        </View>
    );
};

const createStyles = (colors: SemanticColorTokens) => StyleSheet.create({
    container: {
        flex: 1,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 15,
        zIndex: 10,
    },
    headerBtn: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    headerTitle: {
        color: colors.textPrimary,
        fontSize: 18,
        fontFamily: 'Cinzel-Bold',
    },
    scrollContent: {
        paddingBottom: 60,
    },
    mediaContainer: {
        width: '100%',
        height: 220,
        position: 'relative',
        marginBottom: 60,
    },
    coverUpload: {
        width: '100%',
        height: '100%',
        backgroundColor: colors.surface,
    },
    coverImg: {
        width: '100%',
        height: '100%',
    },
    coverPlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
    },
    uploadLabel: {
        color: colors.textSecondary,
        fontSize: 14,
        fontWeight: '600',
    },
    logoWrapper: {
        position: 'absolute',
        bottom: -40,
        left: 20,
        zIndex: 20,
    },
    logoUpload: {
        width: 100,
        height: 100,
        borderRadius: 32,
        backgroundColor: colors.surface,
        borderWidth: 4,
        borderColor: colors.background,
        shadowColor: colors.overlay,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoImg: {
        width: '100%',
        height: '100%',
        borderRadius: 28,
    },
    logoPlaceholder: {
        width: '100%',
        height: '100%',
        borderRadius: 28,
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
    },
    pencilBadge: {
        position: 'absolute',
        bottom: -5,
        right: -5,
        width: 28,
        height: 28,
        borderRadius: 10,
        backgroundColor: colors.accent,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: colors.background,
    },
    formContainer: {
        paddingHorizontal: 20,
    },
    glassGroup: {
        backgroundColor: colors.surfaceElevated,
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 20,
    },
    groupHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 20,
    },
    groupTitle: {
        color: colors.textPrimary,
        fontSize: 16,
        fontFamily: 'Cinzel-Bold',
    },
    inputBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: 16,
        paddingHorizontal: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.border,
    },
    innerIcon: {
        marginRight: 12,
    },
    textInput: {
        flex: 1,
        height: 52,
        color: colors.textPrimary,
        fontSize: 14,
        fontWeight: '600',
    },
    socialRow: {
        flexDirection: 'row',
        gap: 12,
    },
    switchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    switchInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    switchLabel: {
        color: colors.textSecondary,
        fontSize: 15,
        fontWeight: '600',
    },
    submitBtn: {
        borderRadius: 20,
        overflow: 'hidden',
        marginTop: 10,
        shadowColor: colors.accent,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
        elevation: 10,
    },
    submitGradient: {
        paddingVertical: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitBtnText: {
        color: colors.textPrimary,
        fontSize: 16,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    disabledBtn: {
        opacity: 0.5,
    }
});

export default CreateCafeScreen;
