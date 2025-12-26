#!/bin/bash

# Настройка путей
export ANDROID_HOME=${ANDROID_HOME:-$HOME/Android/Sdk}
export ANDROID_SDK_ROOT=$ANDROID_HOME
export PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools

# Проверяем, есть ли уже запущенный ЭМУЛЯТОР (не физическое устройство)
EMULATOR_DEVICE=$(adb devices 2>/dev/null | grep "^emulator-" | grep "device$" | head -1 | cut -f1)
if [ -n "$EMULATOR_DEVICE" ]; then
    BOOT_STATUS=$(adb -s "$EMULATOR_DEVICE" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')
    if [ "$BOOT_STATUS" == "1" ]; then
        echo "✅ Эмулятор $EMULATOR_DEVICE уже запущен и готов"
        echo "🔄 Настройка проброса портов..."
        adb -s "$EMULATOR_DEVICE" reverse tcp:8081 tcp:8081
        adb -s "$EMULATOR_DEVICE" reverse tcp:8082 tcp:8082
        exit 0
    fi
fi

# Запускаем эмулятор с аппаратным ускорением GPU
echo "🚀 Запуск эмулятора ragagent_emulator (Hardware GPU)..."
# host — использует GPU хоста для ускорения (быстрее и стабильнее)
$ANDROID_HOME/emulator/emulator -avd ragagent_emulator \
    -no-snapshot-load \
    -gpu host \
    -no-audio \
    -no-boot-anim \
    -accel on > /tmp/emulator.log 2>&1 &

echo "⏳ Ожидание загрузки Android OS (до 5 минут)..."
for i in {1..100}; do
    sleep 3
    # Проверяем не только наличие устройства, но и завершение загрузки системы
    STATUS=$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')
    if [ "$STATUS" == "1" ]; then
        echo ""
        echo "✅ Эмулятор полностью загружен и готов!"
        echo "🔄 Настройка проброса портов..."
        adb reverse tcp:8081 tcp:8081
        adb reverse tcp:8082 tcp:8082
        exit 0
    fi
    echo -n "."
done

echo ""
echo "❌ Ошибка: Эмулятор не загрузился за отведенное время."
echo "Проверьте логи: tail -f /tmp/emulator.log"
exit 1
