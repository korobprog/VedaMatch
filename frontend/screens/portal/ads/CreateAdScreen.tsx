import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Image, Switch, Alert, ActivityIndicator, useColorScheme } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { launchImageLibrary, Asset } from 'react-native-image-picker';
import DatePicker from 'react-native-date-picker';
import { ModernVedicTheme as vedicTheme } from '../../../theme/ModernVedicTheme';
import { adsService } from '../../../services/adsService';
import { channelService } from '../../../services/channelService';
import { getServices, Service } from '../../../services/serviceService';
import { AdTabSwitcher } from '../../../components/ads/AdTabSwitcher';
import { AdCategory, AdType, AdPhoto } from '../../../types/ads';
import { Channel } from '../../../types/channel';
import { ProtectedScreen } from '../../../components/ProtectedScreen';
import { CategoryPills } from '../../../components/ads/CategoryPills';
import { FestivalPreacherPickerModal } from '../../../components/ads/FestivalPreacherPickerModal';
import { FestivalServicePickerModal } from '../../../components/ads/FestivalServicePickerModal';
import { useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../../types/navigation';
import { getMediaUrl } from '../../../utils/url';
import { Plus, X } from 'lucide-react-native';
import { KeyboardAwareContainer } from '../../../components/ui/KeyboardAwareContainer';

export const CreateAdScreen: React.FC = () => {
    const { t, i18n } = useTranslation();
    const navigation = useNavigation();
    const route = useRoute<RouteProp<RootStackParamList, 'CreateAd'>>();
    const adId = route.params?.adId;
    const initialCategory = route.params?.initialCategory;
    const isFestivalPresetCreate = !adId && initialCategory === 'events';

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

    const [festivalStartAt, setFestivalStartAt] = useState<Date>(new Date());
    const [festivalEndAt, setFestivalEndAt] = useState<Date>(new Date(Date.now() + 2 * 60 * 60 * 1000));
    const [hasFestivalEndAt, setHasFestivalEndAt] = useState(false);
    const [festivalTimezone, setFestivalTimezone] = useState('Europe/Moscow');
    const [organizerName, setOrganizerName] = useState('');
    const [organizerContact, setOrganizerContact] = useState('');
    const [venueName, setVenueName] = useState('');
    const [venueAddress, setVenueAddress] = useState('');
    const [preacherChannelIds, setPreacherChannelIds] = useState<number[]>([]);
    const [linkedServiceIds, setLinkedServiceIds] = useState<number[]>([]);
    const [sadhuChannels, setSadhuChannels] = useState<Channel[]>([]);
    const [eventServices, setEventServices] = useState<Service[]>([]);
    const [preacherPickerVisible, setPreacherPickerVisible] = useState(false);
    const [servicePickerVisible, setServicePickerVisible] = useState(false);
    const [startPickerOpen, setStartPickerOpen] = useState(false);
    const [endPickerOpen, setEndPickerOpen] = useState(false);
    const [festivalRefsLoading, setFestivalRefsLoading] = useState(false);

    const loadExistingAd = React.useCallback(async () => {
        if (!adId) {
            return;
        }
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
            if (ad.festivalStartAt) {
                const start = new Date(ad.festivalStartAt);
                if (!Number.isNaN(start.getTime())) {
                    setFestivalStartAt(start);
                }
            }
            if (ad.festivalEndAt) {
                const end = new Date(ad.festivalEndAt);
                if (!Number.isNaN(end.getTime())) {
                    setFestivalEndAt(end);
                    setHasFestivalEndAt(true);
                }
            }
            setFestivalTimezone(ad.festivalTimezone || 'Europe/Moscow');
            setOrganizerName(ad.organizerName || '');
            setOrganizerContact(ad.organizerContact || '');
            setVenueName(ad.venueName || '');
            setVenueAddress(ad.venueAddress || '');
            setPreacherChannelIds(ad.preacherChannelIds || []);
            setLinkedServiceIds(ad.linkedServiceIds || []);
        } catch {
            Alert.alert('Error', 'Failed to load ad data');
        } finally {
            setLoading(false);
        }
    }, [adId]);

    React.useEffect(() => {
        if (adId) {
            void loadExistingAd();
        }
    }, [adId, loadExistingAd]);

    React.useEffect(() => {
        if (!adId && initialCategory === 'events') {
            setCategory('events');
            setAdType('offering');
        }
    }, [adId, initialCategory]);

    const loadFestivalReferences = React.useCallback(async () => {
        if (festivalRefsLoading) {
            return;
        }
        try {
            setFestivalRefsLoading(true);
            const [channelsResponse, servicesResponse] = await Promise.all([
                channelService.getChannels({ page: 1, limit: 200, sadhuSanga: true }),
                getServices({ page: 1, limit: 200 }),
            ]);

            const channels = channelsResponse.channels || [];
            const services = (servicesResponse.services || []).filter((service) => {
                const raw = String(service.formats || '').toLowerCase();
                return raw.includes('event');
            });

            setSadhuChannels(channels);
            setEventServices(services);
        } catch (error) {
            console.error('Failed to load festival references', error);
        } finally {
            setFestivalRefsLoading(false);
        }
    }, [festivalRefsLoading]);

    React.useEffect(() => {
        if (category === 'events') {
            void loadFestivalReferences();
        }
    }, [category, loadFestivalReferences]);

    const autoPreacherChannelIds = React.useMemo(() => {
        if (linkedServiceIds.length === 0 || eventServices.length === 0 || sadhuChannels.length === 0) {
            return [] as number[];
        }

        const ownerToChannel = new Map<number, number>();
        sadhuChannels.forEach((channel) => {
            if (!ownerToChannel.has(channel.ownerId)) {
                ownerToChannel.set(channel.ownerId, channel.ID);
            }
        });

        const serviceMap = new Map<number, Service>();
        eventServices.forEach((service) => {
            serviceMap.set(service.id, service);
        });

        const out = new Set<number>();
        linkedServiceIds.forEach((serviceId) => {
            const service = serviceMap.get(serviceId);
            if (!service) {
                return;
            }
            const channelId = ownerToChannel.get(service.ownerId);
            if (channelId) {
                out.add(channelId);
            }
        });

        return Array.from(out);
    }, [eventServices, linkedServiceIds, sadhuChannels]);

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
        if (!description.trim() || description.length < 20) return Alert.alert('Error', 'Description too short (min 20 chars)');
        if (!city.trim()) return Alert.alert('Error', 'City required');
        if (category === 'events' && hasFestivalEndAt && festivalEndAt.getTime() < festivalStartAt.getTime()) {
            return Alert.alert('Error', 'Festival end time must be after start time');
        }

        setLoading(true);
        try {
            // Upload new photos
            const photoUrls: string[] = existingPhotos.map(p => p.photoUrl);
            for (const photo of photos) {
                const url = await adsService.uploadPhoto(photo);
                photoUrls.push(url);
            }

            const normalizedManualPreachers = Array.from(new Set(preacherChannelIds)).slice(0, 20);
            const normalizedLinkedServices = Array.from(new Set(linkedServiceIds)).slice(0, 20);

            const adData = {
                adType, category, title, description,
                price: isFree ? 0 : parseFloat(price) || 0,
                currency: 'RUB', isFree, isNegotiable,
                city, showProfile, phone: contactPhone,
                photos: photoUrls,
                festivalStartAt: category === 'events' ? festivalStartAt.toISOString() : undefined,
                festivalEndAt: category === 'events' && hasFestivalEndAt ? festivalEndAt.toISOString() : undefined,
                festivalTimezone: category === 'events' ? (festivalTimezone || 'Europe/Moscow') : undefined,
                organizerName: category === 'events' ? organizerName : undefined,
                organizerContact: category === 'events' ? organizerContact : undefined,
                venueName: category === 'events' ? venueName : undefined,
                venueAddress: category === 'events' ? venueAddress : undefined,
                preacherChannelIds: category === 'events' ? normalizedManualPreachers : undefined,
                linkedServiceIds: category === 'events' ? normalizedLinkedServices : undefined,
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

    const manualPreacherNames = React.useMemo(() => {
        if (!sadhuChannels.length || !preacherChannelIds.length) {
            return '';
        }
        const names = sadhuChannels
            .filter((channel) => preacherChannelIds.includes(channel.ID))
            .map((channel) => channel.title)
            .filter(Boolean);
        return names.join(', ');
    }, [preacherChannelIds, sadhuChannels]);

    const linkedServiceNames = React.useMemo(() => {
        if (!eventServices.length || !linkedServiceIds.length) {
            return '';
        }
        const names = eventServices
            .filter((service) => linkedServiceIds.includes(service.id))
            .map((service) => service.title)
            .filter(Boolean);
        return names.join(', ');
    }, [eventServices, linkedServiceIds]);

    return (
        <ProtectedScreen>
            <View style={{ flex: 1, backgroundColor: isDarkMode ? '#1a1a1a' : colors.background }}>
                <KeyboardAwareContainer style={{ flex: 1 }}>
                <ScrollView
                    contentContainerStyle={styles.container}
                    keyboardShouldPersistTaps="handled"
                >
                    <Text style={[styles.headerTitle, { color: isDarkMode ? '#fff' : colors.text }]}>{t('ads.create.title')}</Text>

                    {!isFestivalPresetCreate && (
                        <AdTabSwitcher activeTab={adType} onTabChange={setAdType} />
                    )}

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
                        {isFestivalPresetCreate ? (
                            <View style={[styles.presetCategoryPill, { borderColor: colors.primary, backgroundColor: colors.primary + '12' }]}>
                                <Text style={[styles.presetCategoryText, { color: colors.primary }]}>
                                    {t('ads.categories.events')}
                                </Text>
                            </View>
                        ) : (
                            <CategoryPills selectedCategory={category} onSelectCategory={(c) => c !== 'all' && setCategory(c)} />
                        )}

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
                            value={description} onChangeText={setDescription} multiline numberOfLines={4} placeholder="Description (min 20 chars)" placeholderTextColor={colors.textSecondary}
                        />
                    </View>

                    {category === 'events' && (
                        <View style={styles.section}>
                            <Text style={[styles.label, { color: colors.textSecondary }]}>
                                {t('ads.festivals.eventBlockTitle')}
                            </Text>

                            <TouchableOpacity
                                style={[styles.input, styles.pickerField, { backgroundColor: isDarkMode ? '#333' : '#fff' }]}
                                onPress={() => setStartPickerOpen(true)}
                            >
                                <Text style={{ color: isDarkMode ? '#fff' : colors.text }}>
                                    {t('ads.festivals.startAt')}: {festivalStartAt.toLocaleString(i18n.language === 'ru' ? 'ru-RU' : i18n.language === 'hi' ? 'hi-IN' : 'en-US')}
                                </Text>
                            </TouchableOpacity>

                            <View style={styles.row}>
                                <Text style={{ color: isDarkMode ? '#ddd' : colors.text }}>{t('ads.festivals.hasEndAt')}</Text>
                                <Switch
                                    value={hasFestivalEndAt}
                                    onValueChange={setHasFestivalEndAt}
                                    trackColor={{ false: '#767577', true: colors.primary }}
                                />
                            </View>

                            {hasFestivalEndAt && (
                                <TouchableOpacity
                                    style={[styles.input, styles.pickerField, { backgroundColor: isDarkMode ? '#333' : '#fff' }]}
                                    onPress={() => setEndPickerOpen(true)}
                                >
                                    <Text style={{ color: isDarkMode ? '#fff' : colors.text }}>
                                        {t('ads.festivals.endAt')}: {festivalEndAt.toLocaleString(i18n.language === 'ru' ? 'ru-RU' : i18n.language === 'hi' ? 'hi-IN' : 'en-US')}
                                    </Text>
                                </TouchableOpacity>
                            )}

                            <TextInput
                                style={[styles.input, { backgroundColor: isDarkMode ? '#333' : '#fff', color: isDarkMode ? '#fff' : colors.text, marginTop: 10 }]}
                                value={festivalTimezone}
                                onChangeText={setFestivalTimezone}
                                placeholder="Europe/Moscow"
                                placeholderTextColor={colors.textSecondary}
                            />

                            <TextInput
                                style={[styles.input, { backgroundColor: isDarkMode ? '#333' : '#fff', color: isDarkMode ? '#fff' : colors.text, marginTop: 10 }]}
                                value={organizerName}
                                onChangeText={setOrganizerName}
                                placeholder={t('ads.festivals.organizerName')}
                                placeholderTextColor={colors.textSecondary}
                            />

                            <TextInput
                                style={[styles.input, { backgroundColor: isDarkMode ? '#333' : '#fff', color: isDarkMode ? '#fff' : colors.text, marginTop: 10 }]}
                                value={organizerContact}
                                onChangeText={setOrganizerContact}
                                placeholder={t('ads.festivals.organizerContact')}
                                placeholderTextColor={colors.textSecondary}
                            />

                            <TextInput
                                style={[styles.input, { backgroundColor: isDarkMode ? '#333' : '#fff', color: isDarkMode ? '#fff' : colors.text, marginTop: 10 }]}
                                value={venueName}
                                onChangeText={setVenueName}
                                placeholder={t('ads.festivals.venueName')}
                                placeholderTextColor={colors.textSecondary}
                            />

                            <TextInput
                                style={[styles.input, { backgroundColor: isDarkMode ? '#333' : '#fff', color: isDarkMode ? '#fff' : colors.text, marginTop: 10 }]}
                                value={venueAddress}
                                onChangeText={setVenueAddress}
                                placeholder={t('ads.festivals.venueAddress')}
                                placeholderTextColor={colors.textSecondary}
                            />

                            <TouchableOpacity
                                style={[styles.selectButton, { borderColor: colors.primary }]}
                                onPress={() => {
                                    void loadFestivalReferences();
                                    setPreacherPickerVisible(true);
                                }}
                            >
                                <Text style={{ color: colors.primary, fontWeight: '700' }}>
                                    {t('ads.festivals.pickPreachers')} ({preacherChannelIds.length})
                                </Text>
                            </TouchableOpacity>
                            {manualPreacherNames ? (
                                <Text style={[styles.selectedText, { color: colors.textSecondary }]} numberOfLines={2}>
                                    {manualPreacherNames}
                                </Text>
                            ) : null}

                            <TouchableOpacity
                                style={[styles.selectButton, { borderColor: colors.primary, marginTop: 10 }]}
                                onPress={() => {
                                    void loadFestivalReferences();
                                    setServicePickerVisible(true);
                                }}
                            >
                                <Text style={{ color: colors.primary, fontWeight: '700' }}>
                                    {t('ads.festivals.pickLinkedServices')} ({linkedServiceIds.length})
                                </Text>
                            </TouchableOpacity>
                            {linkedServiceNames ? (
                                <Text style={[styles.selectedText, { color: colors.textSecondary }]} numberOfLines={2}>
                                    {linkedServiceNames}
                                </Text>
                            ) : null}

                            {autoPreacherChannelIds.length > 0 ? (
                                <Text style={[styles.helperText, { color: colors.textSecondary }]}>
                                    {t('ads.festivals.autoPreachers')}: {autoPreacherChannelIds.length}
                                </Text>
                            ) : null}
                        </View>
                    )}

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

                <DatePicker
                    modal
                    open={startPickerOpen}
                    date={festivalStartAt}
                    mode="datetime"
                    onConfirm={(date) => {
                        setFestivalStartAt(date);
                        setStartPickerOpen(false);
                    }}
                    onCancel={() => setStartPickerOpen(false)}
                />

                <DatePicker
                    modal
                    open={endPickerOpen}
                    date={festivalEndAt}
                    mode="datetime"
                    onConfirm={(date) => {
                        setFestivalEndAt(date);
                        setEndPickerOpen(false);
                    }}
                    onCancel={() => setEndPickerOpen(false)}
                />

                <FestivalPreacherPickerModal
                    visible={preacherPickerVisible}
                    channels={sadhuChannels}
                    selectedIds={preacherChannelIds}
                    onClose={() => setPreacherPickerVisible(false)}
                    onApply={(ids) => {
                        setPreacherChannelIds(ids.slice(0, 20));
                        setPreacherPickerVisible(false);
                    }}
                />

                <FestivalServicePickerModal
                    visible={servicePickerVisible}
                    services={eventServices}
                    selectedIds={linkedServiceIds}
                    onClose={() => setServicePickerVisible(false)}
                    onApply={(ids) => {
                        setLinkedServiceIds(ids.slice(0, 20));
                        setServicePickerVisible(false);
                    }}
                />
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
    presetCategoryPill: {
        borderWidth: 1,
        borderRadius: 24,
        paddingHorizontal: 14,
        paddingVertical: 10,
        alignSelf: 'flex-start',
    },
    presetCategoryText: {
        fontSize: 14,
        fontWeight: '700',
    },
    pickerField: { justifyContent: 'center' },
    textArea: { minHeight: 100, textAlignVertical: 'top' },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 8 },
    selectButton: {
        borderWidth: 1,
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 12,
    },
    selectedText: {
        marginTop: 6,
        fontSize: 12,
        lineHeight: 17,
    },
    helperText: {
        marginTop: 8,
        fontSize: 12,
    },
    publishBtn: { padding: 16, borderRadius: 30, alignItems: 'center', marginTop: 20, elevation: 6 },
    publishText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
