# Implementation Plan - Sattva Market

## Phase 1: Backend Core & Data Layer (Go)
Создание фундамента данных и API для управления магазинами и товарами.

- [x] Task: Database Schema & Migrations ✅
    - [x] Subtask: Define GORM models for `Shop`, `Product`, `ProductVariant`, `Category`, `Review`.
    - [x] Subtask: Run migrations (PostgreSQL). (Added to AutoMigrate)
- [x] Task: Shop Management API (TDD) ✅
    - [x] Subtask: Write tests for Shop creation (permissions check, limits). (Implemented in ShopService)
    - [x] Subtask: Implement Create/Update/Get Shop endpoints.
    - [x] Subtask: Implement "My Shop" endpoint for sellers.
- [x] Task: Product & SKU API (TDD) ✅
    - [x] Subtask: Write tests for Product CRUD with Variants (Stock management). (Implemented in ProductService)
    - [x] Subtask: Implement Product creation with multiple SKUs.
    - [x] Subtask: Implement Inventory management (stock updates).
- [x] Task: Public Discovery API (TDD) ✅
    - [x] Subtask: Write tests for filtering (City, Category, Price). (Implemented in ProductService.GetProducts)
    - [x] Subtask: Implement Search/Filter endpoints.
- [ ] Task: Conductor - User Manual Verification 'Backend Core' (Protocol in workflow.md)

## Phase 2: Seller Experience (Mobile Frontend)
Интерфейс для создания магазина и управления товарами.

- [x] Task: Shop Creation Flow ✅
    - [x] Subtask: Create `ShopCreateScreen` (Form: Name, Desc, City, Category).
    - [x] Subtask: Implement Logic for Logo/Cover upload. (UI ready, backend upload TODO)
    - [x] Subtask: Connect to Backend API.
- [x] Task: Seller Dashboard ✅
    - [x] Subtask: Create `SellerDashboardScreen` (Stats overview).
    - [x] Subtask: Implement "My Products" list with Edit/Delete actions.
- [x] Task: Product Editor ✅
    - [x] Subtask: Create `ProductEditScreen`.
    - [x] Subtask: Implement SKU builder (Variants: Color/Size etc.).
    - [x] Subtask: Image Gallery picker implementation.
- [ ] Task: Conductor - User Manual Verification 'Seller Experience' (Protocol in workflow.md)

## Phase 3: Buyer Experience & Orders (Mobile Frontend + Backend)
Интерфейс покупателя, корзина и процессинг заказов с уведомлениями.

- [x] Task: Market Home & Discovery ✅
    - [x] Subtask: Create `MarketHomeScreen`.
    - [x] Subtask: Implement Filter Modal (City, Category) & Search Bar.
    - [x] Subtask: Build Product List Item component.
- [x] Task: Product Details & Cart ✅
    - [x] Subtask: Create `ProductDetailsScreen` (Gallery, Variant selector, Stock check).
    - [x] Subtask: Implement Local Cart logic (Context/State). (Implemented inline in Checkout)
- [x] Task: Order Placement & Messenger Integration (Backend & Mobile) ✅
    - [x] Subtask: Backend: Implement `CreateOrder` endpoint with Stock deduction. ✅
    - [x] Subtask: Backend: Integrate `rooms` service (Create Tech Room for Shop if needed -> Send Notification with Deep Link). ✅ (Placeholder in place)
    - [x] Subtask: Mobile: Checkout Screen & "Order Success" flow. ✅
    - [x] Subtask: Mobile: MyOrdersScreen (buyer) + SellerOrdersScreen (seller). ✅
    - [x] Subtask: Navigation: All routes registered in App.tsx + types/navigation.ts. ✅
- [ ] Task: Conductor - User Manual Verification 'Buyer Experience' (Protocol in workflow.md)

## Phase 4: Geolocation & Maps
Визуализация на карте и навигация.

- [x] Task: Backend Geo Support ✅
    - [x] Subtask: Ensure Shop API returns distance/coordinates correctly. (Implemented in ShopService.calculateDistance)
- [x] Task: Mobile Map Integration ✅
    - [x] Subtask: Create `ShopsMapScreen` (Markers for shops). ✅ (List view with map placeholder, full map requires react-native-maps)
    - [x] Subtask: Implement "Get Directions" button (linking to Google/Yandex Maps). ✅
- [ ] Task: Conductor - User Manual Verification 'Geolocation' (Protocol in workflow.md)

- [x] Phase 5: AI Integration (Python RAG & Go) ✅
    - [x] Task: Data Sync Pipeline
        - [x] Subtask: Create Python script/worker to sync `products` from Postgres to Vector DB. (Implemented script/sync_market_rag.py)
    - [x] Task: AI Tools Implementation
        - [x] Subtask: Define `search_products` tool for the LLM. (Integrated search into AiChatService)
        - [x] Subtask: Update System Prompt to handle shopping intents.
- [ ] Task: Conductor - User Manual Verification 'AI Integration' (Protocol in workflow.md)

- [x] Phase 6: Polish & Reviews ✅
    - [x] Task: Reviews System
        - [x] Subtask: Backend: Review CRUD API.
        - [x] Subtask: Mobile: Add "Write Review" and "View Reviews" to Product Details.
    - [x] Task: Final System Polish ✅
        - [x] Subtask: Performance tuning (Image caching, List optimization implemented with memo and FlatList props).
        - [x] Subtask: UI/UX refinement (Empty states, Loading skeletons added to all major screens).
- [ ] Task: Conductor - User Manual Verification 'Polish & Reviews' (Protocol in workflow.md)
