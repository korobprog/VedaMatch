#!/bin/bash
# Скрипт для установки Android эмулятора

export ANDROID_HOME=/home/maxim/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools

echo "Установка Android эмулятора..."

# Устанавливаем эмулятор и системный образ
source "$HOME/.sdkman/bin/sdkman-init.sh" 2>/dev/null
export JAVA_HOME="$HOME/.sdkman/candidates/java/current"

# Находим sdkmanager
SDKMANAGER=$(find $ANDROID_HOME -name "sdkmanager" -type f 2>/dev/null | head -1)

if [ -z "$SDKMANAGER" ]; then
    echo "❌ sdkmanager не найден"
    exit 1
fi

echo "Используется: $SDKMANAGER"
yes | $SDKMANAGER --sdk_root=$ANDROID_HOME \
    "emulator" \
    "platform-tools" \
    "platforms;android-35" \
    "system-images;android-35;google_apis;x86_64"

if [ $? -eq 0 ]; then
    echo ""
    echo "Создание AVD (Android Virtual Device)..."
    # Находим правильный путь к avdmanager
    AVDMANAGER=$(find $ANDROID_HOME -name "avdmanager" -type f 2>/dev/null | head -1)
    if [ -n "$AVDMANAGER" ]; then
        echo "no" | $AVDMANAGER create avd \
            -n ragagent_emulator \
            -k "system-images;android-35;google_apis;x86_64" \
            -d "pixel_5"
    else
        echo "avdmanager не найден, но эмулятор установлен"
    fi
    
    echo ""
    echo "Эмулятор установлен!"
    echo ""
    echo "Для запуска эмулятора:"
    echo "  $ANDROID_HOME/emulator/emulator -avd ragagent_emulator &"
    echo ""
    echo "Или добавьте в PATH:"
    echo "  export PATH=\$PATH:\$ANDROID_HOME/emulator"
else
    echo "Ошибка при установке эмулятора"
    exit 1
fi

