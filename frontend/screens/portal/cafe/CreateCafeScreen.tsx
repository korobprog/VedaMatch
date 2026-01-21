import React, { useState, useEffect, useRef } from 'react';
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
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../../types/navigation';
import { ArrowLeft, Camera, Utensils, Pencil } from 'lucide-react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { cafeService } from '../../../services/cafeService';

type CreateCafeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'CreateCafe'>;

const CreateCafeScreen = () => {
    const navigation = useNavigation<CreateCafeScreenNavigationProp>();
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
            quality: 0.8,
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
                Alert.alert(t('common.success'), t('cafe.form.successUpdate'));
            } else {
                await cafeService.createCafe(data);
                Alert.alert(t('common.success'), t('cafe.form.successCreate'));
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
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FF6B6B" />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.container}
        >
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{isEditing ? t('cafe.form.editTitle') : t('cafe.form.registerTitle')}</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Cover Image */}
                <TouchableOpacity
                    style={styles.coverUpload}
                    onPress={() => handlePickImage('cover')}
                >
                    {cover ? (
                        <Image source={{ uri: cafeService.getImageUrl(cover) }} style={styles.coverImage} />
                    ) : (
                        <View style={styles.uploadPlaceholder}>
                            <Camera size={40} color="#999" />
                            <Text style={styles.uploadText}>{t('cafe.form.addCover')}</Text>
                        </View>
                    )}
                </TouchableOpacity>

                {/* Logo Image */}
                <View style={styles.logoContainer}>
                    <TouchableOpacity
                        style={styles.logoUpload}
                        onPress={() => handlePickImage('logo')}
                    >
                        {logo ? (
                            <Image source={{ uri: cafeService.getImageUrl(logo) }} style={styles.logoImage} />
                        ) : (
                            <View style={styles.logoPlaceholder}>
                                <Utensils size={30} color="#999" />
                            </View>
                        )}
                        <View style={styles.editBadge}>
                            <Pencil size={12} color="#FFF" />
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Basic Info */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('cafe.form.basicInfo')}</Text>
                    <TextInput
                        style={styles.input}
                        placeholder={t('cafe.form.name')}
                        value={name}
                        onChangeText={setName}
                    />
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder={t('cafe.form.description')}
                        value={description}
                        onChangeText={setDescription}
                        multiline
                        numberOfLines={4}
                    />
                </View>

                {/* Location */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('cafe.form.location')}</Text>
                    <TextInput
                        style={styles.input}
                        placeholder={t('cafe.form.city')}
                        value={city}
                        onChangeText={setCity}
                    />
                    <TextInput
                        style={styles.input}
                        placeholder={t('cafe.form.address')}
                        value={address}
                        onChangeText={setAddress}
                    />
                </View>

                {/* Contact */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('cafe.form.contactSocial')}</Text>
                    <TextInput
                        style={styles.input}
                        placeholder={t('cafe.form.phone')}
                        value={phone}
                        onChangeText={setPhone}
                        keyboardType="phone-pad"
                    />
                    <TextInput
                        style={styles.input}
                        placeholder={t('cafe.form.email')}
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />
                    <TextInput
                        style={styles.input}
                        placeholder={t('cafe.form.website')}
                        value={website}
                        onChangeText={setWebsite}
                        autoCapitalize="none"
                    />
                </View>

                {/* Services */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('cafe.form.services')}</Text>
                    <View style={styles.switchRow}>
                        <Text style={styles.switchLabel}>{t('cafe.form.dineIn')}</Text>
                        <Switch value={hasDineIn} onValueChange={setHasDineIn} color="#FF6B6B" />
                    </View>
                    <View style={styles.switchRow}>
                        <Text style={styles.switchLabel}>{t('cafe.form.takeaway')}</Text>
                        <Switch value={hasTakeaway} onValueChange={setHasTakeaway} color="#FF6B6B" />
                    </View>
                    <View style={styles.switchRow}>
                        <Text style={styles.switchLabel}>{t('cafe.form.delivery')}</Text>
                        <Switch value={hasDelivery} onValueChange={setHasDelivery} color="#FF6B6B" />
                    </View>
                </View>

                <TouchableOpacity
                    style={[styles.submitButton, submitting && styles.disabledButton]}
                    onPress={handleSubmit}
                    disabled={submitting}
                >
                    {submitting ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <Text style={styles.submitButtonText}>
                            {isEditing ? t('cafe.form.saveChanges') : t('cafe.form.createBtn')}
                        </Text>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        paddingTop: Platform.OS === 'ios' ? 50 : 16,
        backgroundColor: '#FFF',
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: 16,
        color: '#333',
    },
    scrollContent: {
        paddingBottom: 40,
    },
    coverUpload: {
        height: 180,
        backgroundColor: '#E9ECEF',
        width: '100%',
    },
    coverImage: {
        width: '100%',
        height: '100%',
    },
    uploadPlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    uploadText: {
        marginTop: 8,
        color: '#999',
        fontSize: 14,
    },
    logoContainer: {
        alignItems: 'center',
        marginTop: -40,
        marginBottom: 20,
    },
    logoUpload: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#FFF',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#FFF',
    },
    logoImage: {
        width: '100%',
        height: '100%',
        borderRadius: 40,
    },
    logoPlaceholder: {
        width: '100%',
        height: '100%',
        borderRadius: 40,
        backgroundColor: '#F1F3F5',
        justifyContent: 'center',
        alignItems: 'center',
    },
    editBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#FF6B6B',
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFF',
    },
    section: {
        padding: 16,
        backgroundColor: '#FFF',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 16,
    },
    input: {
        backgroundColor: '#F8F9FA',
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
        fontSize: 15,
        color: '#333',
        borderWidth: 1,
        borderColor: '#E9ECEF',
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    switchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F3F5',
    },
    switchLabel: {
        fontSize: 15,
        color: '#444',
    },
    submitButton: {
        backgroundColor: '#FF6B6B',
        margin: 16,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        elevation: 2,
    },
    disabledButton: {
        backgroundColor: '#FFA8A8',
    },
    submitButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default CreateCafeScreen;
