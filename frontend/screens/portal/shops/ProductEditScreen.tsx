import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
    Image, Switch, Alert, ActivityIndicator, Modal
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { launchImageLibrary, Asset } from 'react-native-image-picker';
import { marketService } from '../../../services/marketService';
import { ProductType, ProductCategory, ProductCategoryConfig, VariantFormData, Product } from '../../../types/market';
import { ProtectedScreen } from '../../../components/ProtectedScreen';
import { getMediaUrl } from '../../../utils/url';
import { useUser } from '../../../context/UserContext';
import { useSettings } from '../../../context/SettingsContext';
import { useRoleTheme } from '../../../hooks/useRoleTheme';

type RouteParams = {
    ProductEdit: { productId?: number };
};

export const ProductEditScreen: React.FC = () => {
    const { t, i18n } = useTranslation();
    const navigation = useNavigation();
    const route = useRoute<RouteProp<RouteParams, 'ProductEdit'>>();
    const productId = route.params?.productId;
    const isEditing = !!productId;
    const currentLang = i18n.language === 'ru' ? 'ru' : 'en';

    const { user } = useUser();
    const { isDarkMode } = useSettings();
    const { colors } = useRoleTheme(user?.role, isDarkMode);
    const accent = colors.accent;
    const textPrimary = colors.textPrimary;
    const textSecondary = colors.textSecondary;
    const surface = colors.surface;
    const surfaceElevated = colors.surfaceElevated;

    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(isEditing);
    const [categories, setCategories] = useState<ProductCategoryConfig[]>([]);

    // Form state
    const [name, setName] = useState('');
    const [shortDescription, setShortDescription] = useState('');
    const [fullDescription, setFullDescription] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<ProductCategory>('other');
    const [productType, setProductType] = useState<ProductType>('physical');
    const [basePrice, setBasePrice] = useState('');
    const [salePrice, setSalePrice] = useState('');
    const [stock, setStock] = useState('');
    const [trackStock, setTrackStock] = useState(true);
    const [digitalUrl, setDigitalUrl] = useState('');
    const [weight, setWeight] = useState('');
    const [dimensions, setDimensions] = useState('');

    // Images
    const [mainImage, setMainImage] = useState<Asset | null>(null);
    const [existingMainImage, setExistingMainImage] = useState<string>('');
    const [additionalImages, setAdditionalImages] = useState<Asset[]>([]);
    const [existingImages, setExistingImages] = useState<string[]>([]);

    // Variants
    const [hasVariants, setHasVariants] = useState(false);
    const [variants, setVariants] = useState<VariantFormData[]>([]);
    const [showVariantModal, setShowVariantModal] = useState(false);
    const [editingVariantIndex, setEditingVariantIndex] = useState<number | null>(null);

    // Variant form
    const [variantName, setVariantName] = useState('');
    const [variantSku, setVariantSku] = useState('');
    const [variantPrice, setVariantPrice] = useState('');
    const [variantStock, setVariantStock] = useState('');
    const [variantAttributes, setVariantAttributes] = useState<Record<string, string>>({});

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            // Load categories
            const cats = await marketService.getProductCategories();
            setCategories(cats);

            if (isEditing && productId) {
                setInitialLoading(true);
                const product = await marketService.getProduct(productId);
                populateForm(product);
            }
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setInitialLoading(false);
        }
    };

    const populateForm = (product: Product) => {
        setName(product.name);
        setShortDescription(product.shortDescription || '');
        setFullDescription(product.fullDescription || '');
        setSelectedCategory(product.category);
        setProductType(product.productType);
        setBasePrice(product.basePrice.toString());
        setSalePrice(product.salePrice?.toString() || '');
        setStock(product.stock.toString());
        setTrackStock(product.trackStock);
        setDigitalUrl(product.digitalUrl || '');
        setWeight(product.weight?.toString() || '');
        setDimensions(product.dimensions || '');

        if (product.mainImageUrl) {
            setExistingMainImage(product.mainImageUrl);
        }
        if (product.images && product.images.length > 0) {
            setExistingImages(product.images.map(img => img.imageUrl));
        }
        if (product.variants && product.variants.length > 0) {
            setHasVariants(true);
            setVariants(product.variants.map(v => ({
                sku: v.sku,
                name: v.name,
                price: v.price,
                salePrice: v.salePrice,
                stock: v.stock,
                imageUrl: v.imageUrl,
                attributes: (v.attributes && v.attributes !== 'undefined' && v.attributes !== 'null') ? JSON.parse(v.attributes) : {},
            })));
        }
    };

    const handlePickMainImage = async () => {
        const result = await launchImageLibrary({ mediaType: 'photo', selectionLimit: 1, quality: 0.8 });
        if (result.assets && result.assets[0]) {
            setMainImage(result.assets[0]);
            setExistingMainImage('');
        }
    };

    const handlePickAdditionalImages = async () => {
        if (additionalImages.length + existingImages.length >= 5) {
            Alert.alert('Limit', 'Maximum 5 additional images');
            return;
        }
        const remaining = 5 - additionalImages.length - existingImages.length;
        const result = await launchImageLibrary({ mediaType: 'photo', selectionLimit: remaining, quality: 0.8 });
        if (result.assets) {
            setAdditionalImages(prev => [...prev, ...result.assets!]);
        }
    };

    const removeAdditionalImage = (index: number, isExisting: boolean) => {
        if (isExisting) {
            setExistingImages(prev => prev.filter((_, i) => i !== index));
        } else {
            setAdditionalImages(prev => prev.filter((_, i) => i !== index));
        }
    };

    // Variant modal handlers
    const openAddVariant = () => {
        setEditingVariantIndex(null);
        setVariantName('');
        setVariantSku('');
        setVariantPrice('');
        setVariantStock('10');
        setVariantAttributes({});
        setShowVariantModal(true);
    };

    const openEditVariant = (index: number) => {
        const v = variants[index];
        setEditingVariantIndex(index);
        setVariantName(v.name || '');
        setVariantSku(v.sku);
        setVariantPrice(v.price?.toString() || '');
        setVariantStock(v.stock.toString());
        setVariantAttributes(v.attributes);
        setShowVariantModal(true);
    };

    const saveVariant = () => {
        if (!variantSku.trim()) {
            Alert.alert(t('error') || 'Error', t('market.product.skuRequired') || 'SKU is required');
            return;
        }

        const variantData: VariantFormData = {
            sku: variantSku.trim(),
            name: variantName.trim(),
            price: variantPrice ? parseFloat(variantPrice) : undefined,
            stock: parseInt(variantStock) || 0,
            attributes: variantAttributes,
        };

        if (editingVariantIndex !== null) {
            setVariants(prev => prev.map((v, i) => i === editingVariantIndex ? variantData : v));
        } else {
            setVariants(prev => [...prev, variantData]);
        }
        setShowVariantModal(false);
    };

    const removeVariant = (index: number) => {
        Alert.alert(
            t('market.product.removeVariantTitle'),
            t('market.product.removeVariantMsg'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('common.delete'), style: 'destructive', onPress: () => {
                        setVariants(prev => prev.filter((_, i) => i !== index));
                    }
                },
            ]
        );
    };

    const addAttribute = () => {
        const key = `attr_${Object.keys(variantAttributes).length + 1}`;
        setVariantAttributes(prev => ({ ...prev, [key]: '' }));
    };

    const updateAttribute = (key: string, value: string) => {
        setVariantAttributes(prev => ({ ...prev, [key]: value }));
    };

    const handleSubmit = async () => {
        // Validation
        if (!name.trim() || name.length < 2) {
            return Alert.alert(t('error') || 'Error', t('market.product.nameRequired') || 'Product name must be at least 2 characters');
        }
        if (!basePrice || parseFloat(basePrice) < 0) {
            return Alert.alert(t('error') || 'Error', t('market.product.priceRequired') || 'Valid price is required');
        }

        setLoading(true);
        try {
            // 1. Upload main image if changed
            let mainImageUrl = existingMainImage;
            if (mainImage) {
                mainImageUrl = await marketService.uploadProductImage(mainImage);
            }

            // 2. Upload additional images if any
            const uploadedGalleryUrls: string[] = [];
            for (const asset of additionalImages) {
                const url = await marketService.uploadProductImage(asset);
                uploadedGalleryUrls.push(url);
            }

            const productData = {
                name: name.trim(),
                shortDescription: shortDescription.trim(),
                fullDescription: fullDescription.trim(),
                category: selectedCategory,
                productType,
                basePrice: parseFloat(basePrice),
                salePrice: salePrice ? parseFloat(salePrice) : undefined,
                stock: parseInt(stock) || 0,
                trackStock,
                digitalUrl: productType === 'digital' ? digitalUrl : undefined,
                weight: weight ? parseFloat(weight) : undefined,
                dimensions: dimensions.trim() || undefined,
                mainImageUrl: mainImageUrl || undefined,
                images: [...existingImages, ...uploadedGalleryUrls],
                variants: hasVariants ? variants : undefined,
            };

            if (isEditing && productId) {
                await marketService.updateProduct(productId, productData);
                Alert.alert(t('success') || 'Success', t('market.product.updateSuccess') || 'Product updated successfully', [
                    { text: 'OK', onPress: () => navigation.goBack() }
                ]);
            } else {
                await marketService.createProduct(productData);
                Alert.alert(t('success') || 'Success', t('market.product.createSuccess') || 'Product created successfully', [
                    { text: 'OK', onPress: () => navigation.goBack() }
                ]);
            }
        } catch (error: any) {
            console.error('Error saving product:', error);
            Alert.alert(t('error') || 'Error', error.response?.data?.error || t('market.product.saveError') || 'Failed to save product');
        } finally {
            setLoading(false);
        }
    };

    if (initialLoading) {
        return (
            <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={accent} />
            </View>
        );
    }

    return (
        <ProtectedScreen>
            <View style={{ flex: 1, backgroundColor: colors.background }}>
                <ScrollView contentContainerStyle={styles.container}>
                    <Text style={[styles.headerTitle, { color: textPrimary }]}>
                        {isEditing ? t('market.product.edit') : t('market.product.add')}
                    </Text>

                    {/* Main Image */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: textPrimary }]}>
                            {t('market.product.mainImage') || 'Main Image'}
                        </Text>
                        <TouchableOpacity style={[styles.mainImagePicker, { borderColor: accent }]} onPress={handlePickMainImage}>
                            {mainImage ? (
                                <Image source={{ uri: mainImage.uri }} style={styles.mainImagePreview} />
                            ) : existingMainImage ? (
                                <Image source={{ uri: getMediaUrl(existingMainImage) || '' }} style={styles.mainImagePreview} />
                            ) : (
                                <View style={styles.imagePlaceholder}>
                                    <Text style={{ fontSize: 40 }}>📷</Text>
                                    <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>
                                        {t('market.product.tapToAddImage') || 'Tap to add main image'}
                                    </Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Additional Images */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: textPrimary }]}>
                            {t('market.product.gallery') || 'Gallery'} ({existingImages.length + additionalImages.length}/5)
                        </Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <TouchableOpacity
                                style={[styles.addImageBtn, { borderColor: accent }]}
                                onPress={handlePickAdditionalImages}
                            >
                                <Text style={{ fontSize: 24, color: accent }}>+</Text>
                            </TouchableOpacity>
                            {existingImages.map((url, i) => (
                                <View key={`ex-${i}`} style={styles.galleryImageContainer}>
                                    <Image source={{ uri: getMediaUrl(url) || '' }} style={styles.galleryImage} />
                                    <TouchableOpacity style={styles.removeBtn} onPress={() => removeAdditionalImage(i, true)}>
                                        <Text style={{ color: textPrimary, fontSize: 12 }}>✕</Text>
                                    </TouchableOpacity>
                                </View>
                            ))}
                            {additionalImages.map((asset, i) => (
                                <View key={`new-${i}`} style={styles.galleryImageContainer}>
                                    <Image source={{ uri: asset.uri }} style={styles.galleryImage} />
                                    <TouchableOpacity style={styles.removeBtn} onPress={() => removeAdditionalImage(i, false)}>
                                        <Text style={{ color: textPrimary, fontSize: 12 }}>✕</Text>
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </ScrollView>
                    </View>

                    {/* Basic Info */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: textPrimary }]}>
                            {t('market.shop.basicInfo') || 'Basic Information'}
                        </Text>

                        <Text style={[styles.label, { color: colors.textSecondary }]}>{t('market.product.name') || 'Name'} *</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: surface, color: textPrimary }]}
                            value={name}
                            onChangeText={setName}
                            placeholder="Product name"
                            placeholderTextColor={colors.textSecondary}
                        />

                        <Text style={[styles.label, { color: colors.textSecondary, marginTop: 12 }]}>{t('market.product.shortDesc') || 'Short Description'}</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: surface, color: textPrimary }]}
                            value={shortDescription}
                            onChangeText={setShortDescription}
                            placeholder="Brief description (shown in listings)"
                            placeholderTextColor={colors.textSecondary}
                            maxLength={250}
                        />

                        <Text style={[styles.label, { color: colors.textSecondary, marginTop: 12 }]}>{t('market.product.fullDesc') || 'Full Description'}</Text>
                        <TextInput
                            style={[styles.input, styles.textArea, { backgroundColor: surface, color: textPrimary }]}
                            value={fullDescription}
                            onChangeText={setFullDescription}
                            placeholder="Detailed product description"
                            placeholderTextColor={colors.textSecondary}
                            multiline
                            numberOfLines={4}
                        />
                    </View>

                    {/* Category */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: textPrimary }]}>{t('market.product.category') || 'Category'}</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {categories.map((cat) => (
                                <TouchableOpacity
                                    key={cat.id}
                                    style={[
                                        styles.categoryPill,
                                        { backgroundColor: selectedCategory === cat.id ? accent : (surfaceElevated) }
                                    ]}
                                    onPress={() => setSelectedCategory(cat.id)}
                                >
                                    <Text>{cat.emoji}</Text>
                                    <Text style={[styles.categoryLabel, { color: textPrimary }]}>
                                        {cat.label[currentLang]}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    {/* Product Type */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: textPrimary }]}>{t('market.product.type') || 'Product Type'}</Text>
                        <View style={styles.typeSelector}>
                            <TouchableOpacity
                                style={[styles.typeBtn, { backgroundColor: productType === 'physical' ? accent : (surfaceElevated) }]}
                                onPress={() => setProductType('physical')}
                            >
                                <Text style={{ fontSize: 20 }}>📦</Text>
                                <Text style={[styles.typeLabel, { color: textPrimary }]}>
                                    {t('market.product.physical') || 'Physical'}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.typeBtn, { backgroundColor: productType === 'digital' ? accent : (surfaceElevated) }]}
                                onPress={() => setProductType('digital')}
                            >
                                <Text style={{ fontSize: 20 }}>💾</Text>
                                <Text style={[styles.typeLabel, { color: textPrimary }]}>
                                    {t('market.product.digital') || 'Digital'}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {productType === 'digital' && (
                            <>
                                <Text style={[styles.label, { color: colors.textSecondary, marginTop: 12 }]}>{t('market.product.digitalUrl') || 'Digital Download URL'}</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: surface, color: textPrimary }]}
                                    value={digitalUrl}
                                    onChangeText={setDigitalUrl}
                                    placeholder="https://..."
                                    placeholderTextColor={colors.textSecondary}
                                    autoCapitalize="none"
                                />
                            </>
                        )}
                    </View>

                    {/* Pricing */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: textPrimary }]}>{t('market.product.pricing') || 'Pricing'}</Text>

                        <View style={styles.priceRow}>
                            <View style={styles.priceField}>
                                <Text style={[styles.label, { color: colors.textSecondary }]}>{t('market.product.basePrice') || 'Base Price'} *</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: surface, color: textPrimary }]}
                                    value={basePrice}
                                    onChangeText={setBasePrice}
                                    placeholder="0"
                                    placeholderTextColor={colors.textSecondary}
                                    keyboardType="decimal-pad"
                                />
                            </View>
                            <View style={styles.priceField}>
                                <Text style={[styles.label, { color: colors.textSecondary }]}>{t('market.product.salePrice') || 'Sale Price'}</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: surface, color: textPrimary }]}
                                    value={salePrice}
                                    onChangeText={setSalePrice}
                                    placeholder="Optional"
                                    placeholderTextColor={colors.textSecondary}
                                    keyboardType="decimal-pad"
                                />
                            </View>
                        </View>
                    </View>

                    {/* Stock */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: textPrimary }]}>{t('market.product.inventory') || 'Inventory'}</Text>

                        <View style={styles.row}>
                            <Text style={{ color: textPrimary }}>{t('market.product.trackStock') || 'Track Stock'}</Text>
                            <Switch
                                value={trackStock}
                                onValueChange={setTrackStock}
                                trackColor={{ false: colors.border, true: accent }}
                            />
                        </View>

                        {trackStock && !hasVariants && (
                            <>
                                <Text style={[styles.label, { color: colors.textSecondary, marginTop: 12 }]}>{t('market.product.stockQty') || 'Stock Quantity'}</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: surface, color: textPrimary }]}
                                    value={stock}
                                    onChangeText={setStock}
                                    placeholder="0"
                                    placeholderTextColor={colors.textSecondary}
                                    keyboardType="number-pad"
                                />
                            </>
                        )}
                    </View>

                    {/* Variants */}
                    <View style={styles.section}>
                        <View style={styles.row}>
                            <Text style={[styles.sectionTitle, { color: textPrimary, marginBottom: 0 }]}>
                                {t('market.product.variants') || 'Product Variants (SKU)'}
                            </Text>
                            <Switch
                                value={hasVariants}
                                onValueChange={setHasVariants}
                                trackColor={{ false: colors.border, true: accent }}
                            />
                        </View>

                        {hasVariants && (
                            <>
                                <Text style={[styles.hint, { color: colors.textSecondary }]}>
                                    {t('market.product.variantHint')}
                                </Text>

                                {variants.map((v, index) => (
                                    <View key={index} style={[styles.variantCard, { backgroundColor: surfaceElevated }]}>
                                        <View style={styles.variantInfo}>
                                            <Text style={[styles.variantName, { color: textPrimary }]}>
                                                {v.name || v.sku}
                                            </Text>
                                            <Text style={[styles.variantMeta, { color: textSecondary }]}>
                                                SKU: {v.sku} • {t('market.product.stock')}: {v.stock} {v.price ? `• ₽${v.price}` : ''}
                                            </Text>
                                        </View>
                                        <View style={styles.variantActions}>
                                            <TouchableOpacity onPress={() => openEditVariant(index)}>
                                                <Text style={{ color: accent }}>{t('common.edit')}</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={() => removeVariant(index)}>
                                                <Text style={{ color: colors.danger, marginLeft: 12 }}>✕</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ))}

                                <TouchableOpacity
                                    style={[styles.addVariantBtn, { borderColor: accent }]}
                                    onPress={openAddVariant}
                                >
                                    <Text style={{ color: accent, fontWeight: '600' }}>+ {t('market.product.addVariant') || 'Add Variant'}</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>

                    {/* Physical Product Details */}
                    {productType === 'physical' && (
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: textPrimary }]}>
                                {t('market.product.shipping') || 'Shipping Details'}
                            </Text>

                            <View style={styles.priceRow}>
                                <View style={styles.priceField}>
                                    <Text style={[styles.label, { color: colors.textSecondary }]}>{t('market.product.weight') || 'Weight (kg)'}</Text>
                                    <TextInput
                                        style={[styles.input, { backgroundColor: surface, color: textPrimary }]}
                                        value={weight}
                                        onChangeText={setWeight}
                                        placeholder="0.5"
                                        placeholderTextColor={colors.textSecondary}
                                        keyboardType="decimal-pad"
                                    />
                                </View>
                                <View style={styles.priceField}>
                                    <Text style={[styles.label, { color: colors.textSecondary }]}>{t('market.product.dimensions') || 'Dimensions'}</Text>
                                    <TextInput
                                        style={[styles.input, { backgroundColor: surface, color: textPrimary }]}
                                        value={dimensions}
                                        onChangeText={setDimensions}
                                        placeholder="10x10x5 cm"
                                        placeholderTextColor={colors.textSecondary}
                                    />
                                </View>
                            </View>
                        </View>
                    )}

                    {/* Submit */}
                    <TouchableOpacity
                        style={[styles.submitBtn, { backgroundColor: accent }]}
                        onPress={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color={textPrimary} />
                        ) : (
                            <Text style={styles.submitText}>
                                {isEditing ? t('market.product.saveChanges') : t('market.product.createProduct')}
                            </Text>
                        )}
                    </TouchableOpacity>
                </ScrollView>

                {/* Variant Modal */}
                <Modal visible={showVariantModal} transparent animationType="slide">
                    <View style={styles.modalOverlay}>
                        <View style={[styles.modalContent, { backgroundColor: surface }]}>
                            <Text style={[styles.modalTitle, { color: textPrimary }]}>
                                {editingVariantIndex !== null ? t('market.product.editVariant') : t('market.product.addVariant')}
                            </Text>

                            <Text style={[styles.label, { color: colors.textSecondary }]}>{t('market.product.sku')}</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: surfaceElevated, color: textPrimary }]}
                                value={variantSku}
                                onChangeText={setVariantSku}
                                placeholder={t('market.product.skuPlaceholder')}
                                placeholderTextColor={colors.textSecondary}
                            />

                            <Text style={[styles.label, { color: colors.textSecondary, marginTop: 12 }]}>{t('market.product.variantName')}</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: surfaceElevated, color: textPrimary }]}
                                value={variantName}
                                onChangeText={setVariantName}
                                placeholder={t('market.product.variantNamePlaceholder')}
                                placeholderTextColor={colors.textSecondary}
                            />

                            <View style={styles.priceRow}>
                                <View style={styles.priceField}>
                                    <Text style={[styles.label, { color: colors.textSecondary, marginTop: 12 }]}>{t('market.product.priceOverride')}</Text>
                                    <TextInput
                                        style={[styles.input, { backgroundColor: surfaceElevated, color: textPrimary }]}
                                        value={variantPrice}
                                        onChangeText={setVariantPrice}
                                        placeholder={t('market.product.sameAsBase')}
                                        placeholderTextColor={colors.textSecondary}
                                        keyboardType="decimal-pad"
                                    />
                                </View>
                                <View style={styles.priceField}>
                                    <Text style={[styles.label, { color: colors.textSecondary, marginTop: 12 }]}>{t('market.product.stock')}</Text>
                                    <TextInput
                                        style={[styles.input, { backgroundColor: surfaceElevated, color: textPrimary }]}
                                        value={variantStock}
                                        onChangeText={setVariantStock}
                                        placeholder="0"
                                        placeholderTextColor={colors.textSecondary}
                                        keyboardType="number-pad"
                                    />
                                </View>
                            </View>

                            <View style={styles.modalButtons}>
                                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowVariantModal(false)}>
                                    <Text style={{ color: colors.textSecondary }}>{t('common.cancel')}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.saveBtn, { backgroundColor: accent }]} onPress={saveVariant}>
                                    <Text style={{ color: textPrimary, fontWeight: '600' }}>{t('common.save')}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            </View>
        </ProtectedScreen>
    );
};

