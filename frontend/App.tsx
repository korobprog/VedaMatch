import React, { useState, useRef } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useColorScheme,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  ImageBackground,
  ActivityIndicator,
} from 'react-native';
import RegistrationScreen from './RegistrationScreen';
import { sendMessage, ChatMessage } from './services/openaiService';
import { SettingsDrawer } from './SettingsDrawer';
// import { modelsConfig } from './config/models.config'; // Removed as it is used in context now
import { SettingsProvider, useSettings } from './context/SettingsContext';

// Premium Yogic Palette: "Solid, Grounded, Earthy & Noble"
const COLORS = {
  // Dark mode: Deep Himalayan Night (Charcoal, Bronze, Slate)
  dark: {
    background: '#121212', // Near black, very solid
    header: '#1E1E1E',     // Matrix grey/Dark stone
    inputBackground: '#2C2C2C',
    inputText: '#E0E0E0',  // Light grey, readable
    userBubble: '#8D6E63', // Muted Earth/Bronze
    botBubble: '#263238',  // Dark Blue Grey (Slate)
    text: '#E0E0E0',
    subText: '#9E9E9E',
    borderColor: '#333333',
    menuBackground: '#1E1E1E',
    iconColor: '#D7CCC8',  // Pale bronze
    accent: '#FFB74D',     // Subtle Gold for highlights
  },
  // Light mode: Vedic Temple Day (Warm Stone, Copper, Clay)
  light: {
    background: '#F5F5F0', // Warm grey/stone (not yellow)
    header: '#FFFFFF',     // Clean white surface
    inputBackground: '#FFFFFF',
    inputText: '#212121',  // Almost black
    userBubble: '#D7CCC8', // Pale Copper/Mushroom
    botBubble: '#FFFFFF',  // Clean White with shadow
    text: '#212121',
    subText: '#757575',
    borderColor: '#E0E0E0',
    menuBackground: '#FFFFFF',
    iconColor: '#5D4037',  // Deep Brown
    accent: '#A1887F',     // Muted Copper
  },
};

type Message = {
  id: string;
  text: string;
  sender: 'user' | 'bot';
};

const MENU_OPTIONS = ['Поиск друзей', 'Магазины', 'Новости', 'Календарь', 'Регистрация'];

// Main App Component wrapper to provide context
function AppWrapper(): React.JSX.Element {
  return (
    <SettingsProvider>
      <AppContent />
    </SettingsProvider>
  );
}

