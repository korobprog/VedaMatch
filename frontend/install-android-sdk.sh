#!/bin/bash
# Скрипт для установки Android SDK

echo "Установка Android SDK Command Line Tools..."

ANDROID_SDK_DIR="$HOME/Android/Sdk"
mkdir -p "$ANDROID_SDK_DIR"

# Скачиваем Command Line Tools
cd /tmp
wget -q https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip -O android-tools.zip

if [ $? -eq 0 ]; then
    echo "Распаковка Android Command Line Tools..."
    unzip -q android-tools.zip -d "$ANDROID_SDK_DIR"
    
    # Создаем правильную структуру директорий
    mkdir -p "$ANDROID_SDK_DIR/cmdline-tools"
    if [ -d "$ANDROID_SDK_DIR/cmdline-tools" ] && [ ! -d "$ANDROID_SDK_DIR/cmdline-tools/latest" ]; then
        # Перемещаем содержимое в latest
        mv "$ANDROID_SDK_DIR/cmdline-tools"/* "$ANDROID_SDK_DIR/cmdline-tools/latest" 2>/dev/null || true
    fi
    
    # Находим sdkmanager
    SDKMANAGER=$(find "$ANDROID_SDK_DIR" -name "sdkmanager" -type f 2>/dev/null | head -1)
    
    if [ -n "$SDKMANAGER" ] && [ -f "$SDKMANAGER" ]; then
        # Устанавливаем необходимые компоненты
        echo "Установка Android SDK компонентов..."
        "$SDKMANAGER" --sdk_root="$ANDROID_SDK_DIR" \
            "platform-tools" \
            "platforms;android-35" \
            "build-tools;35.0.0" \
            "cmdline-tools;latest" \
            --accept-licenses
    else
        echo "sdkmanager не найден. Попробуйте установить Android Studio вручную."
    fi
    
    # Обновляем local.properties
    echo "sdk.dir=$ANDROID_SDK_DIR" > "$HOME/Documents/Rag-agent/frontend/android/local.properties"
    
    echo ""
    echo "Android SDK установлен в: $ANDROID_SDK_DIR"
    echo ""
    echo "Добавьте в ~/.bashrc или ~/.zshrc:"
    echo "export ANDROID_HOME=$ANDROID_SDK_DIR"
    echo "export PATH=\$PATH:\$ANDROID_HOME/platform-tools:\$ANDROID_HOME/tools"
    
    rm -f android-tools.zip
else
    echo "Ошибка при скачивании Android SDK"
    exit 1
fi

