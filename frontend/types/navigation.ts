import { CartItem } from './market';

export type RootStackParamList = {
    Preview: undefined;
    Ads: undefined;
    CreateAd: { adId?: number } | undefined;
    AdDetail: { adId: number };
    AdsFilters: undefined;
    Registration: { isDarkMode: boolean, phase?: 'initial' | 'profile', inviteCode?: string };
    Login: { inviteCode?: string } | undefined;
    Plans: undefined;
    Portal: {
        initialTab?: 'contacts' | 'chat' | 'dating' | 'shops' | 'ads' | 'news' | 'map' | 'path_tracker' | 'channels';
        resetToGridAt?: number;
    } | undefined;
    MapGeoapify: { focusMarker?: { id: number; type: 'user' | 'shop' | 'ad'; latitude: number; longitude: number } } | undefined;
    ContactProfile: { userId: number };
    AppSettings: undefined;
    SupportHome: { entryPoint?: string; conversationId?: number } | undefined;
    SupportTicketForm: { entryPoint?: string } | undefined;
    SupportInbox: undefined;
    SupportConversation: { conversationId: number };
    EditProfile: undefined;
    RoomChat: { roomId: number, roomName: string, isYatraChat?: boolean };
    MediaLibrary: { userId: number; readOnly?: boolean };
    EditDatingProfile: { userId: number };
    DatingFavorites: undefined;
    Chat: { userId?: number; name?: string } | undefined;
    BookList: { category: string; title: string };
    Reader: { bookCode: string; title: string };
    NewsDetail: { newsId: number };

    // Market Routes
    MarketHome: undefined;
    Shops: undefined;
    ShopDetails: { shopId: number };
    CreateShop: undefined;
    EditShop: { shopId: number };
    SellerDashboard: undefined;
    CreateProduct: undefined;
    EditProduct: { productId: number };
    MyProducts: undefined;
    ProductDetails: { productId: number };
    Checkout: {
        items?: CartItem[];
        shopId?: number;
        source?: string;
        sourcePostId?: number;
        sourceChannelId?: number;
        prefillBuyerNote?: string;
    } | undefined;
    OrderSuccess: { orderId: number; orderNumber: string };
    MyOrders: undefined;
    OrderDetails: { orderId: number };
    SellerOrders: { source?: string; sourceChannelId?: number } | undefined;
    ShopsMap: undefined;
    Messages: undefined;

    // Cafe Routes
    CreateCafe: { cafeId?: number } | undefined;
    EditCafe: { cafeId: number };
    CafesMap: undefined;
    CafeDetail: { cafeId: number; tableId?: number; tableNumber?: string };
    DishDetail: { cafeId: number; dishId: number; cafeName?: string };
    CafeCart: undefined;
    CafeOrderSuccess: { orderId: number; orderNumber: string }; // Renamed from CafeOrderSuccess
    OrderTracking: { orderId: number };
    QRScanner: undefined;
    StaffOrderBoard: { cafeId: number; cafeName: string };
    StaffWaiterCalls: { cafeId: number; cafeName: string };
    StaffStopList: { cafeId: number; cafeName: string };
    StaffTableEditor: { cafeId: number; cafeName: string };
    StaffOrderHistory: { cafeId: number; cafeName: string };
    StaffMenuEditor: { cafeId: number; cafeName: string };
    StaffStats: { cafeId: number; cafeName: string };
    CafeSettings: { cafeId: number; cafeName: string };

    // Education Routes
    EducationHome: undefined;
    CourseDetails: { courseId: number };
    ExamTrainer: { moduleId: number; title: string };
    CallScreen: { targetId?: number; isIncoming?: boolean; callerName?: string; callUUID?: string };
    WidgetSelection: undefined;

    // Multimedia Routes
    MultimediaHub: undefined;
    RadioScreen: undefined;
    AudioScreen: undefined;
    VideoScreen: undefined;
    VideoCirclesScreen: { openPublish?: boolean; scope?: 'all' | 'friends'; channelId?: number } | undefined;
    MyVideoCirclesScreen: undefined;
    VideoTariffsAdminScreen: undefined;
    TVScreen: undefined;
    FavoritesScreen: undefined;
    SeriesScreen: undefined;
    SeriesDetail: { series: any };
    RadioPlayer: { station: any };
    AudioPlayer: { track: any };
    VideoPlayer: { video: any };
    TVPlayer: { channel: any };

    // Travel Routes
    YatraDetail: { yatraId: number };
    ShelterDetail: { shelterId: number };
    CreateYatra: { yatraId?: number } | undefined;
    CreateShelter: { shelterId?: number } | undefined;

    // Services Routes
    ServicesHome: undefined;
    ServiceDetail: { serviceId: number };
    ServiceBooking: {
        serviceId: number;
        source?: string;
        sourcePostId?: number;
        sourceChannelId?: number;
    };
    MyServices: undefined;
    MyBookings: undefined;
    CreateService: { serviceId?: number } | undefined;
    IncomingBookings: undefined;
    ServiceSchedule: { serviceId: number };
    ChannelsHub: undefined;
    ChannelDetails: { channelId: number };
    CreateChannel: undefined;
    ChannelPostComposer: { channelId: number };
    ChannelManage: { channelId: number };

    // Wallet Routes
    Wallet: undefined;
    InviteFriends: undefined;

    // Seva Charity Routes
    SevaHub: undefined;
    SevaProjectDetails: { project: any };
    MyDonations: undefined;

    // Path Tracker Routes
    PathTrackerHome: undefined;
    PathCheckin: undefined;
    PathStep: { stepId?: number; step?: any };
    PathReflection: { stepId: number };
    PathWeeklySummary: undefined;
};
