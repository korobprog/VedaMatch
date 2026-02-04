import { CartItem } from './market';

export type RootStackParamList = {
    Preview: undefined;
    Ads: undefined;
    CreateAd: { adId?: number } | undefined;
    AdDetail: { adId: number };
    AdsFilters: undefined;
    Registration: { isDarkMode: boolean, phase?: 'initial' | 'profile' };
    Login: undefined;
    Plans: undefined;
    Portal: { initialTab?: 'contacts' | 'chat' | 'dating' | 'shops' | 'ads' | 'news' | 'map' } | undefined;
    MapGeoapify: { focusMarker?: { id: number; type: 'user' | 'shop' | 'ad'; latitude: number; longitude: number } } | undefined;
    ContactProfile: { userId: number };
    AppSettings: undefined;
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
    Checkout: { items?: CartItem[]; shopId?: number } | undefined;
    OrderSuccess: { orderId: number; orderNumber: string };
    MyOrders: undefined;
    OrderDetails: { orderId: number };
    SellerOrders: undefined;
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
    ServiceBooking: { serviceId: number };
    MyServices: undefined;
    MyBookings: undefined;
    CreateService: { serviceId?: number } | undefined;
    IncomingBookings: undefined;

    // Wallet Routes
    Wallet: undefined;
};