const styles = StyleSheet.create({
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        padding: 16,
        paddingBottom: 40,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 20,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: '700',
        marginBottom: 12,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 6,
        textTransform: 'uppercase',
    },
    hint: {
        fontSize: 13,
        marginBottom: 12,
    },
    input: {
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
    },
    textArea: {
        minHeight: 100,
        textAlignVertical: 'top',
    },
    mainImagePicker: {
        height: 200,
        borderRadius: 16,
        borderWidth: 2,
        borderStyle: 'dashed',
        overflow: 'hidden',
    },
    mainImagePreview: {
        width: '100%',
        height: '100%',
    },
    imagePlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderText: {
        fontSize: 14,
        marginTop: 8,
    },
    addImageBtn: {
        width: 70,
        height: 70,
        borderRadius: 12,
        borderWidth: 2,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    galleryImageContainer: {
        position: 'relative',
        marginRight: 10,
    },
    galleryImage: {
        width: 70,
        height: 70,
        borderRadius: 12,
    },
    removeBtn: {
        position: 'absolute',
        top: -6,
        right: -6,
        backgroundColor: 'rgba(239,68,68,1)',
        width: 22,
        height: 22,
        borderRadius: 11,
        justifyContent: 'center',
        alignItems: 'center',
    },
    categoryPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 16,
        marginRight: 8,
        gap: 6,
    },
    categoryLabel: {
        fontSize: 13,
        fontWeight: '500',
    },
    typeSelector: {
        flexDirection: 'row',
        gap: 12,
    },
    typeBtn: {
        flex: 1,
        padding: 16,
        borderRadius: 14,
        alignItems: 'center',
        gap: 6,
    },
    typeLabel: {
        fontSize: 14,
        fontWeight: '600',
    },
    priceRow: {
        flexDirection: 'row',
        gap: 12,
    },
    priceField: {
        flex: 1,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginVertical: 6,
    },
    variantCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 14,
        borderRadius: 12,
        marginBottom: 8,
    },
    variantInfo: {
        flex: 1,
    },
    variantName: {
        fontSize: 15,
        fontWeight: '600',
    },
    variantMeta: {
        fontSize: 12,
        marginTop: 2,
    },
    variantActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    addVariantBtn: {
        padding: 14,
        borderRadius: 12,
        borderWidth: 2,
        borderStyle: 'dashed',
        alignItems: 'center',
        marginTop: 8,
    },
    submitBtn: {
        padding: 18,
        borderRadius: 30,
        alignItems: 'center',
        marginTop: 8,
        elevation: 6,
    },
    submitText: {
        color: 'rgba(255,255,255,1)',
        fontSize: 18,
        fontWeight: 'bold',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: 40,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 24,
    },
    cancelBtn: {
        flex: 1,
        padding: 14,
        borderRadius: 12,
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.1)',
    },
    saveBtn: {
        flex: 1,
        padding: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
});
