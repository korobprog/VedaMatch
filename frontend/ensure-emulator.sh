#!/bin/bash

source ~/.bashrc 2>/dev/null
export ANDROID_HOME=${ANDROID_HOME:-$HOME/Android/Sdk}
export PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools

# Проверяем, есть ли уже запущенное устройство
if adb devices 2>/dev/null | grep -q "device$"; then
    echo "✅ Устройство уже подключено"
    exit 0
fi

# Проверяем, запускается ли эмулятор
if adb devices 2>/dev/null | grep -q "offline"; then
    echo "⏳ Эмулятор загружается..."
    for i in {1..30}; do
        sleep 2
        if adb devices 2>/dev/null | grep -q "device$"; then
            echo "✅ Эмулятор готов!"
            exit 0
        fi
    done
fi

# Запускаем эмулятор, если его нет
echo "🚀 Запуск эмулятора ragagent_emulator..."
$ANDROID_HOME/emulator/emulator -avd ragagent_emulator -no-snapshot-load > /dev/null 2>&1 &

echo "⏳ Ожидание загрузки эмулятора (это может занять 1-2 минуты)..."
for i in {1..30}; do
    sleep 2
    if adb devices 2>/dev/null | grep -q "device$"; then
        echo "✅ Эмулятор готов!"
        exit 0
    fi
    echo -n "."
done

echo ""
echo "⚠️  Эмулятор запускается, но еще не готов"
echo "   Проверьте статус: adb devices"
exit 0

