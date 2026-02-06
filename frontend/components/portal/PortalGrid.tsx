import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    Alert,
    FlatList,
    TouchableOpacity,
    TextInput,
    Pressable,
    Platform,
    UIManager,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
    GestureDetector,
    Gesture,
    GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    runOnJS,
    FadeIn,
    FadeOut,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import { Plus, FolderPlus, LayoutGrid, Settings } from 'lucide-react-native';
import { useSettings } from '../../context/SettingsContext';
import { usePortalLayout } from '../../context/PortalLayoutContext';
import { DEFAULT_SERVICES, PortalItem, PortalFolder as PortalFolderType, FOLDER_COLORS } from '../../types/portal';
import { PortalIcon } from './PortalIcon';
import { PortalFolderComponent } from './PortalFolder';
import { FolderModal } from './FolderModal';
import { ClockWidget } from './ClockWidget';
import { CalendarWidget } from './CalendarWidget';
import { PortalWidgetWrapper } from './PortalWidgetWrapper';
import { DraggablePortalItem } from './DraggablePortalItem';
import { SkeletonIcon } from './SkeletonIcon';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PortalGridProps {
    onServicePress: (serviceId: string) => void;
    onCloseDrawer?: () => void; // Optional callback to close drawer when navigating
}

export const PortalGrid: React.FC<PortalGridProps> = ({ onServicePress, onCloseDrawer }) => {
    const navigation = useNavigation<any>();
    const { vTheme, isDarkMode, portalBackgroundType } = useSettings();
    const {
        layout,
        isEditMode,
        setEditMode,
        currentPage,
        setCurrentPage,
        createNewFolder,
        renameFolder,
        changeFolderColor,
        deleteFolder,
        removeItemFromFolder,
        addWidget,
        removeWidget,
        addNewPage,
        moveItemToFolder,
        moveItemToQuickAccess,
    } = usePortalLayout();

    const [isReady, setIsReady] = useState(false); // Delay rendering to prevent layout jumps

    const [newFolderName, setNewFolderName] = useState('');
    const [selectedFolder, setSelectedFolder] = useState<PortalFolderType | null>(null);
    const [showFolderModal, setShowFolderModal] = useState(false);
    const [showNewFolderInput, setShowNewFolderInput] = useState(false);
    const [isDraggingItem, setIsDraggingItem] = useState(false);
    const itemLayouts = useRef<Record<string, { x: number; y: number; width: number; height: number }>>({});
    const itemRefs = useRef<Record<string, View | null>>({});
    const gridRef = useRef<View>(null);

    // Dock references
    const dockRef = useRef<View>(null);
    const dockOffset = useRef<{ x: number; y: number; width: number; height: number }>({ x: 0, y: 0, width: 0, height: 0 });

    // Clear layouts on page change to avoid stale data
    useEffect(() => {
        itemLayouts.current = {};
    }, [currentPage]);

    // Delay rendering to allow layout to settle
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsReady(true);
        }, 1200); // Extended time to ensure smooth transition
        return () => clearTimeout(timer);
    }, []);

    const page = layout.pages[currentPage];
    const items = page?.items || [];
    const widgets = page?.widgets || [];
    const quickAccess = layout.quickAccess || [];

    // Handle long press on background to enter edit mode
    const handleLongPress = useCallback(() => {
        if (!isDraggingItem) {
            setEditMode(true);
        }
    }, [setEditMode, isDraggingItem]);

    // Handle drag start - don't enter edit mode, just start dragging
    const handleDragStart = useCallback(() => {
        setIsDraggingItem(true);
    }, []);

    // Handle tap outside to exit edit mode
    const handleBackgroundTap = useCallback(() => {
        if (isEditMode) {
            setEditMode(false);
        }
    }, [isEditMode, setEditMode]);

    // Handle folder press
    const handleFolderPress = useCallback((folder: PortalFolderType, force: boolean = false) => {
        if (isEditMode && !force) {
            return;
        }
        setSelectedFolder(folder);
        setShowFolderModal(true);
    }, [isEditMode]);

    // Handle item press inside folder
    const handleFolderItemPress = useCallback((item: PortalItem) => {
        setShowFolderModal(false);
        onServicePress(item.serviceId);
    }, [onServicePress]);

    // Handle service icon press
    const handleServicePress = useCallback((serviceId: string) => {
        if (isEditMode) return;
        onServicePress(serviceId);
    }, [isEditMode, onServicePress]);

    // Create new folder
    const handleCreateFolder = useCallback(() => {
        if (newFolderName.trim()) {
            createNewFolder(newFolderName.trim(), FOLDER_COLORS[Math.floor(Math.random() * FOLDER_COLORS.length)]);
            setNewFolderName('');
            setShowNewFolderInput(false);
        }
    }, [newFolderName, createNewFolder]);

    const handleItemLayout = (id: string, event: any) => {
        const { x, y, width, height } = event.nativeEvent.layout;
        itemLayouts.current[id] = { x, y, width, height };
    };

    const handleGridLayout = useCallback(() => {
        if (gridRef.current) {
            (gridRef.current as any).measureInWindow((x: number, y: number, _w: number, _h: number) => {
                if (x !== undefined && y !== undefined) {
                    // gridOffset.current = { x, y };
                }
            });
        }
    }, []);

    const handleDockLayout = useCallback(() => {
        if (dockRef.current) {
            (dockRef.current as any).measureInWindow((x: number, y: number, width: number, height: number) => {
                if (x !== undefined && y !== undefined) {
                    dockOffset.current = { x, y, width, height };
                }
            });
        }
    }, []);

    const handleDragEnd = useCallback((itemId: string, absX: number, absY: number) => {
        setIsDraggingItem(false);

        if (!page) return;

        // 1. Check Quick Access Dock collision
        const margin = 30;
        const d = dockOffset.current;
        const isInsideDock = (
            absX >= d.x - margin &&
            absX <= d.x + d.width + margin &&
            absY >= d.y - margin &&
            absY <= d.y + d.height + margin
        );

        if (isInsideDock) {
            // Find specific slot in dock
            const slotWidth = d.width / 3;
            const slotIndex = Math.min(2, Math.floor((absX - d.x) / slotWidth));

            console.log('[DragEnd] ✅ Moving item to Quick Access slot:', slotIndex);
            runOnJS(moveItemToQuickAccess)(itemId, slotIndex);
            return;
        }

        // 2. Check if item was in Dock and dropped outside -> Move back to Grid
        const isInDock = quickAccess.some(i => i.id === itemId);
        if (isInDock && !isInsideDock) {
            console.log('[DragEnd] ⬇️ Moving item back to grid from dock');
            runOnJS(moveItemToQuickAccess)(itemId, -1);
            return;
        }

        // 3. Check folders collision
        const folders = page.items.filter(i => i.type === 'folder');
        if (folders.length === 0) return;

        let foundFolder: string | null = null;
        let measureCount = 0;
        const totalFolders = folders.length;

        const checkComplete = () => {
            measureCount++;
            if (measureCount >= totalFolders) {
                if (foundFolder) {
                    runOnJS(moveItemToFolder)(itemId, foundFolder);
                }
            }
        };

        folders.forEach(folder => {
            const ref = itemRefs.current[folder.id];
            if (ref) {
                (ref as any).measureInWindow((x: number, y: number, width: number, height: number) => {
                    if (x !== undefined && y !== undefined && width > 0 && height > 0) {
                        const folderMargin = 50;
                        const isInsideFolder = (
                            absX >= x - folderMargin &&
                            absX <= x + width + folderMargin &&
                            absY >= y - folderMargin &&
                            absY <= y + height + folderMargin
                        );
                        if (isInsideFolder && !foundFolder) foundFolder = folder.id;
                    }
                    checkComplete();
                });
            } else {
                checkComplete();
            }
        });
    }, [page, quickAccess, moveItemToFolder, moveItemToQuickAccess]);


    // Render individual grid item
    const renderItem = useCallback((item: PortalItem | PortalFolderType) => {
        if (!isReady) {
            return (
                <Animated.View
                    key={`skeleton-${item.id}`}
                    style={{ pointerEvents: 'none' }}
                    exiting={FadeOut.duration(300)}
                >
                    <SkeletonIcon />
                </Animated.View>
            );
        }

        let component = null;
        let pressHandler: () => void;

        if (item.type === 'folder') {
            pressHandler = () => handleFolderPress(item);
            component = (
                <View
                    pointerEvents="none"
                    ref={(ref) => { itemRefs.current[item.id] = ref; }}
                >
                    <PortalFolderComponent
                        folder={item}
                        isEditMode={isEditMode}
                        onPress={() => { }}
                        onLongPress={() => { }}
                        size={layout.iconSize}
                    />
                </View>
            );
        } else {
            const service = DEFAULT_SERVICES.find(s => s.id === item.serviceId);
            if (!service) return null;
            pressHandler = () => handleServicePress(item.serviceId);
            component = (
                <View pointerEvents="none">
                    <PortalIcon
                        service={service}
                        isEditMode={isEditMode}
                        onPress={() => { }}
                        onLongPress={() => { }}
                        size={layout.iconSize}
                    />
                </View>
            );
        }

        return (
            <Animated.View key={item.id} entering={FadeIn.duration(500)}>
                <DraggablePortalItem
                    id={item.id}
                    isEditMode={isEditMode}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onLayout={(e) => handleItemLayout(item.id, e)}
                    onPress={pressHandler}
                    onSecondaryLongPress={item.type === 'folder'
                        ? () => handleFolderPress(item as PortalFolderType, true)
                        : () => setEditMode(true)
                    }
                >
                    {component}
                </DraggablePortalItem>
            </Animated.View>
        );
    }, [isReady, isEditMode, layout.iconSize, handleDragStart, handleFolderPress, handleServicePress, handleDragEnd, setEditMode]);

    // Render dock item
    const renderDockItem = useCallback((item: PortalItem, index: number) => {
        const service = DEFAULT_SERVICES.find(s => s.id === item.serviceId);
        if (!service) return null;

        return (
            <DraggablePortalItem
                key={item.id}
                id={item.id}
                isEditMode={isEditMode}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onPress={() => onServicePress(item.serviceId)}
                onSecondaryLongPress={() => setEditMode(true)}
            >
                <View
                    pointerEvents="none"
                    style={styles.dockItemWrapper}
                >
                    <PortalIcon
                        service={service}
                        isEditMode={isEditMode}
                        onPress={() => { }}
                        onLongPress={() => { }}
                        size={layout.iconSize}
                        showLabel={false}
                    />
                </View>
            </DraggablePortalItem>
        );
    }, [isEditMode, layout.iconSize, handleDragStart, handleDragEnd, onServicePress, setEditMode]);

    // Render widget
    const renderWidget = useCallback((widget: { id: string; type: 'clock' | 'calendar'; size: string }) => {
        let widgetComponent = null;
        switch (widget.type) {
            case 'clock':
                widgetComponent = <ClockWidget size={widget.size as any} />;
                break;
            case 'calendar':
                widgetComponent = <CalendarWidget />;
                break;
        }

        if (!widgetComponent) return null;

        return (
            <PortalWidgetWrapper
                key={widget.id}
                isEditMode={isEditMode}
                onRemove={() => removeWidget(widget.id)}
            >
                {widgetComponent}
            </PortalWidgetWrapper>
        );
    }, [isEditMode, removeWidget]);

    // Page indicator dots
    const renderPageDots = () => (
        <View style={styles.pageDotsContainer}>
            {layout.pages.map((_, index) => (
                <TouchableOpacity
                    key={index}
                    onPress={() => setCurrentPage(index)}
                    style={[
                        styles.pageDot,
                        {
                            backgroundColor: index === currentPage
                                ? vTheme.colors.primary
                                : portalBackgroundType === 'image' ? 'rgba(255,255,255,0.5)' : vTheme.colors.textSecondary,
                        },
                        index === currentPage && styles.activePageDot,
                    ]}
                />
            ))}
            <TouchableOpacity
                onPress={() => {
                    Alert.alert(
                        'Новая страница',
                        'Создать новую страницу портала?',
                        [
                            { text: 'Отмена', style: 'cancel' },
                            {
                                text: 'Создать',
                                onPress: () => {
                                    addNewPage();
                                }
                            },
                        ]
                    );
                }}
                style={[styles.addPageButton, { borderColor: portalBackgroundType === 'image' ? '#ffffff' : vTheme.colors.textSecondary }]}
            >
                <Plus size={10} color={portalBackgroundType === 'image' ? '#ffffff' : vTheme.colors.textSecondary} />
            </TouchableOpacity>
        </View>
    );

    // Edit mode toolbar
    const renderEditToolbar = () => (
        <Animated.View
            style={[
                styles.editToolbar,
                {
                    backgroundColor: isDarkMode ? '#1A1A1A' : '#F5F5F5',
                    borderColor: vTheme.colors.primary,
                }
            ]}
        >
            <TouchableOpacity
                onPress={() => setShowNewFolderInput(true)}
                style={styles.toolbarButton}
            >
                <FolderPlus size={20} color={vTheme.colors.primary} />
                <Text style={[styles.toolbarText, { color: vTheme.colors.text }]}>Папка</Text>
            </TouchableOpacity>

            <TouchableOpacity
                onPress={() => {
                    onCloseDrawer?.();
                    navigation.navigate('WidgetSelection');
                }}
                style={styles.toolbarButton}
            >
                <LayoutGrid size={20} color={vTheme.colors.primary} />
                <Text style={[styles.toolbarText, { color: vTheme.colors.text }]}>Виджет</Text>
            </TouchableOpacity>

            <TouchableOpacity
                onPress={() => setEditMode(false)}
                style={[styles.doneButton, { backgroundColor: vTheme.colors.primary }]}
            >
                <Text style={styles.doneText}>Готово</Text>
            </TouchableOpacity>
        </Animated.View>
    );

    return (
        <View style={styles.container}>
            <View
                style={styles.gridContainer}
            >
                {widgets.length > 0 && (
                    <View style={styles.widgetsContainer}>
                        {widgets.map(renderWidget)}
                    </View>
                )}

                <Animated.ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    <Pressable
                        onLongPress={handleLongPress}
                        onPress={handleBackgroundTap}
                        style={styles.scrollPressable}
                    >
                        <View
                            ref={gridRef}
                            onLayout={handleGridLayout}
                            style={styles.grid}
                        >
                            {items.map(renderItem)}
                        </View>
                    </Pressable>
                </Animated.ScrollView>

                {showNewFolderInput && (
                    <View style={[
                        styles.newFolderContainer,
                        {
                            backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF',
                            borderColor: vTheme.colors.primary,
                        }
                    ]}>
                        <TextInput
                            style={[styles.newFolderInput, { color: vTheme.colors.text }]}
                            placeholder="Название папки..."
                            placeholderTextColor={vTheme.colors.textSecondary}
                            value={newFolderName}
                            onChangeText={setNewFolderName}
                            autoFocus
                            onSubmitEditing={handleCreateFolder}
                        />
                        <TouchableOpacity onPress={handleCreateFolder} style={styles.createButton}>
                            <Text style={[styles.createText, { color: vTheme.colors.primary }]}>Создать</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setShowNewFolderInput(false)}>
                            <Text style={[styles.cancelText, { color: vTheme.colors.textSecondary }]}>Отмена</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {/* Elegant Divider Line */}
            <LinearGradient
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                colors={isDarkMode
                    ? ['transparent', 'rgba(255,255,255,0.08)', 'rgba(255,255,255,0.2)', 'rgba(255,255,255,0.08)', 'transparent']
                    : ['transparent', 'rgba(0,0,0,0.02)', 'rgba(0,0,0,0.1)', 'rgba(0,0,0,0.02)', 'transparent']}
                style={styles.dockDivider}
            />

            {/* Floating Dock Area */}
            <View style={styles.quickAccessDock}>
                <View
                    ref={dockRef}
                    onLayout={handleDockLayout}
                    style={styles.dockItems}
                >
                    {quickAccess.map(renderDockItem)}
                    {[...Array(Math.max(0, 3 - quickAccess.length))].map((_, i) => (
                        <View key={`empty-${i}`} style={[
                            styles.emptyDockSlot,
                            { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' }
                        ]} />
                    ))}
                </View>
            </View>

            {layout.pages.length > 1 && renderPageDots()}

            {isEditMode && renderEditToolbar()}

            {selectedFolder && (
                <FolderModal
                    visible={showFolderModal}
                    folder={selectedFolder}
                    onClose={() => {
                        setShowFolderModal(false);
                        setSelectedFolder(null);
                    }}
                    onRename={(newName) => renameFolder(selectedFolder.id, newName)}
                    onChangeColor={(newColor) => changeFolderColor(selectedFolder.id, newColor)}
                    onItemPress={handleFolderItemPress}
                    onRemoveItem={(itemId) => removeItemFromFolder(selectedFolder.id, itemId)}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    gridContainer: {
        flex: 1,
        paddingHorizontal: 8,
        paddingTop: 0,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 160, // Extra space to scroll above the floating dock
    },
    scrollPressable: {
        flex: 1,
    },
    widgetsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        marginBottom: 16,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
        backgroundColor: 'transparent', // Fix shadow warning
    },
    quickAccessDock: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        height: 80,
        justifyContent: 'center',
        paddingHorizontal: 20,
        backgroundColor: 'transparent', // Fix shadow warning
    },
    dockDivider: {
        position: 'absolute',
        bottom: 110, // Just above the dock
        left: 40,
        right: 40,
        height: 1,
    },
    dockItems: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    dockItemWrapper: {
        width: 60,
        height: 60,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyDockSlot: {
        width: 60,
        height: 60,
        borderRadius: 30,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        borderStyle: 'dashed',
    },
    pageDotsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 12,
    },
    pageDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginHorizontal: 4,
        opacity: 0.4,
    },
    activePageDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        opacity: 1,
    },
    addPageButton: {
        width: 14,
        height: 14,
        borderRadius: 7,
        borderWidth: 1,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    editToolbar: {
        position: 'absolute',
        bottom: 120,
        left: 20,
        right: 20,
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 20,
        borderWidth: 1,
        // Add transparent background to fix shadow warning if no other bg is applied
        backgroundColor: 'transparent',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 10,
    },
    toolbarButton: {
        alignItems: 'center',
    },
    toolbarText: {
        fontSize: 10,
        marginTop: 4,
    },
    doneButton: {
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 16,
    },
    doneText: {
        color: '#FFF',
        fontWeight: '600',
        fontSize: 14,
    },
    newFolderContainer: {
        position: 'absolute',
        top: '40%',
        left: 20,
        right: 20,
        padding: 16,
        borderRadius: 16,
        borderWidth: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 15,
    },
    newFolderInput: {
        fontSize: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
        marginBottom: 12,
    },
    createButton: {
        alignSelf: 'flex-end',
        marginBottom: 8,
    },
    createText: {
        fontSize: 16,
        fontWeight: '600',
    },
    cancelText: {
        alignSelf: 'flex-end',
        fontSize: 14,
    },
});
