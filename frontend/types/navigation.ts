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
    Portal: { initialTab?: 'contacts' | 'chat' | 'dating' | 'shops' | 'ads' | 'news' } | undefined;
    ContactProfile: { userId: number };
    AppSettings: undefined;
    EditProfile: undefined;
    RoomChat: { roomId: number, roomName: string };
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

    // Education Routes
    EducationHome: undefined;
    CourseDetails: { courseId: number };
    ExamTrainer: { moduleId: number; title: string };
    CallScreen: { targetId?: number; isIncoming?: boolean; callerName?: string; callUUID?: string };
};
