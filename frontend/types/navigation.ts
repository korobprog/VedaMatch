export type RootStackParamList = {
    Chat: undefined;
    Registration: { isDarkMode: boolean, phase?: 'initial' | 'profile' };
    Login: undefined;
    Plans: undefined;
    Portal: { initialTab?: 'contacts' | 'chat' | 'dating' | 'shops' | 'ads' | 'news' };
    ContactProfile: { userId: number };
    AppSettings: undefined;
    RoomChat: { roomId: number, roomName: string };
    MediaLibrary: { userId: number };
    EditDatingProfile: { userId: number };
    DatingFavorites: undefined;
};
