import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Image, useColorScheme } from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../../components/chat/ChatConstants';

interface Contact {
    id: string;
    name: string;
    description: string;
    avatar?: string;
    online: boolean;
}

const MOCK_CONTACTS: Contact[] = [
    { id: '1', name: 'Krishna Das', description: 'Yoga Instructor', online: true },
    { id: '2', name: 'Radha Devi', description: 'Ayurveda Specialist', online: false },
    { id: '3', name: 'Arjuna', description: 'Warrior Path', online: true },
    { id: '4', name: 'Saraswati', description: 'Education & Music', online: true },
    { id: '5', name: 'Gopal', description: 'Cow Protection', online: false },
];

export const ContactsScreen: React.FC = () => {
    const { t } = useTranslation();
    const isDarkMode = useColorScheme() === 'dark';
    const theme = isDarkMode ? COLORS.dark : COLORS.light;
    const [search, setSearch] = useState('');

    const filteredContacts = MOCK_CONTACTS.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase())
    );

    const renderItem = ({ item }: { item: Contact }) => (
        <TouchableOpacity style={[styles.contactItem, { borderBottomColor: theme.borderColor }]}>
            <View style={[styles.avatarPlaceholder, { backgroundColor: theme.button }]}>
                <Text style={{ color: theme.buttonText, fontWeight: 'bold' }}>{item.name[0]}</Text>
                {item.online && <View style={styles.onlineStatus} />}
            </View>
            <View style={styles.contactInfo}>
                <Text style={[styles.contactName, { color: theme.text }]}>{item.name}</Text>
                <Text style={[styles.contactDesc, { color: theme.subText }]}>{item.description}</Text>
            </View>
            <Text style={{ color: theme.accent, fontSize: 18 }}>›</Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={[styles.searchContainer, { backgroundColor: theme.inputBackground, borderColor: theme.borderColor }]}>
                <TextInput
                    style={[styles.searchInput, { color: theme.inputText }]}
                    placeholder={t('chat.placeholder')}
                    placeholderTextColor={theme.subText}
                    value={search}
                    onChangeText={setSearch}
                />
            </View>
            <FlatList
                data={filteredContacts}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
                ListEmptyComponent={<Text style={[styles.empty, { color: theme.subText }]}>No contacts found</Text>}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    searchContainer: {
        margin: 16,
        paddingHorizontal: 16,
        height: 44,
        borderRadius: 22,
        borderWidth: 1,
        justifyContent: 'center',
    },
    searchInput: { fontSize: 16 },
    list: { paddingBottom: 20 },
    contactItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 0.5,
    },
    avatarPlaceholder: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
    },
    onlineStatus: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#4CAF50',
        borderWidth: 2,
        borderColor: '#FFF',
    },
    contactInfo: {
        flex: 1,
        marginLeft: 16,
    },
    contactName: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    contactDesc: {
        fontSize: 13,
        marginTop: 2,
    },
    empty: {
        textAlign: 'center',
        marginTop: 40,
    }
});
