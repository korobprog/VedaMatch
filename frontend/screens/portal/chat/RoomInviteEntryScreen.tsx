import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '../../../types/navigation';
import apiClient from '../../../lib/apiClient';
import { useUser } from '../../../context/UserContext';
import { PENDING_ROOM_INVITE_TOKEN_KEY } from './roomInviteStorage';

type Props = NativeStackScreenProps<RootStackParamList, 'RoomInviteEntry'>;

export const RoomInviteEntryScreen: React.FC<Props> = ({ route, navigation }) => {
    const { i18n } = useTranslation();
    const { isLoggedIn } = useUser();
    const copy = React.useMemo(() => {
        const language = String(i18n.language || '').toLowerCase();
        if (language.startsWith('hi')) {
            return {
                preparingInvite: 'आमंत्रण तैयार किया जा रहा है...',
                signInRequired: 'साइन-इन आवश्यक है...',
                joiningRoom: 'कमरे से जुड़ रहे हैं...',
                failedToJoin: 'आमंत्रण लिंक से जुड़ना विफल रहा',
                error: 'त्रुटि',
                room: 'कमरा',
            };
        }
        if (language.startsWith('en')) {
            return {
                preparingInvite: 'Preparing invite...',
                signInRequired: 'Sign-in required...',
                joiningRoom: 'Joining room...',
                failedToJoin: 'Failed to join via invite link',
                error: 'Error',
                room: 'Room',
            };
        }
        return {
            preparingInvite: 'Подготавливаем приглашение...',
            signInRequired: 'Требуется вход...',
            joiningRoom: 'Подключаем к комнате...',
            failedToJoin: 'Не удалось присоединиться по ссылке-приглашению',
            error: 'Ошибка',
            room: 'Комната',
        };
    }, [i18n.language]);
    const [statusText, setStatusText] = useState(copy.preparingInvite);
    const joinAttemptedRef = useRef(false);

    useEffect(() => {
        if (!joinAttemptedRef.current) {
            setStatusText(copy.preparingInvite);
        }
    }, [copy.preparingInvite]);

    useEffect(() => {
        const token = String(route.params?.token || '').trim();
        if (!token) {
            if (isLoggedIn) {
                navigation.replace('RoomsHome');
            } else {
                navigation.replace('Login');
            }
            return;
        }

        if (!isLoggedIn) {
            setStatusText(copy.signInRequired);
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
        setStatusText(copy.joiningRoom);

        const run = async () => {
            try {
                await AsyncStorage.removeItem(PENDING_ROOM_INVITE_TOKEN_KEY);
                const response = await apiClient.post('/rooms/join-by-token', { token });
                const payload = response.data || {};

                const joinedRoomID = Number(payload?.roomId);
                const joinedRoomName = typeof payload?.roomName === 'string' && payload.roomName.trim()
                    ? payload.roomName.trim()
                    : copy.room;

                if (!Number.isFinite(joinedRoomID) || joinedRoomID <= 0) {
                    navigation.replace('RoomsHome');
                    return;
                }

                navigation.reset({
                    index: 1,
                    routes: [
                        { name: 'RoomsHome' },
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
                    : copy.failedToJoin;
                Alert.alert(copy.error, errorMessage);
                navigation.replace('RoomsHome');
            }
        };

        void run();
    }, [copy.error, copy.failedToJoin, copy.joiningRoom, copy.room, copy.signInRequired, isLoggedIn, navigation, route.params?.token]);

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
