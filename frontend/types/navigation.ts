import { CartItem } from './market';
import type { ChannelPost } from './channel';
import type { ConnectFeedFilters } from './connect';

export type PortalInitialTab =
    | 'contacts'
    | 'chat'
    | 'rooms'
    | 'dating'
    | 'cafe'
    | 'shops'
    | 'ads'
    | 'news'
    | 'calls'
    | 'multimedia'
    | 'video_circles'
    | 'knowledge_base'
    | 'library'
    | 'education'
    | 'map'
    | 'travel'
    | 'dhama'
    | 'services'
    | 'services_catalog'
    | 'connect'
    | 'path_tracker'
    | 'channels'
    | 'ekadashi_calendar';

export type VideoCirclePlayerPayload = {
    id: number;
    authorId: number;
    mediaUrl: string;
    thumbnailUrl?: string;
    city?: string;
    matha?: string;
    category?: string;
    likeCount: number;
    commentCount: number;
    chatCount: number;
};

export type AiNavigationMeta = {
    origin?: 'ai_chat';
    returnTo?: 'chat' | 'portal';
};

export type RootStackParamList = {
    Preview: undefined;
    LegalDocument: { type: 'terms' | 'privacy' | 'account-deletion'; language?: 'en' | 'ru' | 'hi' };
    Ads: undefined;
    CreateAd: { adId?: number; initialCategory?: 'events' } | undefined;
    AdDetail: { adId: number };
    AdsFilters: undefined;
    Registration: { isDarkMode: boolean, phase?: 'initial' | 'profile', inviteCode?: string };
    Login: { inviteCode?: string } | undefined;
    Plans: undefined;
    Portal: {
        initialTab?: PortalInitialTab;
        initialPage?: 'portal' | 'widgets';
        resetToGridAt?: number;
        returnToWidget?: boolean;
        origin?: 'widget_dock';
        originServiceId?: string;
    } | undefined;
    MapGeoapify: { focusMarker?: { id: number; type: 'user' | 'shop' | 'ad'; latitude: number; longitude: number } } | undefined;
    DhamaHome: { collectionSlug?: string; collectionTitle?: string } | undefined;
    DhamaMap: { collectionSlug?: string } | undefined;
    DhamaCollectionDetail: { slug: string };
    HolyPlaceDetail: { slug: string };
    DatingHome: undefined;
    CafeHome: undefined;
    NewsHome: undefined;
    LibraryHome: AiNavigationMeta | undefined;
    ContactsHome: undefined;
    CallsHome: undefined;
    RoomsHome: undefined;
    ContactProfile: { userId: number } & AiNavigationMeta;
    FriendRequests: undefined;
    AppSettings: undefined;
    LinkedAccounts: undefined;
    SupportHome: { entryPoint?: string; conversationId?: number } | undefined;
    SupportTicketForm: {
        entryPoint?: string;
        targetPreacherId?: number;
        targetPreacherName?: string;
        reportType?: 'user' | 'content';
        reportedUserId?: number;
        reportedUserName?: string;
        reportedContentType?: 'chat_message' | 'ad' | 'profile' | 'other';
        reportedContentId?: string;
    } | undefined;
    SupportInbox: undefined;
    SupportConversation: { conversationId: number };
    ChatInbox: undefined;
    EditProfile: undefined;
    ProPlans: undefined;
    RoomChat: {
        roomId: number;
        roomName: string;
        isYatraChat?: boolean;
        listenerMode?: boolean;
        showSupportPrompt?: boolean;
        autoStartCall?: boolean;
        liveChannelId?: number;
        liveId?: number;
    };
    RoomInviteEntry: { token: string };
    MediaLibrary: { userId: number; readOnly?: boolean };
    EditDatingProfile: { userId: number };
    DatingFavorites: undefined;
    UnionApprovals: { focusApprovalId?: number } | undefined;
    Chat: { userId?: number; name?: string } | undefined;
    BookList: { category: string; title: string } & AiNavigationMeta;
    Reader: { bookCode: string; title: string; chapter?: number; verse?: string; canto?: number } & AiNavigationMeta;
    NewsDetail: { newsId: number } & AiNavigationMeta;

    // Market Routes
    MarketHome: undefined;
    Shops: undefined;
    ShopDetails: { shopId: number } & AiNavigationMeta;
    CreateShop: undefined;
    EditShop: { shopId: number };
    SellerDashboard: undefined;
    CreateProduct: undefined;
    EditProduct: { productId: number };
    MyProducts: undefined;
    ProductDetails: { productId: number } & AiNavigationMeta;
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
    CafeDetail: { cafeId: number; tableId?: number; tableNumber?: string } & AiNavigationMeta;
    DishDetail: { cafeId: number; dishId: number; cafeName?: string } & AiNavigationMeta;
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
    CourseDetails: { courseId: number } & AiNavigationMeta;
    ExamTrainer: { moduleId: number; title: string };
    AITutor: undefined;
    CallScreen: { targetId?: number; isIncoming?: boolean; callerName?: string; callUUID?: string; autoAccept?: boolean };
    WidgetSelection: { source?: 'portal_header' | 'portal_swipe' | 'edit_toolbar' | 'widget_dock_return' } | undefined;

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
    PlaylistsScreen: undefined;
    PlaylistDetail: { playlistId: number; playlistName?: string };
    OfflineMedia: undefined;
    SeriesScreen: undefined;
    SeriesDetail: { series: any };
    RadioPlayer: { station: any };
    AudioPlayer: { track: any };
    VideoPlayer: { video: any; source?: 'video_circles'; circle?: VideoCirclePlayerPayload };
    TVPlayer: { channel: any };

    // Travel Routes
    TravelHome: undefined;
    YatraDetail: { yatraId: number } & AiNavigationMeta;
    YatraPublish: { yatraId: number };
    ShelterDetail: { shelterId: number } & AiNavigationMeta;
    CreateYatra: { yatraId?: number } | undefined;
    CreateShelter: { shelterId?: number } | undefined;

    // Services Routes
    ServicesHome: undefined;
    ServiceDetail: { serviceId: number } & AiNavigationMeta;
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
    SadhuSangaHub: { tab?: 'home' | 'schedule' | 'live' | 'profile' } | undefined;
    SadhuSangaSchedule: undefined;
    SadhuSangaLive: undefined;
    SadhuSangaProfile: undefined;
    SadhuSangaSmartPush: undefined;
    EkadashiCalendar: undefined;
    ChannelDetails: { channelId: number; source?: 'sadhu_sanga'; focusSection?: 'seminars' };
    CreateChannel: undefined;
    ChannelPostComposer: { channelId: number; mode?: 'create' | 'edit'; postId?: number; initialPost?: ChannelPost };
    ChannelManage: { channelId: number };
    ChannelTeam: { channelId: number; source?: 'sadhu_sanga' };
    ChannelRoadmapManage: { channelId: number; source?: 'sadhu_sanga'; pointId?: number };
    ChannelPreacherBioManage: { channelId: number; source?: 'sadhu_sanga' };
    ConnectHome: { filters?: ConnectFeedFilters } | undefined;
    ConnectFilters: { filters?: ConnectFeedFilters } | undefined;
    ConnectOpportunityDetails: { opportunityId: number };
    ConnectCommunityDetails: { communityId: number };
    ConnectProfileSetup: undefined;
    ConnectCreateOpportunity: undefined;
    ConnectModeration: { opportunityId?: number } | undefined;

    // Wallet Routes
    Wallet: undefined;
    InviteFriends: undefined;

    // Seva Charity Routes
    SevaHub: undefined;
    SevaProjectDetails: { project?: any; projectId?: number };
    MyDonations: undefined;

    // Path Tracker Routes
    PathTrackerHome: undefined;
    PathCheckin: undefined;
    PathStep: { stepId?: number; step?: any };
    PathReflection: { stepId: number };
    PathWeeklySummary: undefined;
};
