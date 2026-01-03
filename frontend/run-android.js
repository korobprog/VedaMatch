#!/usr/bin/env node

const { spawn, execSync } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

// Устанавливаем переменные окружения
process.env.REACT_NATIVE_PACKAGER_PORT = '8082';
process.env.PORT = '8082';
process.env.RCT_METRO_PORT = '8082';

// Функция для проверки наличия команды
function checkCommand(command) {
  try {
    execSync(`where ${command}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// Функция для проверки версии Java
function getJavaVersion(javaHome) {
  try {
    const javaExe = path.join(javaHome, 'bin', 'java.exe');
    if (!fs.existsSync(javaExe)) return null;
    const versionOutput = execSync(`"${javaExe}" -version`, { encoding: 'utf-8', stdio: 'pipe' });
    // Парсим версию из вывода типа "openjdk version "17.0.2""
    const match = versionOutput.match(/version "(\d+)/);
    if (match) {
      return parseInt(match[1], 10);
    }
  } catch {
    // Игнорируем ошибки
  }
  return null;
}

// Функция для поиска Java через where команду
function findJavaFromPath() {
  try {
    const javaPath = execSync('where java', { encoding: 'utf-8' }).trim().split('\n')[0];
    if (javaPath && fs.existsSync(javaPath)) {
      // Извлекаем JAVA_HOME из пути к java.exe (убираем \bin\java.exe)
      const javaHome = path.dirname(path.dirname(javaPath));
      if (fs.existsSync(path.join(javaHome, 'bin', 'java.exe'))) {
        return javaHome;
      }
    }
  } catch {
    // Игнорируем ошибки
  }
  return null;
}

// Функция для поиска Android SDK через where adb
function findAndroidFromPath() {
  try {
    const adbPath = execSync('where adb', { encoding: 'utf-8' }).trim().split('\n')[0];
    if (adbPath && fs.existsSync(adbPath)) {
      // Извлекаем ANDROID_HOME из пути к adb.exe
      // adb.exe находится в platform-tools, поэтому убираем platform-tools\adb.exe
      const platformTools = path.dirname(adbPath);
      const androidHome = path.dirname(platformTools);
      // Проверяем, что это действительно Android SDK (должны быть platform-tools и возможно emulator)
      if (fs.existsSync(path.join(androidHome, 'platform-tools', 'adb.exe'))) {
        return androidHome;
      }
    }
  } catch {
    // Игнорируем ошибки
  }
  return null;
}

// Функция для поиска всех JDK в директории
function findJDKsInDirectory(dir) {
  if (!dir || !fs.existsSync(dir)) return [];
  const jdks = [];
  try {
    const entries = fs.readdirSync(dir);
    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory() && (entry.startsWith('jdk') || entry.startsWith('java'))) {
        const javaExe = path.join(fullPath, 'bin', 'java.exe');
        if (fs.existsSync(javaExe)) {
          jdks.push(fullPath);
        }
      }
    }
  } catch {
    // Игнорируем ошибки
  }
  return jdks;
}

// На Windows используем переменные окружения из системы
if (os.platform() === 'win32') {
  // JAVA_HOME и ANDROID_HOME должны быть установлены в системных переменных
  // Если не установлены, пробуем найти автоматически
  if (!process.env.JAVA_HOME) {
    // Сначала пробуем найти через where java
    const javaFromPath = findJavaFromPath();
    if (javaFromPath) {
      const version = getJavaVersion(javaFromPath);
      // Проверяем версию - Gradle 8.9 не поддерживает Java 25+
      if (version && version >= 25) {
        console.warn(`⚠️  Java ${version} найдена через PATH, но слишком новая для Gradle 8.9: ${javaFromPath}`);
        console.warn('   Ищем Java 17 или 21 в стандартных местах...');
        // Продолжаем поиск в стандартных местах
      } else {
        process.env.JAVA_HOME = javaFromPath;
        console.log(`✅ Найден Java ${version || '?'} через PATH: ${javaFromPath}`);
      }
    }
    
    if (!process.env.JAVA_HOME) {
      // Ищем в стандартных местах
      const possibleJavaDirs = [
        'C:\\Program Files\\Java',
        'C:\\Program Files\\Eclipse Adoptium',
        process.env.PROGRAMFILES + '\\Java',
        process.env.PROGRAMFILES + '\\Eclipse Adoptium',
        process.env['PROGRAMFILES(X86)'] + '\\Java',
        process.env['PROGRAMFILES(X86)'] + '\\Eclipse Adoptium',
        process.env.LOCALAPPDATA + '\\Programs\\Eclipse Adoptium',
        process.env.USERPROFILE + '\\AppData\\Local\\Programs\\Eclipse Adoptium'
      ].filter(Boolean);
      
      // Сначала ищем конкретные версии (приоритет Java 17 и 21)
      const specificPaths = [
        'C:\\Program Files\\Java\\jdk-17',
        'C:\\Program Files\\Eclipse Adoptium\\jdk-17',
        process.env.LOCALAPPDATA + '\\Programs\\Eclipse Adoptium\\jdk-17',
        process.env.PROGRAMFILES + '\\Java\\jdk-17',
        'C:\\Program Files\\Java\\jdk-21',
        'C:\\Program Files\\Eclipse Adoptium\\jdk-21',
        process.env.LOCALAPPDATA + '\\Programs\\Eclipse Adoptium\\jdk-21',
        process.env.PROGRAMFILES + '\\Java\\jdk-21',
        'C:\\Program Files\\Java\\jdk-19',
        'C:\\Program Files\\Eclipse Adoptium\\jdk-19',
        'C:\\Program Files\\Java\\jdk-11',
        process.env['PROGRAMFILES(X86)'] + '\\Java\\jdk-17',
        process.env['PROGRAMFILES(X86)'] + '\\Java\\jdk-21'
      ].filter(Boolean);
      
      let found = false;
      for (const javaPath of specificPaths) {
        if (fs.existsSync(javaPath) && fs.existsSync(path.join(javaPath, 'bin', 'java.exe'))) {
          const version = getJavaVersion(javaPath);
          // Пропускаем Java 25+ (версия 25), так как Gradle 8.9 не поддерживает
          if (version && version >= 25) {
            console.warn(`⚠️  Пропущен Java ${version} (слишком новая для Gradle 8.9): ${javaPath}`);
            continue;
          }
          process.env.JAVA_HOME = javaPath;
          console.log(`✅ Найден Java ${version || '?'}: ${javaPath}`);
          found = true;
          break;
        }
      }
      
      // Если не нашли конкретные версии, ищем все JDK в директориях
      if (!found) {
        for (const javaDir of possibleJavaDirs) {
          const jdks = findJDKsInDirectory(javaDir);
          // Сортируем по версии, предпочитая 17 и 21
          const sortedJdks = jdks.map(jdk => ({
            path: jdk,
            version: getJavaVersion(jdk) || 0
          })).filter(jdk => jdk.version < 25) // Исключаем Java 25+
            .sort((a, b) => {
              // Приоритет: 17 > 21 > 19 > 11 > другие
              const priority = (v) => {
                if (v === 17) return 1;
                if (v === 21) return 2;
                if (v === 19) return 3;
                if (v === 11) return 4;
                return 5;
              };
              const prioDiff = priority(a.version) - priority(b.version);
              return prioDiff !== 0 ? prioDiff : b.version - a.version;
            });
          
          if (sortedJdks.length > 0) {
            process.env.JAVA_HOME = sortedJdks[0].path;
            const version = sortedJdks[0].version;
            console.log(`✅ Найден Java ${version || '?'}: ${process.env.JAVA_HOME}`);
            found = true;
            break;
          }
        }
      }
      
      // Если нашли только Java 25+, предупреждаем
      if (!found && javaFromPath) {
        const version = getJavaVersion(javaFromPath);
        if (version && version >= 25) {
          console.error('❌ ОШИБКА: Найдена только Java ' + version + ', которая не поддерживается Gradle 8.9');
          console.error('💡 Установите Java JDK 17 или 21: https://adoptium.net/');
          console.error('   Gradle 8.9 поддерживает Java до версии 21 включительно');
          process.exit(1);
        }
      }
    }
  }
  
  if (!process.env.ANDROID_HOME) {
    // Сначала пробуем найти через where adb
    const androidFromPath = findAndroidFromPath();
    if (androidFromPath) {
      process.env.ANDROID_HOME = androidFromPath;
      console.log(`✅ Найден Android SDK через PATH: ${androidFromPath}`);
    } else {
      // Ищем в стандартных местах
      const possibleAndroidPaths = [
        process.env.LOCALAPPDATA + '\\Android\\Sdk',
        process.env.USERPROFILE + '\\AppData\\Local\\Android\\Sdk',
        process.env.PROGRAMFILES + '\\Android\\Sdk',
        'C:\\Android\\Sdk',
        process.env.USERPROFILE + '\\Android\\Sdk',
        process.env.PROGRAMFILES + '\\Android\\android-sdk',
        'C:\\Users\\' + process.env.USERNAME + '\\AppData\\Local\\Android\\Sdk',
        'C:\\Users\\' + process.env.USERNAME + '\\Android\\Sdk'
      ].filter(Boolean);
      
      // Проверяем не только существование директории, но и наличие platform-tools
      for (const androidPath of possibleAndroidPaths) {
        if (fs.existsSync(androidPath) && fs.existsSync(path.join(androidPath, 'platform-tools', 'adb.exe'))) {
          process.env.ANDROID_HOME = androidPath;
          console.log(`✅ Найден Android SDK: ${androidPath}`);
          break;
        }
      }
      
      // Если не нашли с platform-tools, пробуем найти любую директорию Android SDK
      if (!process.env.ANDROID_HOME) {
        for (const androidPath of possibleAndroidPaths) {
          if (fs.existsSync(androidPath)) {
            // Проверяем, что это похоже на Android SDK (есть хотя бы platform-tools или tools)
            if (fs.existsSync(path.join(androidPath, 'platform-tools')) || 
                fs.existsSync(path.join(androidPath, 'tools'))) {
              process.env.ANDROID_HOME = androidPath;
              console.log(`✅ Найден Android SDK (без platform-tools): ${androidPath}`);
              console.warn('⚠️  Предупреждение: platform-tools не найден. Установите через Android Studio SDK Manager.');
              break;
            }
          }
        }
      }
    }
  }
  
  // Добавляем в PATH
  if (process.env.JAVA_HOME) {
    // Проверяем версию Java и Gradle перед использованием
    const javaVersion = getJavaVersion(process.env.JAVA_HOME);
    const gradleWrapperPath = path.join(__dirname, 'android', 'gradle', 'wrapper', 'gradle-wrapper.properties');
    let gradleVersion = null;
    
    if (fs.existsSync(gradleWrapperPath)) {
      const gradleProps = fs.readFileSync(gradleWrapperPath, 'utf-8');
      const gradleMatch = gradleProps.match(/gradle-(\d+)\.(\d+)/);
      if (gradleMatch) {
        gradleVersion = {
          major: parseInt(gradleMatch[1], 10),
          minor: parseInt(gradleMatch[2], 10)
        };
      }
    }
    
    // Gradle 8.9 поддерживает Java до 21, Gradle 9.0+ поддерживает Java 22-24, Gradle 9.1+ поддерживает Java 25
    if (javaVersion && javaVersion >= 25) {
      if (!gradleVersion || gradleVersion.major < 9 || (gradleVersion.major === 9 && gradleVersion.minor < 1)) {
        console.warn(`⚠️  Java ${javaVersion} может не поддерживаться текущей версией Gradle`);
        console.warn(`   Текущая версия Gradle: ${gradleVersion ? `${gradleVersion.major}.${gradleVersion.minor}` : 'неизвестна'}`);
        console.warn('💡 Для Java 25 рекомендуется Gradle 9.1.0 или выше');
        console.warn('   Если возникнут проблемы, установите Java JDK 21 (LTS): https://adoptium.net/');
        // Не блокируем, пробуем продолжить
      } else {
        console.log(`✅ Java ${javaVersion} совместима с Gradle ${gradleVersion.major}.${gradleVersion.minor}`);
      }
    } else if (javaVersion && javaVersion >= 22 && javaVersion < 25) {
      if (!gradleVersion || gradleVersion.major < 9) {
        console.warn(`⚠️  Java ${javaVersion} может требовать Gradle 9.0+ для полной поддержки`);
      }
    }
    
    process.env.PATH = `${process.env.JAVA_HOME}\\bin;${process.env.PATH}`;
    
    // Устанавливаем org.gradle.java.home в gradle.properties для явного указания Java версии
    const gradlePropsPath = path.join(__dirname, 'android', 'gradle.properties');
    if (fs.existsSync(gradlePropsPath)) {
      let gradleProps = fs.readFileSync(gradlePropsPath, 'utf-8');
      const javaHomePath = process.env.JAVA_HOME.replace(/\\/g, '/');
      
      // Заменяем или добавляем org.gradle.java.home
      if (gradleProps.includes('org.gradle.java.home=')) {
        // Заменяем все строки с org.gradle.java.home (включая закомментированные)
        gradleProps = gradleProps.replace(/^[#\s]*org\.gradle\.java\.home=.*$/gm, `org.gradle.java.home=${javaHomePath}`);
      } else {
        // Добавляем после комментария о Java toolchain
        gradleProps = gradleProps.replace(
          /(# Java toolchain configuration[\s\S]*?)(# Metro bundler port)/,
          `$1org.gradle.java.home=${javaHomePath}\n\n$2`
        );
      }
      fs.writeFileSync(gradlePropsPath, gradleProps);
      console.log(`✅ Настроен Gradle для использования Java ${javaVersion || '?'}: ${process.env.JAVA_HOME}`);
    }
  }
  if (process.env.ANDROID_HOME) {
    process.env.PATH = `${process.env.ANDROID_HOME}\\platform-tools;${process.env.ANDROID_HOME}\\emulator;${process.env.ANDROID_HOME}\\tools;${process.env.ANDROID_HOME}\\tools\\bin;${process.env.PATH}`;
  }
  
  // Проверяем наличие необходимых инструментов
  console.log('🔍 Проверка зависимостей...');
  
  if (!process.env.JAVA_HOME && !checkCommand('java')) {
    console.error('❌ ОШИБКА: JAVA_HOME не установлен и команда java не найдена в PATH');
    console.error('💡 Установите Java JDK 17 или выше и установите переменную окружения JAVA_HOME');
    console.error('   Или установите Java через: https://adoptium.net/');
    console.error('');
    console.error('   После установки Java:');
    console.error('   1. Установите переменную окружения JAVA_HOME (например, C:\\Program Files\\Eclipse Adoptium\\jdk-17)');
    console.error('   2. Добавьте %JAVA_HOME%\\bin в PATH');
    console.error('   3. Перезапустите терминал');
    process.exit(1);
  }
  
  if (!process.env.ANDROID_HOME && !checkCommand('adb')) {
    console.error('❌ ОШИБКА: ANDROID_HOME не установлен и команда adb не найдена в PATH');
    console.error('');
    console.error('💡 Решение: Установите Android Studio');
    console.error('   1. Скачайте Android Studio: https://developer.android.com/studio');
    console.error('   2. При установке выберите "Android SDK" и "Android SDK Platform-Tools"');
    console.error('   3. После установки найдите путь к SDK в Android Studio:');
    console.error('      Settings → Appearance & Behavior → System Settings → Android SDK');
    console.error('      Скопируйте путь из "Android SDK Location"');
    console.error('');
    console.error('   Затем установите переменную окружения:');
    console.error('   ANDROID_HOME = %LOCALAPPDATA%\\Android\\Sdk (или ваш путь)');
    console.error('   Добавьте в PATH:');
    console.error('   %ANDROID_HOME%\\platform-tools');
    console.error('   %ANDROID_HOME%\\emulator');
    console.error('');
    console.error('   Проверенные пути:');
    const checkedPaths = [
      process.env.LOCALAPPDATA + '\\Android\\Sdk',
      process.env.USERPROFILE + '\\AppData\\Local\\Android\\Sdk',
      process.env.PROGRAMFILES + '\\Android\\Sdk',
      'C:\\Android\\Sdk',
      process.env.USERPROFILE + '\\Android\\Sdk'
    ].filter(Boolean);
    checkedPaths.forEach(p => {
      const exists = fs.existsSync(p) ? '✅ существует' : '❌ не найден';
      console.error(`   ${exists}: ${p}`);
    });
    console.error('');
    console.error('   После настройки перезапустите терминал и попробуйте снова.');
    process.exit(1);
  }
  
  // Проверяем наличие эмулятора или устройства
  try {
    const devices = execSync('adb devices', { encoding: 'utf-8' });
    const deviceLines = devices.split('\n').filter(line => line.trim() && !line.includes('List of devices'));
    if (deviceLines.length === 0) {
      console.warn('⚠️  Предупреждение: Не найдено подключенных Android устройств или эмуляторов');
      console.warn('💡 Запустите эмулятор вручную через Android Studio или подключите устройство по USB');
    } else {
      console.log('✅ Найдены устройства:', deviceLines.join(', '));
    }
  } catch (error) {
    console.warn('⚠️  Не удалось проверить устройства через adb');
  }
}

// Сначала запускаем fix-metro-port.js
try {
  require('./fix-metro-port.js');
} catch (error) {
  console.error('Error running fix-metro-port.js:', error);
}

// Проверяем наличие эмулятора (только для Linux/Mac)
if (os.platform() !== 'win32') {
  try {
    execSync('./ensure-emulator.sh', { stdio: 'inherit' });
  } catch (error) {
    console.warn('Warning: ensure-emulator.sh failed, continuing anyway...');
  }
}

// Запускаем React Native
const rn = spawn('npx', ['react-native', 'run-android', '--port', '8082', '--no-packager'], {
  stdio: 'inherit',
  shell: true,
  env: process.env
});

rn.on('error', (error) => {
  console.error('Failed to run Android:', error);
  process.exit(1);
});

rn.on('exit', (code) => {
  process.exit(code || 0);
});

process.on('SIGINT', () => {
  rn.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  rn.kill('SIGTERM');
  process.exit(0);
});


