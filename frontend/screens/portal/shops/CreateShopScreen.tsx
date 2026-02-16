import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
    Image, Alert, ActivityIndicator
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { launchImageLibrary, Asset } from 'react-native-image-picker';
import { marketService } from '../../../services/marketService';
import { ShopCategory, ShopCategoryConfig } from '../../../types/market';
import { ProtectedScreen } from '../../../components/ProtectedScreen';
import { getMediaUrl } from '../../../utils/url';
import { useUser } from '../../../context/UserContext';
import { useSettings } from '../../../context/SettingsContext';
import { useRoleTheme } from '../../../hooks/useRoleTheme';
import { SemanticColorTokens } from '../../../theme/semanticTokens';
import { KeyboardAwareContainer } from '../../../components/ui/KeyboardAwareContainer';
import {
    Store,
    Image as ImageIcon,
    Tag,
    MapPin,
    Phone,
    Mail,
    Send,
    Instagram,
    Globe
} from 'lucide-react-native';

type RouteParams = {
    CreateShop: { shopId?: number };
};

export const CreateShopScreen: React.FC = () => {
    const { t, i18n } = useTranslation();
    const navigation = useNavigation();
    const route = useRoute<RouteProp<RouteParams, 'CreateShop'>>();
    const shopId = route.params?.shopId;
    const isEditing = !!shopId;
    const currentLang = i18n.language === 'ru' ? 'ru' : 'en';
    const { user } = useUser();
    const { isDarkMode } = useSettings();
    const { colors } = useRoleTheme(user?.role, isDarkMode);
    const styles = React.useMemo(() => createStyles(colors), [colors]);

    const [loading, setLoading] = useState(false);
    const [checkingPermission, setCheckingPermission] = useState(true);
    const [canCreate, setCanCreate] = useState(true);
    const [permissionMessage, setPermissionMessage] = useState('');

    const [categories, setCategories] = useState<ShopCategoryConfig[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<ShopCategory>('other');

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [city, setCity] = useState('');
    const [address, setAddress] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [telegram, setTelegram] = useState('');
    const [instagram, setInstagram] = useState('');
    const [website, setWebsite] = useState('');

    const [logoAsset, setLogoAsset] = useState<Asset | null>(null);
    const [existingLogo, setExistingLogo] = useState('');
    const [coverAsset, setCoverAsset] = useState<Asset | null>(null);
    const [existingCover, setExistingCover] = useState('');

    useEffect(() => {
        checkPermissionAndLoadCategories();
    }, [shopId]);

    const checkPermissionAndLoadCategories = async () => {
        try {
            setCheckingPermission(true);

            // Check if user already has a shop (if not editing)
            if (!isEditing) {
                const myShop = await marketService.getMyShop();
                if (myShop.hasShop) {
                    // Redirect to existing shop
                    Alert.alert(
                        t('market.shop.alreadyHave') || 'You already have a shop',
                        t('market.shop.redirecting') || 'Redirecting to your shop...',
                        [{ text: 'OK', onPress: () => navigation.goBack() }]
                    );
                    return;
                }
            }

            // Check permission
            const permission = await marketService.canCreateShop();
            setCanCreate(permission.canCreate);
            if (!permission.canCreate) {
                setPermissionMessage(permission.message || 'You cannot create a shop');
            }

            // Load categories
            const cats = await marketService.getShopCategories();
            setCategories(cats);

            // If editing, load shop data
            if (isEditing && shopId) {
                const shop = await marketService.getShop(shopId);
                setName(shop.name);
                setDescription(shop.description || '');
                setSelectedCategory(shop.category);
                setCity(shop.city);
                setAddress(shop.address || '');
                setPhone(shop.phone || '');
                setEmail(shop.email || '');
                setTelegram(shop.telegram || '');
                setInstagram(shop.instagram || '');
                setWebsite(shop.website || '');
                setExistingLogo(shop.logoUrl || '');
                setExistingCover(shop.coverUrl || '');
            } else if (cats.length > 0) {
                setSelectedCategory(cats[0].id);
            }
        } catch (error) {
            console.error('Error checking permission:', error);
        } finally {
            setCheckingPermission(false);
        }
    };

    const handlePickLogo = async () => {
        const result = await launchImageLibrary({ mediaType: 'photo', selectionLimit: 1, quality: 0.8 });
        if (result.assets && result.assets[0]) {
            setLogoAsset(result.assets[0]);
        }
    };

    const handlePickCover = async () => {
        const result = await launchImageLibrary({ mediaType: 'photo', selectionLimit: 1, quality: 0.8 });
        if (result.assets && result.assets[0]) {
            setCoverAsset(result.assets[0]);
        }
    };

    const handleSubmit = async () => {
        if (!name.trim() || name.length < 2) {
            return Alert.alert(t('error') || 'Error', t('market.shop.nameRequired') || 'Shop name must be at least 2 characters');
        }
        if (!city.trim()) {
            return Alert.alert(t('error') || 'Error', t('market.shop.cityRequired') || 'City is required');
        }

        setLoading(true);
        try {
            // 1. Upload logo and cover images
            let logoUrl = '';
            let coverUrl = '';

            if (logoAsset) {
                logoUrl = await marketService.uploadShopLogo(logoAsset);
            }
            if (coverAsset) {
                coverUrl = await marketService.uploadShopCover(coverAsset);
            }

            const shopData = {
                name: name.trim(),
                description: description.trim(),
                category: selectedCategory,
                city: city.trim(),
                address: address.trim(),
                phone: phone.trim(),
                email: email.trim(),
                telegram: telegram.trim(),
                instagram: instagram.trim(),
                website: website.trim(),
                logoUrl: logoUrl || existingLogo || undefined,
                coverUrl: coverUrl || existingCover || undefined,
            };

            if (isEditing && shopId) {
                await marketService.updateShop(shopId, shopData);
                Alert.alert(
                    t('success') || 'Success',
                    t('market.product.updateSuccess') || 'Shop updated successfully',
                    [{ text: 'OK', onPress: () => navigation.goBack() }]
                );
            } else {
                await marketService.createShop(shopData);
                Alert.alert(
                    t('success') || 'Success',
                    t('market.shop.createSuccess') || 'Shop created successfully! It will be reviewed by moderators.',
                    [{ text: 'OK', onPress: () => navigation.goBack() }]
                );
            }
        } catch (error: any) {
            console.error('Error saving shop:', error);
            Alert.alert(
                t('error') || 'Error',
                error.response?.data?.error || t('market.shop.createError') || 'Failed to save shop'
            );
        } finally {
            setLoading(false);
        }
    };

    if (checkingPermission) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={colors.accent} />
                <Text style={styles.loadingText}>
                    {t('loading') || 'Loading...'}
                </Text>
            </View>
        );
    }

    if (!canCreate) {
        return (
            <View style={styles.centerContainer}>
                <Store size={64} color={colors.textSecondary} opacity={0.5} style={{ marginBottom: 16 }} />
                <Text style={styles.errorTitle}>
                    {t('market.shop.cannotCreate') || 'Cannot Create Shop'}
                </Text>
                <Text style={styles.errorMessage}>
                    {permissionMessage}
                </Text>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={styles.backButtonText}>{t('back') || 'Go Back'}</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <ProtectedScreen>
            <View style={styles.screen}>
                <KeyboardAwareContainer style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
                    <Text style={styles.headerTitle}>
                        {t('market.shop.create') || 'Create Your Shop'}
                    </Text>
                    <Text style={styles.headerSubtitle}>
                        {t('market.shop.createSubtitle') || 'Start selling your products to the community'}
                    </Text>

                    {/* Logo & Cover */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>
                            {t('market.shop.branding') || 'Branding'}
                        </Text>

                        <View style={styles.imageRow}>
                            <TouchableOpacity style={styles.logoPickerBtn} onPress={handlePickLogo}>
                                {logoAsset ? (
                                    <Image source={{ uri: logoAsset.uri }} style={styles.logoPreview} />
                                ) : existingLogo ? (
                                    <Image source={{ uri: getMediaUrl(existingLogo) || '' }} style={styles.logoPreview} />
                                ) : (
                                    <View style={styles.logoPlaceholder}>
                                        <Store size={32} color={colors.accent} />
                                        <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>{t('market.shop.logo') || 'Logo'}</Text>
                                    </View>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.coverPickerBtn} onPress={handlePickCover}>
                                {coverAsset ? (
                                    <Image source={{ uri: coverAsset.uri }} style={styles.coverPreview} />
                                ) : existingCover ? (
                                    <Image source={{ uri: getMediaUrl(existingCover) || '' }} style={styles.coverPreview} />
                                ) : (
                                    <View style={styles.coverPlaceholder}>
                                        <ImageIcon size={24} color={colors.accent} />
                                        <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>{t('market.shop.cover') || 'Cover'}</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Category Selection */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>
                            {t('market.shop.category') || 'Category'}
                        </Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                            {categories.map((cat) => (
                                <TouchableOpacity
                                    key={cat.id}
                                    style={[
                                        styles.categoryPill,
                                        {
                                            backgroundColor: selectedCategory === cat.id ? colors.accent : colors.surfaceElevated,
                                            borderColor: selectedCategory === cat.id ? colors.accent : 'transparent'
                                        }
                                    ]}
                                    onPress={() => setSelectedCategory(cat.id)}
                                >
                                    <Tag size={16} color={selectedCategory === cat.id ? colors.textPrimary : colors.accent} style={{ marginRight: 6 }} />
                                    <Text style={[
                                        styles.categoryLabel,
                                        { color: selectedCategory === cat.id ? colors.textPrimary : colors.textPrimary }
                                    ]}>
                                        {cat.label[currentLang] || cat.label.en}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    {/* Basic Info */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>
                            {t('market.shop.basicInfo') || 'Basic Information'}
                        </Text>

                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                            <Store size={14} color={colors.textSecondary} style={{ marginRight: 6 }} />
                            <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 0 }]}>
                                {t('market.shop.name') || 'Shop Name'} *
                            </Text>
                        </View>
                        <TextInput
                            style={styles.input}
                            value={name}
                            onChangeText={setName}
                            placeholder={t('market.shop.namePlaceholder') || "e.g. Vedic Treasures"}
                            placeholderTextColor={colors.textSecondary}
                            maxLength={200}
                        />

                        <Text style={[styles.label, { color: colors.textSecondary, marginTop: 12 }]}>
                            {t('market.shop.description') || 'Description'}
                        </Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            value={description}
                            onChangeText={setDescription}
                            placeholder={t('market.shop.descPlaceholder') || "Tell customers about your shop..."}
                            placeholderTextColor={colors.textSecondary}
                            multiline
                            numberOfLines={4}
                            maxLength={2000}
                        />

                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, marginBottom: 6 }}>
                            <MapPin size={14} color={colors.textSecondary} style={{ marginRight: 6 }} />
                            <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 0 }]}>
                                {t('market.shop.city') || 'City'} *
                            </Text>
                        </View>
                        <TextInput
                            style={styles.input}
                            value={city}
                            onChangeText={setCity}
                            placeholder={t('market.shop.cityPlaceholder') || "e.g. Moscow"}
                            placeholderTextColor={colors.textSecondary}
                        />

                        <Text style={[styles.label, { color: colors.textSecondary, marginTop: 12 }]}>
                            {t('market.shop.address') || 'Address (optional)'}
                        </Text>
                        <TextInput
                            style={styles.input}
                            value={address}
                            onChangeText={setAddress}
                            placeholder={t('market.shop.addressPlaceholder') || "Street, building, etc."}
                            placeholderTextColor={colors.textSecondary}
                        />
                    </View>

                    {/* Contact Info */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>
                            {t('market.shop.contactInfo') || 'Contact Information'}
                        </Text>

                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                            <Phone size={14} color={colors.textSecondary} style={{ marginRight: 6 }} />
                            <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 0 }]}>
                                {t('market.shop.phone') || 'Phone'}
                            </Text>
                        </View>
                        <TextInput
                            style={styles.input}
                            value={phone}
                            onChangeText={setPhone}
                            placeholder="+7 999 123 45 67"
                            placeholderTextColor={colors.textSecondary}
                            keyboardType="phone-pad"
                        />

                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, marginBottom: 6 }}>
                            <Mail size={14} color={colors.textSecondary} style={{ marginRight: 6 }} />
                            <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 0 }]}>
                                {t('market.shop.email') || 'Email'}
                            </Text>
                        </View>
                        <TextInput
                            style={styles.input}
                            value={email}
                            onChangeText={setEmail}
                            placeholder="shop@example.com"
                            placeholderTextColor={colors.textSecondary}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />

                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, marginBottom: 6 }}>
                            <Send size={14} color={colors.textSecondary} style={{ marginRight: 6 }} />
                            <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 0 }]}>
                                {t('market.shop.telegram') || 'Telegram'}
                            </Text>
                        </View>
                        <TextInput
                            style={styles.input}
                            value={telegram}
                            onChangeText={setTelegram}
                            placeholder="@username"
                            placeholderTextColor={colors.textSecondary}
                            autoCapitalize="none"
                        />

                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, marginBottom: 6 }}>
                            <Instagram size={14} color={colors.textSecondary} style={{ marginRight: 6 }} />
                            <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 0 }]}>
                                {t('market.shop.instagram') || 'Instagram'}
                            </Text>
                        </View>
                        <TextInput
                            style={styles.input}
                            value={instagram}
                            onChangeText={setInstagram}
                            placeholder="@shopname"
                            placeholderTextColor={colors.textSecondary}
                            autoCapitalize="none"
                        />

                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, marginBottom: 6 }}>
                            <Globe size={14} color={colors.textSecondary} style={{ marginRight: 6 }} />
                            <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 0 }]}>
                                {t('market.shop.website') || 'Website'}
                            </Text>
                        </View>
                        <TextInput
                            style={styles.input}
                            value={website}
                            onChangeText={setWebsite}
                            placeholder="https://yourshop.com"
                            placeholderTextColor={colors.textSecondary}
                            autoCapitalize="none"
                            keyboardType="url"
                        />
                    </View>

                    {/* Submit Button */}
                    <TouchableOpacity
                        style={styles.submitBtn}
                        onPress={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color={colors.textPrimary} />
                        ) : (
                            <Text style={styles.submitText}>
                                {t('market.shop.createBtn') || 'Create Shop'}
                            </Text>
                        )}
                    </TouchableOpacity>

                    <Text style={styles.disclaimer}>
                        {t('market.shop.disclaimer') || 'Your shop will be reviewed by moderators before becoming active.'}
                    </Text>
                </ScrollView>
                </KeyboardAwareContainer>
            </View>
        </ProtectedScreen>
    );
};

