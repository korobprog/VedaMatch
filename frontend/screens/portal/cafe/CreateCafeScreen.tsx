import React, { useState, useEffect } from 'react';
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
    KeyboardAvoidingView,
    Platform,
    Switch,
    Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Camera, Utensils, Pencil, Info, MapPin, Phone, Globe, MessageCircle, Instagram, Truck, ShoppingBag, UtensilsCrossed } from 'lucide-react-native';
import { launchImageLibrary, PhotoQuality } from 'react-native-image-picker';
import { cafeService } from '../../../services/cafeService';

const { width } = Dimensions.get('window');

const CreateCafeScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { t } = useTranslation();
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

    useEffect(() => {
        if (isEditing) {
            loadCafeData();
        }
    }, [cafeId]);

    const loadCafeData = async () => {
        try {
            const cafe = await cafeService.getCafe(cafeId);
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
            Alert.alert(t('common.error'), t('cafe.form.errorLoad'));
            navigation.goBack();
        } finally {
            setLoading(false);
        }
    };

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
                Alert.alert(t('common.error'), response.errorMessage);
                return;
            }

            if (response.assets && response.assets.length > 0) {
                const asset = response.assets[0];
                try {
                    const url = type === 'logo'
                        ? await cafeService.uploadLogo(asset)
                        : await cafeService.uploadCover(asset);

                    if (type === 'logo') setLogo(url);
                    else setCover(url);
                } catch (error) {
                    Alert.alert(t('common.error'), t('cafe.form.errorUpload'));
                }
            }
        });
    };

    const handleSubmit = async () => {
        if (!name || !city) {
            Alert.alert(t('common.error'), t('cafe.form.errorFill'));
            return;
        }

        setSubmitting(true);
        const data = {
            name,
            description,
            city,
            address,
            phone,
            email,
            website,
            telegram,
            instagram,
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
            navigation.goBack();
        } catch (error) {
            Alert.alert(t('common.error'), t('cafe.form.errorSave'));
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <LinearGradient colors={['#0a0a14', '#12122b']} style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#F59E0B" />
            </LinearGradient>
        );
    }

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#0a0a14', '#12122b']} style={StyleSheet.absoluteFill} />

            <SafeAreaView style={styles.header} edges={['top']}>
                <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
                    <ArrowLeft size={22} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>
                    {isEditing ? t('cafe.form.editTitle') : t('cafe.form.registerTitle')}
                </Text>
                <View style={{ width: 44 }} />
            </SafeAreaView>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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
                                    <Camera size={32} color="rgba(255,255,255,0.2)" />
                                    <Text style={styles.uploadLabel}>{t('cafe.form.addCover')}</Text>
                                </View>
                            )}
                            <LinearGradient
                                colors={['transparent', 'rgba(10, 10, 20, 0.8)']}
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
                                        <Utensils size={24} color="rgba(255,255,255,0.2)" />
                                    </View>
                                )}
                                <View style={styles.pencilBadge}>
                                    <Pencil size={12} color="#1a1a2e" strokeWidth={3} />
                                </View>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.formContainer}>
                        {/* Basic Info Group */}
                        <View style={styles.glassGroup}>
                            <View style={styles.groupHeader}>
                                <Info size={18} color="#F59E0B" />
                                <Text style={styles.groupTitle}>{t('cafe.form.basicInfo')}</Text>
                            </View>
                            <View style={styles.inputBox}>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder={t('cafe.form.name')}
                                    placeholderTextColor="rgba(255,255,255,0.2)"
                                    value={name}
                                    onChangeText={setName}
                                />
                            </View>
                            <View style={styles.inputBox}>
                                <TextInput
                                    style={[styles.textInput, { height: 100, textAlignVertical: 'top' }]}
                                    placeholder={t('cafe.form.description')}
                                    placeholderTextColor="rgba(255,255,255,0.2)"
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
                                <MapPin size={18} color="#F59E0B" />
                                <Text style={styles.groupTitle}>{t('cafe.form.location')}</Text>
                            </View>
                            <View style={styles.inputBox}>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder={t('cafe.form.city')}
                                    placeholderTextColor="rgba(255,255,255,0.2)"
                                    value={city}
                                    onChangeText={setCity}
                                />
                            </View>
                            <View style={styles.inputBox}>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder={t('cafe.form.address')}
                                    placeholderTextColor="rgba(255,255,255,0.2)"
                                    value={address}
                                    onChangeText={setAddress}
                                />
                            </View>
                        </View>

                        {/* Contact Group */}
                        <View style={styles.glassGroup}>
                            <View style={styles.groupHeader}>
                                <Phone size={18} color="#F59E0B" />
                                <Text style={styles.groupTitle}>{t('cafe.form.contactSocial')}</Text>
                            </View>
                            <View style={styles.inputBox}>
                                <Phone size={16} color="rgba(255,255,255,0.2)" style={styles.innerIcon} />
                                <TextInput
                                    style={styles.textInput}
                                    placeholder={t('cafe.form.phone')}
                                    placeholderTextColor="rgba(255,255,255,0.2)"
                                    value={phone}
                                    onChangeText={setPhone}
                                    keyboardType="phone-pad"
                                />
                            </View>
                            <View style={styles.inputBox}>
                                <Globe size={16} color="rgba(255,255,255,0.2)" style={styles.innerIcon} />
                                <TextInput
                                    style={styles.textInput}
                                    placeholder={t('cafe.form.website')}
                                    placeholderTextColor="rgba(255,255,255,0.2)"
                                    value={website}
                                    onChangeText={setWebsite}
                                    autoCapitalize="none"
                                />
                            </View>
                            <View style={styles.socialRow}>
                                <View style={[styles.inputBox, { flex: 1, marginBottom: 0 }]}>
                                    <MessageCircle size={16} color="rgba(255,255,255,0.2)" style={styles.innerIcon} />
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder="Telegram"
                                        placeholderTextColor="rgba(255,255,255,0.2)"
                                        value={telegram}
                                        onChangeText={setTelegram}
                                        autoCapitalize="none"
                                    />
                                </View>
                                <View style={[styles.inputBox, { flex: 1, marginBottom: 0 }]}>
                                    <Instagram size={16} color="rgba(255,255,255,0.2)" style={styles.innerIcon} />
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder="Instagram"
                                        placeholderTextColor="rgba(255,255,255,0.2)"
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
                                <Truck size={18} color="#F59E0B" />
                                <Text style={styles.groupTitle}>{t('cafe.form.services')}</Text>
                            </View>
                            <View style={styles.switchRow}>
                                <View style={styles.switchInfo}>
                                    <UtensilsCrossed size={16} color="rgba(255,255,255,0.4)" />
                                    <Text style={styles.switchLabel}>{t('cafe.form.dineIn')}</Text>
                                </View>
                                <Switch
                                    value={hasDineIn}
                                    onValueChange={setHasDineIn}
                                    trackColor={{ false: '#1a1a2e', true: '#F59E0B' }}
                                    thumbColor={Platform.OS === 'ios' ? '#fff' : (hasDineIn ? '#fff' : '#444')}
                                />
                            </View>
                            <View style={styles.switchRow}>
                                <View style={styles.switchInfo}>
                                    <ShoppingBag size={16} color="rgba(255,255,255,0.4)" />
                                    <Text style={styles.switchLabel}>{t('cafe.form.takeaway')}</Text>
                                </View>
                                <Switch
                                    value={hasTakeaway}
                                    onValueChange={setHasTakeaway}
                                    trackColor={{ false: '#1a1a2e', true: '#F59E0B' }}
                                    thumbColor={Platform.OS === 'ios' ? '#fff' : (hasTakeaway ? '#fff' : '#444')}
                                />
                            </View>
                            <View style={styles.switchRow}>
                                <View style={styles.switchInfo}>
                                    <Truck size={16} color="rgba(255,255,255,0.4)" />
                                    <Text style={styles.switchLabel}>{t('cafe.form.delivery')}</Text>
                                </View>
                                <Switch
                                    value={hasDelivery}
                                    onValueChange={setHasDelivery}
                                    trackColor={{ false: '#1a1a2e', true: '#F59E0B' }}
                                    thumbColor={Platform.OS === 'ios' ? '#fff' : (hasDelivery ? '#fff' : '#444')}
                                />
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[styles.submitBtn, submitting && styles.disabledBtn]}
                            onPress={handleSubmit}
                            disabled={submitting}
                        >
                            <LinearGradient
                                colors={['#F59E0B', '#D97706']}
                                style={styles.submitGradient}
                            >
                                {submitting ? (
                                    <ActivityIndicator color="#1a1a2e" />
                                ) : (
                                    <Text style={styles.submitBtnText}>
                                        {isEditing ? t('cafe.form.saveChanges') : t('cafe.form.createBtn')}
                                    </Text>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
};

const styles = StyleSheet.create({
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
        backgroundColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    headerTitle: {
        color: '#fff',
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
        backgroundColor: 'rgba(255,255,255,0.03)',
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
        color: 'rgba(255,255,255,0.4)',
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
        backgroundColor: '#1a1a2e',
        borderWidth: 4,
        borderColor: '#0a0a14',
        shadowColor: '#000',
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
        backgroundColor: 'rgba(255,255,255,0.03)',
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
        backgroundColor: '#F59E0B',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#0a0a14',
    },
    formContainer: {
        paddingHorizontal: 20,
    },
    glassGroup: {
        backgroundColor: 'rgba(25, 25, 45, 0.5)',
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        marginBottom: 20,
    },
    groupHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 20,
    },
    groupTitle: {
        color: '#fff',
        fontSize: 16,
        fontFamily: 'Cinzel-Bold',
    },
    inputBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 16,
        paddingHorizontal: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    innerIcon: {
        marginRight: 12,
    },
    textInput: {
        flex: 1,
        height: 52,
        color: '#fff',
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
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    switchInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    switchLabel: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 15,
        fontWeight: '600',
    },
    submitBtn: {
        borderRadius: 20,
        overflow: 'hidden',
        marginTop: 10,
        shadowColor: '#F59E0B',
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
        color: '#1a1a2e',
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
