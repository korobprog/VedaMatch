import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Image, Switch, Alert, ActivityIndicator, useColorScheme } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { launchImageLibrary, Asset } from 'react-native-image-picker';
import { ModernVedicTheme as vedicTheme } from '../../../theme/ModernVedicTheme';
import { adsService } from '../../../services/adsService';
import { AdTabSwitcher } from '../../../components/ads/AdTabSwitcher';
import { AdCard } from '../../../components/ads/AdCard';
import { AdCategory, AdType, AdPhoto } from '../../../types/ads';
import { ProtectedScreen } from '../../../components/ProtectedScreen';
import { CategoryPills } from '../../../components/ads/CategoryPills';
import { useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../../types/navigation';
import { getMediaUrl } from '../../../utils/url';
import { Plus, X, Search, Package, Image as ImageIcon, Camera } from 'lucide-react-native';
import { KeyboardAwareContainer } from '../../../components/ui/KeyboardAwareContainer';

export const CreateAdScreen: React.FC = () => {
    const { t } = useTranslation();
    const navigation = useNavigation();
    const route = useRoute<RouteProp<RootStackParamList, 'CreateAd'>>();
    const adId = (route.params as any)?.adId;

    const isDarkMode = useColorScheme() === 'dark';
    const colors = vedicTheme.colors;

    const [loading, setLoading] = useState(false);
    const [adType, setAdType] = useState<AdType>('offering');
    const [category, setCategory] = useState<AdCategory>('goods');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState('');
    const [isFree, setIsFree] = useState(false);
    const [isNegotiable, setIsNegotiable] = useState(false);
    const [city, setCity] = useState('');
    const [showProfile, setShowProfile] = useState(true);
    const [contactPhone, setContactPhone] = useState('');
    const [photos, setPhotos] = useState<Asset[]>([]);
    const [existingPhotos, setExistingPhotos] = useState<AdPhoto[]>([]);

    React.useEffect(() => {
        if (adId) {
            loadExistingAd();
        }
    }, [adId]);

    const loadExistingAd = async () => {
        try {
            setLoading(true);
            const ad = await adsService.getAd(adId);
            setAdType(ad.adType);
            setCategory(ad.category);
            setTitle(ad.title);
            setDescription(ad.description);
            setPrice(ad.price?.toString() || '');
            setIsFree(ad.isFree);
            setIsNegotiable(ad.isNegotiable);
            setCity(ad.city);
            setShowProfile(ad.showProfile);
            setContactPhone(ad.phone || '');
            setExistingPhotos(ad.photos || []);
        } catch (error) {
            Alert.alert('Error', 'Failed to load ad data');
        } finally {
            setLoading(false);
        }
    };

    const handleImagePick = async () => {
        if (photos.length >= 5) {
            Alert.alert('Limit reached', 'Maximum 5 photos allowed');
            return;
        }
        const result = await launchImageLibrary({ mediaType: 'photo', selectionLimit: 5 - photos.length, quality: 0.8 });
        if (result.assets) {
            const newAssets = result.assets;
            setPhotos(prev => [...prev, ...newAssets]);
        }
    };

    const handleSubmit = async () => {
        if (!title.trim() || title.length < 5) return Alert.alert('Error', 'Title too short');
        if (!description.trim() || description.length < 10) return Alert.alert('Error', 'Description too short (min 10 chars)');
        if (!city.trim()) return Alert.alert('Error', 'City required');

        setLoading(true);
        try {
            // Upload new photos
            const photoUrls: string[] = existingPhotos.map(p => p.photoUrl);
            for (const photo of photos) {
                const url = await adsService.uploadPhoto(photo);
                photoUrls.push(url);
            }

            const adData = {
                adType, category, title, description,
                price: isFree ? 0 : parseFloat(price) || 0,
                currency: 'RUB', isFree, isNegotiable,
                city, showProfile, phone: contactPhone,
                photos: photoUrls
            };

            if (adId) {
                await adsService.updateAd(adId, adData);
            } else {
                await adsService.createAd(adData);
            }

            Alert.alert('Success', adId ? 'Ad updated successfully' : t('ads.create.success'), [{ text: 'OK', onPress: () => navigation.goBack() }]);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to create ad');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ProtectedScreen>
            <View style={{ flex: 1, backgroundColor: isDarkMode ? '#1a1a1a' : colors.background }}>
                <KeyboardAwareContainer style={{ flex: 1 }}>
                <ScrollView
                    contentContainerStyle={styles.container}
                    keyboardShouldPersistTaps="handled"
                >
                    <Text style={[styles.headerTitle, { color: isDarkMode ? '#fff' : colors.text }]}>{t('ads.create.title')}</Text>

                    <AdTabSwitcher activeTab={adType} onTabChange={setAdType} />

                    <View style={styles.section}>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>{t('ads.create.photos')}</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoList}>
                            <TouchableOpacity style={[styles.addPhotoBtn, { borderColor: colors.primary }]} onPress={handleImagePick}>
                                <Plus size={32} color={colors.primary} />
                            </TouchableOpacity>
                            {existingPhotos.map((p, i) => (
                                <View key={`ext-${i}`} style={styles.photoContainer}>
                                    <Image source={{ uri: getMediaUrl(p.photoUrl) || '' }} style={styles.photoThumb} />
                                    <TouchableOpacity style={styles.removePhoto} onPress={() => setExistingPhotos(prev => prev.filter((_, idx) => idx !== i))}>
                                        <X size={12} color="#fff" />
                                    </TouchableOpacity>
                                </View>
                            ))}
                            {photos.map((p, i) => (
                                <View key={`new-${i}`} style={styles.photoContainer}>
                                    <Image source={{ uri: p.uri }} style={styles.photoThumb} />
                                    <TouchableOpacity style={styles.removePhoto} onPress={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))}>
                                        <X size={12} color="#fff" />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </ScrollView>
                    </View>

                    <View style={styles.section}>
                        <CategoryPills selectedCategory={category} onSelectCategory={(c) => c !== 'all' && setCategory(c)} />

                        <Text style={[styles.label, { color: colors.textSecondary, marginTop: 16 }]}>{t('ads.create.adTitle')}</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: isDarkMode ? '#333' : '#fff', color: isDarkMode ? '#fff' : colors.text }]}
                            value={title} onChangeText={setTitle} placeholder="Title" placeholderTextColor={colors.textSecondary}
                        />

                        <Text style={[styles.label, { color: colors.textSecondary, marginTop: 16 }]}>
                            {t('ads.create.description')} ({description.length}/10)
                        </Text>
                        <TextInput
                            style={[styles.input, styles.textArea, { backgroundColor: isDarkMode ? '#333' : '#fff', color: isDarkMode ? '#fff' : colors.text }]}
                            value={description} onChangeText={setDescription} multiline numberOfLines={4} placeholder="Description (min 10 chars)" placeholderTextColor={colors.textSecondary}
                        />
                    </View>

                    <View style={styles.section}>
                        <View style={styles.row}>
                            <Text style={{ color: isDarkMode ? '#ddd' : colors.text }}>{t('ads.price.free')}</Text>
                            <Switch value={isFree} onValueChange={setIsFree} trackColor={{ false: '#767577', true: colors.primary }} />
                        </View>
                        {!isFree && (
                            <TextInput
                                style={[styles.input, { backgroundColor: isDarkMode ? '#333' : '#fff', color: isDarkMode ? '#fff' : colors.text }]}
                                value={price} onChangeText={setPrice} keyboardType="numeric" placeholder="Price" placeholderTextColor={colors.textSecondary}
                            />
                        )}
                    </View>

                    <View style={styles.section}>
                        <TextInput
                            style={[styles.input, { backgroundColor: isDarkMode ? '#333' : '#fff', color: isDarkMode ? '#fff' : colors.text }]}
                            value={city} onChangeText={setCity} placeholder="City" placeholderTextColor={colors.textSecondary}
                        />
                        <View style={styles.row}>
                            <Text style={{ color: isDarkMode ? '#ddd' : colors.text }}>{t('ads.create.useProfile')}</Text>
                            <Switch value={showProfile} onValueChange={setShowProfile} trackColor={{ false: '#767577', true: colors.primary }} />
                        </View>
                    </View>

                    <TouchableOpacity style={[styles.publishBtn, { backgroundColor: colors.gradientStart }]} onPress={handleSubmit} disabled={loading}>
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.publishText}>{adId ? 'Save Changes' : t('ads.create.publish')}</Text>}
                    </TouchableOpacity>
                </ScrollView>
                </KeyboardAwareContainer>
            </View>
        </ProtectedScreen>
    );
};

const styles = StyleSheet.create({
    container: { padding: 16, paddingBottom: 40 },
    headerTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    section: { marginBottom: 24 },
    label: { fontSize: 14, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase' },
    photoList: { flexDirection: 'row' },
    addPhotoBtn: { width: 80, height: 80, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
    photoContainer: { position: 'relative', marginRight: 10 },
    photoThumb: { width: 80, height: 80, borderRadius: 12 },
    removePhoto: { position: 'absolute', top: -5, right: -5, backgroundColor: 'red', width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    input: { borderRadius: 12, padding: 12, fontSize: 16, borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)' },
    textArea: { minHeight: 100, textAlignVertical: 'top' },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 8 },
    publishBtn: { padding: 16, borderRadius: 30, alignItems: 'center', marginTop: 20, elevation: 6 },
    publishText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
