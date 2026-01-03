#!/bin/bash
# Скрипт для быстрого запуска Android эмулятора

source ~/.bashrc 2>/dev/null

if [ -z "$ANDROID_HOME" ]; then
    export ANDROID_HOME=$HOME/Android/Sdk
fi
export ANDROID_SDK_ROOT=$ANDROID_HOME

# Проверяем наличие эмулятора
if [ ! -f "$ANDROID_HOME/emulator/emulator" ]; then
    echo "❌ Эмулятор не установлен"
    echo ""
    echo "Установите эмулятор:"
    echo "  ./setup-emulator.sh"
    exit 1
fi

# Список доступных AVD
AVDS=$($ANDROID_HOME/emulator/emulator -list-avds 2>/dev/null)

if [ -z "$AVDS" ]; then
    echo "❌ Нет созданных AVD (Android Virtual Devices)"
    echo ""
    echo "Создайте AVD через Android Studio или выполните:"
    echo "  ./setup-emulator.sh"
    exit 1
fi

# Выбираем первый доступный AVD
FIRST_AVD=$(echo "$AVDS" | head -1)

echo "🚀 Запуск эмулятора: $FIRST_AVD"
echo ""

# Запускаем эмулятор в фоне
$ANDROID_HOME/emulator/emulator -avd "$FIRST_AVD" > /dev/null 2>&1 &

echo "⏳ Ожидание загрузки эмулятора..."
echo "   Это может занять 1-2 минуты"
echo ""

# Ждем пока эмулятор загрузится
for i in {1..60}; do
    sleep 2
    if adb devices 2>/dev/null | grep "^emulator-" | grep -q "device$"; then
        echo "✅ Эмулятор готов!"
        adb devices
        exit 0
    fi
    echo -n "."
done

echo ""
echo "⚠️  Эмулятор запускается, но еще не готов"
echo "   Проверьте статус: adb devices"
exit 0