const createStyles = (colors: SemanticColorTokens) => StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: colors.background,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: colors.background,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: colors.textPrimary,
    },
    errorIcon: {
        fontSize: 64,
        marginBottom: 16,
    },
    errorTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 8,
        color: colors.textPrimary,
    },
    errorMessage: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 24,
        color: colors.textSecondary,
    },
    backButton: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 20,
        backgroundColor: colors.accent,
    },
    backButtonText: {
        color: colors.textPrimary,
        fontSize: 16,
        fontWeight: '600',
    },
    container: {
        padding: 16,
        paddingBottom: 40,
    },
    headerTitle: {
        fontSize: 26,
        fontWeight: 'bold',
        textAlign: 'center',
        color: colors.textPrimary,
    },
    headerSubtitle: {
        fontSize: 14,
        textAlign: 'center',
        marginTop: 8,
        marginBottom: 24,
        color: colors.textSecondary,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 12,
        color: colors.textPrimary,
    },
    imageRow: {
        flexDirection: 'row',
        gap: 12,
    },
    logoPickerBtn: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 2,
        borderStyle: 'dashed',
        overflow: 'hidden',
        borderColor: colors.accent,
    },
    logoPreview: {
        width: '100%',
        height: '100%',
    },
    logoPlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    coverPickerBtn: {
        flex: 1,
        height: 100,
        borderRadius: 12,
        borderWidth: 2,
        borderStyle: 'dashed',
        overflow: 'hidden',
        borderColor: colors.accent,
    },
    coverPreview: {
        width: '100%',
        height: '100%',
    },
    coverPlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderText: {
        fontSize: 12,
        marginTop: 4,
    },
    categoryScroll: {
        flexDirection: 'row',
    },
    categoryPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 20,
        marginRight: 8,
        borderWidth: 1,
    },
    categoryEmoji: {
        fontSize: 16,
        marginRight: 6,
    },
    categoryLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: colors.textPrimary,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 6,
        textTransform: 'uppercase',
    },
    input: {
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        color: colors.textPrimary,
    },
    textArea: {
        minHeight: 100,
        textAlignVertical: 'top',
    },
    submitBtn: {
        padding: 18,
        borderRadius: 30,
        alignItems: 'center',
        marginTop: 8,
        elevation: 6,
        backgroundColor: colors.accent,
        shadowColor: colors.border,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    submitText: {
        color: colors.textPrimary,
        fontSize: 18,
        fontWeight: 'bold',
    },
    disclaimer: {
        fontSize: 12,
        textAlign: 'center',
        marginTop: 16,
        color: colors.textSecondary,
    },
});
