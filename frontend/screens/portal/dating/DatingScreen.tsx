import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    useColorScheme,
    TouchableOpacity,
    Dimensions
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../../components/chat/ChatConstants';

const { width } = Dimensions.get('window');

interface Profile {
    id: string;
    name: string;
    age: number;
    city: string;
    bio: string;
    spiritualPath: string;
}

const MOCK_PROFILES: Profile[] = [
    {
        id: '1',
        name: 'Govinda Das',
        age: 28,
        city: 'Moscow',
        bio: 'Looking for a spiritual partner to explore the path of Bhakti together.',
        spiritualPath: 'Gaudiya Vaishnava'
    },
    {
        id: '2',
        name: 'Lila Devi',
        age: 24,
        city: 'Saint Petersburg',
        bio: 'Yoga practitioner, art lover, and vegetarian explorer.',
        spiritualPath: 'Classical Yoga'
    },
    {
        id: '3',
        name: 'Vasu Dev',
        age: 32,
        city: 'Sochi',
        bio: 'Entrepreneur, kirtan enthusiast, looking for deep connections.',
        spiritualPath: 'Advaita Vedanta'
    }
];

export const DatingScreen = () => {
    const { t } = useTranslation();
    const isDarkMode = useColorScheme() === 'dark';
    const theme = isDarkMode ? COLORS.dark : COLORS.light;

    const renderProfile = ({ item }: { item: Profile }) => (
        <View style={[styles.card, { backgroundColor: theme.header, borderColor: theme.borderColor }]}>
            <View style={[styles.avatarPlaceholder, { backgroundColor: theme.background }]}>
                <Text style={{ fontSize: 40 }}>👤</Text>
            </View>
            <View style={styles.cardInfo}>
                <Text style={[styles.name, { color: theme.text }]}>{item.name}, {item.age}</Text>
                <Text style={[styles.city, { color: theme.subText }]}>{item.city}</Text>
                <Text style={[styles.path, { color: theme.accent }]}>{item.spiritualPath}</Text>
                <Text style={[styles.bio, { color: theme.text }]} numberOfLines={3}>{item.bio}</Text>

                <View style={styles.actions}>
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.button }]}>
                        <Text style={{ color: theme.buttonText }}>{t('common.ok')}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <FlatList
                data={MOCK_PROFILES}
                keyExtractor={(item) => item.id}
                renderItem={renderProfile}
                contentContainerStyle={styles.list}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    list: {
        padding: 16,
    },
    card: {
        borderRadius: 20,
        marginBottom: 20,
        borderWidth: 1,
        overflow: 'hidden',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    avatarPlaceholder: {
        height: 180,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardInfo: {
        padding: 16,
    },
    name: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    city: {
        fontSize: 14,
        marginBottom: 4,
    },
    path: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    bio: {
        fontSize: 14,
        lineHeight: 20,
    },
    actions: {
        marginTop: 15,
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    actionBtn: {
        paddingVertical: 8,
        paddingHorizontal: 20,
        borderRadius: 20,
    }
});
