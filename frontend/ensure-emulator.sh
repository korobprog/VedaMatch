#!/bin/bash

# Настройка путей
export ANDROID_HOME=${ANDROID_HOME:-$HOME/Android/Sdk}
export PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools

# Проверяем, есть ли уже запущенное и полностью готовое устройство
if adb devices 2>/dev/null | grep -q "device$"; then
    BOOT_STATUS=$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')
    if [ "$BOOT_STATUS" == "1" ]; then
        echo "✅ Устройство уже подключено и готово"
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

echo "⏳ Ожидание загрузки Android OS (это может занять 2-3 минуты)..."
for i in {1..60}; do
    sleep 3
    # Проверяем не только наличие устройства, но и завершение загрузки системы
    STATUS=$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')
    if [ "$STATUS" == "1" ]; then
        echo ""
        echo "✅ Эмулятор полностью загружен и готов!"
        exit 0
    fi
    echo -n "."
done

echo ""
echo "❌ Ошибка: Эмулятор не загрузился за отведенное время."
echo "Проверьте логи: tail -f /tmp/emulator.log"
exit 1
