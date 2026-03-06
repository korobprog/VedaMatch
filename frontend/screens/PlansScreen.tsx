import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    SafeAreaView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useTranslation } from 'react-i18next';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Plans'>;

const PlansScreen: React.FC<Props> = ({ navigation }) => {
    const { i18n } = useTranslation();
    const [selectedRegion, setSelectedRegion] = useState<'RU' | 'Global'>('RU');
    const copy = React.useMemo(() => {
        const language = String(i18n.language || '').toLowerCase();
        if (language.startsWith('hi')) {
            return {
                title: 'अपना पथ चुनें',
                subtitle: 'पूर्ण क्षमता खोलने के लिए एक प्लान चुनें',
                russia: 'रूस',
                global: 'ग्लोबल',
                month: 'माह',
                trialPlan: 'ट्रायल प्लान',
                proPlan: 'प्रो प्लान',
                fullAccess: 'पूर्ण एक्सेस (मॉक्ड)',
                aiChatSupport: 'AI चैट सहायता',
                basicMatching: 'बेसिक मैचिंग',
                priorityMatching: 'प्राथमिक मैचिंग',
                unlimitedAiQueries: 'असीमित AI प्रश्न',
                verifiedProfileBadge: 'वेरिफ़ाइड प्रोफ़ाइल बैज',
                advancedSearchFilters: 'एडवांस्ड सर्च फ़िल्टर',
                selectPlan: 'प्लान चुनें',
                backToProfile: 'प्रोफ़ाइल पर वापस जाएँ',
            };
        }
        if (language.startsWith('en')) {
            return {
                title: 'Choose Your Path',
                subtitle: 'Select a plan to unlock full potential',
                russia: 'Russia',
                global: 'Global',
                month: 'month',
                trialPlan: 'Trial Plan',
                proPlan: 'Pro Plan',
                fullAccess: 'Full Access (Mocked)',
                aiChatSupport: 'AI Chat Support',
                basicMatching: 'Basic Matching',
                priorityMatching: 'Priority Matching',
                unlimitedAiQueries: 'Unlimited AI Queries',
                verifiedProfileBadge: 'Verified Profile Badge',
                advancedSearchFilters: 'Advanced Search Filters',
                selectPlan: 'Select Plan',
                backToProfile: 'Back to Profile',
            };
        }
        return {
            title: 'Выберите свой путь',
            subtitle: 'Выберите план, чтобы открыть полный потенциал',
            russia: 'Россия',
            global: 'Глобальный',
            month: 'месяц',
            trialPlan: 'Пробный план',
            proPlan: 'PRO-план',
            fullAccess: 'Полный доступ (mocked)',
            aiChatSupport: 'Поддержка AI-чата',
            basicMatching: 'Базовый матчинг',
            priorityMatching: 'Приоритетный матчинг',
            unlimitedAiQueries: 'Безлимитные AI-запросы',
            verifiedProfileBadge: 'Значок верифицированного профиля',
            advancedSearchFilters: 'Расширенные фильтры поиска',
            selectPlan: 'Выбрать план',
            backToProfile: 'Назад в профиль',
        };
    }, [i18n.language]);

    const plans = [
        {
            id: 'trial',
            name: copy.trialPlan,
            price: selectedRegion === 'RU' ? '100 \u20BD' : '$2',
            period: copy.month,
            features: [
                copy.fullAccess,
                copy.aiChatSupport,
                copy.basicMatching,
            ],
            color: ['#FFCC00', '#FF9933'],
        },
        {
            id: 'pro',
            name: copy.proPlan,
            price: selectedRegion === 'RU' ? '500 \u20BD' : '$6',
            period: copy.month,
            features: [
                copy.priorityMatching,
                copy.unlimitedAiQueries,
                copy.verifiedProfileBadge,
                copy.advancedSearchFilters,
            ],
            color: ['#FF9933', '#CC6600'],
        }
    ];

    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient
                colors={['#FFF9F0', '#FFEEDD']}
                style={StyleSheet.absoluteFill}
            />
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.title}>{copy.title}</Text>
                <Text style={styles.subtitle}>{copy.subtitle}</Text>

                <View style={styles.regionSelector}>
                    <TouchableOpacity
                        style={[styles.regionButton, selectedRegion === 'RU' && styles.activeRegion]}
                        onPress={() => setSelectedRegion('RU')}
                    >
                        <Text style={[styles.regionText, selectedRegion === 'RU' && styles.activeRegionText]}>{copy.russia}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.regionButton, selectedRegion === 'Global' && styles.activeRegion]}
                        onPress={() => setSelectedRegion('Global')}
                    >
                        <Text style={[styles.regionText, selectedRegion === 'Global' && styles.activeRegionText]}>{copy.global}</Text>
                    </TouchableOpacity>
                </View>

                {plans.map((plan) => (
                    <View key={plan.id} style={styles.planCard}>
                        <LinearGradient
                            colors={plan.color}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.planHeader}
                        >
                            <Text style={styles.planName}>{plan.name}</Text>
                            <View style={styles.priceRow}>
                                <Text style={styles.planPrice}>{plan.price}</Text>
                                <Text style={styles.planPeriod}>/{plan.period}</Text>
                            </View>
                        </LinearGradient>
                        <View style={styles.featuresList}>
                            {plan.features.map((feature, index) => (
                                <View key={index} style={styles.featureItem}>
                                    <View style={styles.checkMark} />
                                    <Text style={styles.featureText}>{feature}</Text>
                                </View>
                            ))}
                        </View>
                        <TouchableOpacity
                            style={[styles.selectButton, { backgroundColor: plan.color[0] }]}
                            onPress={() => navigation.replace('Portal', {})}
                        >
                            <Text style={styles.selectButtonText}>{copy.selectPlan}</Text>
                        </TouchableOpacity>
                    </View>
                ))}

                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={styles.backButtonText}>{copy.backToProfile}</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#FF9933',
        textAlign: 'center',
        marginTop: 20,
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 30,
        marginTop: 5,
    },
    regionSelector: {
        flexDirection: 'row',
        backgroundColor: '#EEE',
        borderRadius: 15,
        padding: 5,
        marginBottom: 30,
        alignSelf: 'center',
    },
    regionButton: {
        paddingHorizontal: 30,
        paddingVertical: 10,
        borderRadius: 12,
    },
    activeRegion: {
        backgroundColor: '#FFF',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    regionText: {
        fontSize: 14,
        color: '#888',
        fontWeight: '600',
    },
    activeRegionText: {
        color: '#FF9933',
    },
    planCard: {
        backgroundColor: '#FFF',
        borderRadius: 25,
        overflow: 'hidden',
        marginBottom: 25,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
    },
    planHeader: {
        padding: 25,
        alignItems: 'center',
    },
    planName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFF',
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginTop: 10,
    },
    planPrice: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#FFF',
    },
    planPeriod: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.8)',
        marginLeft: 4,
    },
    featuresList: {
        padding: 25,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    checkMark: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#FF9933',
        marginRight: 12,
    },
    featureText: {
        fontSize: 16,
        color: '#444',
    },
    selectButton: {
        margin: 25,
        marginTop: 0,
        height: 55,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
    },
    selectButtonText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    backButton: {
        alignItems: 'center',
        marginTop: 10,
    },
    backButtonText: {
        color: '#666',
        fontSize: 16,
        textDecorationLine: 'underline',
    },
});

export default PlansScreen;
