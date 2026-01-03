#!/bin/bash
# Скрипт для настройки Java 17 перед сборкой Android

source "$HOME/.sdkman/bin/sdkman-init.sh" 2>/dev/null

if [ -z "$JAVA_HOME" ]; then
    export JAVA_HOME="$HOME/.sdkman/candidates/java/current"
    export PATH="$JAVA_HOME/bin:$PATH"
fi

echo "Java 17 настроена:"
java -version
echo ""
echo "JAVA_HOME: $JAVA_HOME"

