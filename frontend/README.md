# RagAgent

React Native приложение

## Требования

- Node.js 20.19.4+
- Java 17 (JDK)
- Android SDK
- Android Studio (опционально, для эмулятора)

## Установка

```bash
pnpm install
```

## Настройка окружения

Переменные окружения настроены в `~/.bashrc`:
- `ANDROID_HOME=$HOME/Android/Sdk`
- `PATH` включает `$ANDROID_HOME/emulator` и `$ANDROID_HOME/platform-tools`

После изменения `~/.bashrc` выполните:
```bash
source ~/.bashrc
```

### Настройка API ключа для чата

Установите переменную окружения `API_OPEN_AI` с вашим API ключом от RVFreeLLM:
```bash
export API_OPEN_AI="ваш_api_ключ"
```

Для получения API ключа: @FreeApiLLMbot в Telegram

Настройки моделей можно изменить в `config/models.config.ts`

## Запуск

### Metro bundler
```bash
pnpm start
```

### Android
```bash
# Убедитесь, что Metro bundler запущен в другом терминале
pnpm android
```

**Требования для запуска Android:**
- Подключенное Android устройство (с включенной отладкой по USB)
- ИЛИ запущенный Android эмулятор

### Проверка подключенных устройств
```bash
adb devices
```

## Установка и запуск эмулятора (опционально)

### Быстрый способ:
```bash
# 1. Создать AVD (Android Virtual Device)
./create-avd.sh

# 2. Запустить эмулятор
./start-emulator.sh

# 3. После загрузки эмулятора запустить приложение
pnpm android
```

### Полная установка (если эмулятор не установлен):
```bash
./setup-emulator.sh
```

## Структура проекта

- `App.tsx` - главный компонент приложения
- `android/` - нативная Android часть
- `index.js` - точка входа

## Дополнительно

- Watchman (опционально) - для улучшения производительности файлового мониторинга
- Android Studio - для визуального управления эмуляторами и устройствами
