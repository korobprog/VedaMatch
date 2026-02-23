import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../types/navigation';
import apiClient from '../../../lib/apiClient';
import { useUser } from '../../../context/UserContext';
import { PENDING_ROOM_INVITE_TOKEN_KEY } from './roomInviteStorage';

type Props = NativeStackScreenProps<RootStackParamList, 'RoomInviteEntry'>;

const fallbackRoomName = 'Room';

export const RoomInviteEntryScreen: React.FC<Props> = ({ route, navigation }) => {
    const { isLoggedIn } = useUser();
    const [statusText, setStatusText] = useState('Подготовка приглашения...');
    const joinAttemptedRef = useRef(false);

    useEffect(() => {
        const token = String(route.params?.token || '').trim();
        if (!token) {
            if (isLoggedIn) {
                navigation.replace('Portal', { initialTab: 'rooms' });
            } else {
                navigation.replace('Login');
            }
            return;
        }

        if (!isLoggedIn) {
            setStatusText('Нужен вход в аккаунт...');
            AsyncStorage.setItem(PENDING_ROOM_INVITE_TOKEN_KEY, token)
                .finally(() => {
                    navigation.replace('Login');
                });
            return;
        }

        if (joinAttemptedRef.current) {
            return;
        }
        joinAttemptedRef.current = true;
        setStatusText('Вступаем в комнату...');

        const run = async () => {
            try {
                await AsyncStorage.removeItem(PENDING_ROOM_INVITE_TOKEN_KEY);
                const response = await apiClient.post('/rooms/join-by-token', { token });
                const payload = response.data || {};

                const joinedRoomID = Number(payload?.roomId);
                const joinedRoomName = typeof payload?.roomName === 'string' && payload.roomName.trim()
                    ? payload.roomName.trim()
                    : fallbackRoomName;

                if (!Number.isFinite(joinedRoomID) || joinedRoomID <= 0) {
                    navigation.replace('Portal', { initialTab: 'rooms' });
                    return;
                }

                navigation.reset({
                    index: 1,
                    routes: [
                        { name: 'Portal', params: { initialTab: 'rooms' } },
                        {
                            name: 'RoomChat',
                            params: {
                                roomId: joinedRoomID,
                                roomName: joinedRoomName,
                            },
                        },
                    ],
                });
            } catch (error: any) {
                await AsyncStorage.removeItem(PENDING_ROOM_INVITE_TOKEN_KEY);
                const responseData = error?.response?.data;
                const errorMessage = typeof responseData?.error === 'string' && responseData.error.trim()
                    ? responseData.error.trim()
                    : 'Не удалось присоединиться по ссылке';
                Alert.alert('Ошибка', errorMessage);
                navigation.replace('Portal', { initialTab: 'rooms' });
            }
        };

        void run();
    }, [isLoggedIn, navigation, route.params?.token]);

    return (
        <View style={styles.container}>
            <ActivityIndicator size="large" color="#FF8A3D" />
            <Text style={styles.text}>{statusText}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
        gap: 14,
        backgroundColor: '#0F172A',
    },
    text: {
        color: '#FFFFFF',
        fontSize: 15,
        textAlign: 'center',
    },
});