function AppContent(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';
  const theme = isDarkMode ? COLORS.dark : COLORS.light;
  const { currentModel, currentProvider, selectModel } = useSettings();

  const [currentScreen, setCurrentScreen] = useState<'chat' | 'registration'>('chat');
  const [inputText, setInputText] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  // State moved to Context
  // const [currentModel, setCurrentModel] = useState(modelsConfig.text.model);
  // const [currentProvider, setCurrentProvider] = useState(modelsConfig.text.provider);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Намасте. Я ваш ассистент. Чем могу быть полезен?',
      sender: 'bot',
    },
  ]);

  const flatListRef = useRef<FlatList>(null);

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessageText = inputText.trim();
    const newUserMessage: Message = {
      id: Date.now().toString(),
      text: userMessageText,
      sender: 'user',
    };

    setMessages((prev) => [...prev, newUserMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      // Формируем историю сообщений для API
      const chatMessages: ChatMessage[] = messages
        .filter((msg) => msg.sender !== 'bot' || msg.id !== '1') // Исключаем приветственное сообщение
        .map((msg) => ({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.text,
        })) as ChatMessage[];

      // Добавляем системное сообщение и текущее сообщение пользователя
      const messagesForAPI: ChatMessage[] = [
        {
          role: 'system',
          content: 'Ты полезный ассистент, отвечающий на русском языке. Отвечай кратко и по делу.',
        },
        ...chatMessages,
        {
          role: 'user',
          content: userMessageText,
        },
      ];

      // Отправляем запрос в API
      const response = await sendMessage(messagesForAPI, {
        model: currentModel,
        provider: currentProvider,
        // modelType: 'text', // No longer using default if model is explicit
      });

      // Добавляем ответ бота
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: response.content,
        sender: 'bot',
      };
      setMessages((prev) => [...prev, botResponse]);
    } catch (error: any) {
      // Показываем ошибку пользователю
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: `Ошибка: ${error.message || 'Не удалось получить ответ. Проверьте подключение к интернету и настройки API.'}`,
        sender: 'bot',
      };
      setMessages((prev) => [...prev, errorMessage]);
      console.error('Ошибка при отправке сообщения:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMenuOption = (option: string) => {
    setShowMenu(false);
    if (option === 'Регистрация') {
      setCurrentScreen('registration');
      return;
    }
    const systemMsg: Message = {
      id: Date.now().toString(),
      text: `Раздел: ${option}`,
      sender: 'bot',
    };
    setMessages((prev) => [...prev, systemMsg]);
  };

  const handleNewChat = () => {
    setMessages([
      {
        id: Date.now().toString(),
        text: 'Беседа обновлена.',
        sender: 'bot',
      }
    ]);
    setShowMenu(false);
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.sender === 'user';
    return (
      <View
        style={[
          styles.messageRow,
          isUser ? styles.userRow : styles.botRow,
        ]}
      >
        {isUser ? (
          <View style={[styles.bubble, { backgroundColor: theme.userBubble }]}>
            <Text style={[styles.messageText, { color: isDarkMode ? '#FFF' : '#3E2723' }]}>{item.text}</Text>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', maxWidth: '90%' }}>
            <View style={[styles.avatar, { backgroundColor: theme.botBubble, borderColor: theme.borderColor, borderWidth: 1 }]}>
              {/* Minimalist OM symbol */}
              <Text style={{ color: theme.iconColor, fontWeight: 'bold', fontSize: 18 }}>ॐ</Text>
            </View>
            <View style={[styles.bubble, { backgroundColor: theme.botBubble, marginLeft: 8, borderColor: theme.borderColor, borderWidth: isDarkMode ? 0 : 1 }]}>
              <Text style={[styles.messageText, { color: theme.text }]}>{item.text}</Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  if (currentScreen === 'registration') {
    return <RegistrationScreen isDarkMode={isDarkMode} onBack={() => setCurrentScreen('chat')} />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={theme.header}
      />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.header, borderBottomColor: theme.borderColor }]}>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => setIsSettingsOpen(true)}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
        >
          {/* Settings Icon (Hamburger) */}
          <Text style={{ fontSize: 24, color: theme.text }}>☰</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Vedic AI</Text>

        <TouchableOpacity
          style={styles.newChatButton}
          onPress={handleNewChat}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
        >
          {/* Minimalist Plus Icon */}
          <Text style={{ fontSize: 28, fontWeight: '300', color: theme.text }}>+</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.chatContainer, { backgroundColor: theme.background }]}>
        <ImageBackground
          source={require('./assets/krishna_bg.png')}
          style={{ flex: 1, justifyContent: "center" }}
          resizeMode="cover"
        >
          {/* Overlay for better readability */}
          <View style={{ flex: 1, backgroundColor: isDarkMode ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.6)' }}>
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
              onScrollBeginDrag={() => Keyboard.dismiss()}
            />
            {isLoading && (
              <View style={styles.loadingIndicator}>
                <ActivityIndicator size="small" color={theme.iconColor} />
                <Text style={[styles.loadingText, { color: theme.subText }]}>
                  Отправка...
                </Text>
              </View>
            )}
          </View>
        </ImageBackground>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        style={[styles.inputWrapper, { backgroundColor: theme.header, borderTopColor: theme.borderColor }]}
      >
        {/* Menu Pop-up */}
        {showMenu && (
          <View style={[styles.menuPopup, { backgroundColor: theme.menuBackground, borderColor: theme.borderColor }]}>
            <TouchableOpacity
              style={[
                styles.menuItem,
                { borderBottomWidth: 1, borderBottomColor: theme.borderColor }
              ]}
              onPress={handleNewChat}
            >
              <Text style={{ color: theme.text, fontSize: 16, fontWeight: '600' }}>Новый чат</Text>
            </TouchableOpacity>
            {MENU_OPTIONS.map((option, index) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.menuItem,
                  index < MENU_OPTIONS.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.borderColor }
                ]}
                onPress={() => handleMenuOption(option)}
              >
                <Text style={{ color: theme.text, fontSize: 16 }}>{option}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={[styles.inputContainer, { backgroundColor: theme.inputBackground, borderColor: theme.borderColor }]}>
          <TouchableOpacity
            style={styles.plusButton}
            onPress={() => setShowMenu(!showMenu)}
          >
            <Text style={[styles.plusText, { color: theme.subText }]}>•••</Text>
          </TouchableOpacity>

          <TextInput
            style={[styles.input, { color: theme.inputText }]}
            placeholder="Введите сообщение..."
            placeholderTextColor={theme.subText}
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={handleSendMessage}
            multiline
            editable={!isLoading}
          />
          <TouchableOpacity
            onPress={handleSendMessage}
            style={styles.sendButton}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={theme.iconColor} />
            ) : (
              <Text style={[styles.sendButtonText, { color: theme.iconColor }]}>↑</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <SettingsDrawer
        isVisible={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        isDarkMode={isDarkMode}
        currentModel={currentModel}
        onSelectModel={(model: any) => {
          selectModel(model.id, model.provider);
        }}
      />
    </SafeAreaView >
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: Platform.OS === 'android' ? 60 + (StatusBar.currentHeight || 0) : 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    borderBottomWidth: 0.5,
    elevation: 0, // Flat design for solid feel
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    zIndex: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  settingsButton: {
    padding: 10,
  },
  newChatButton: {
    padding: 10,
  },
  chatContainer: {
    flex: 1,
  },
  listContent: {
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  messageRow: {
    marginBottom: 16,
    width: '100%',
  },
  userRow: {
    alignItems: 'flex-end',
  },
  botRow: {
    alignItems: 'flex-start',
  },
  bubble: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 18,
    maxWidth: '80%',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 12, // Squircle
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 0.5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minHeight: 48,
    borderWidth: 1,
  },
  plusButton: {
    padding: 8,
  },
  plusText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  menuPopup: {
    position: 'absolute',
    bottom: 80,
    left: 20,
    width: 200,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  menuItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8,
    paddingHorizontal: 8,
    maxHeight: 120,
  },
  sendButton: {
    padding: 8,
    marginLeft: 4,
  },
  sendButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  loadingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
  },
});

export default AppWrapper;
