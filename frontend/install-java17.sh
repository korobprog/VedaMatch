#!/bin/bash
# Скрипт для установки Java 17

echo "Установка Java 17 OpenJDK..."
sudo dnf install -y java-17-openjdk java-17-openjdk-devel

if [ $? -eq 0 ]; then
    echo ""
    echo "Java 17 успешно установлена!"
    echo ""
    echo "Для использования Java 17 установите JAVA_HOME:"
    echo "export JAVA_HOME=/usr/lib/jvm/java-17-openjdk"
    echo ""
    echo "Или добавьте в ~/.bashrc:"
    echo "export JAVA_HOME=/usr/lib/jvm/java-17-openjdk"
    echo "export PATH=\$JAVA_HOME/bin:\$PATH"
else
    echo "Ошибка при установке Java 17"
    exit 1
fi

