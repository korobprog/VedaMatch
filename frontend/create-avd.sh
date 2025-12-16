#!/bin/bash
# Скрипт для создания Android Virtual Device (AVD)

source ~/.bashrc 2>/dev/null
source "$HOME/.sdkman/bin/sdkman-init.sh" 2>/dev/null
export JAVA_HOME="$HOME/.sdkman/candidates/java/current"

if [ -z "$ANDROID_HOME" ]; then
    export ANDROID_HOME=$HOME/Android/Sdk
fi

echo "Создание Android Virtual Device..."

# Проверяем наличие системного образа
SYSTEM_IMAGE=$($ANDROID_HOME/cmdline-tools/bin/sdkmanager --sdk_root=$ANDROID_HOME --list 2>/dev/null | grep "system-images;android-35;google_apis;x86_64" | head -1)

if [ -z "$SYSTEM_IMAGE" ]; then
    echo "Установка системного образа Android 35..."
    yes | $ANDROID_HOME/cmdline-tools/bin/sdkmanager --sdk_root=$ANDROID_HOME \
        "system-images;android-35;google_apis;x86_64"
fi

# Находим avdmanager
AVDMANAGER=$(find $ANDROID_HOME -name "avdmanager" -type f 2>/dev/null | head -1)

if [ -z "$AVDMANAGER" ]; then
    echo "❌ avdmanager не найден"
    echo "Установите Command Line Tools:"
    echo "  $ANDROID_HOME/cmdline-tools/bin/sdkmanager --sdk_root=$ANDROID_HOME 'cmdline-tools;latest'"
    exit 1
fi

echo "Создание AVD 'ragagent_emulator'..."
echo "no" | $AVDMANAGER create avd \
    -n ragagent_emulator \
    -k "system-images;android-35;google_apis;x86_64" \
    -d "pixel_5" \
    --force

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ AVD создан успешно!"
    echo ""
    echo "Запустите эмулятор:"
    echo "  ./start-emulator.sh"
else
    echo "❌ Ошибка при создании AVD"
    exit 1
fi

