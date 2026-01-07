# Add project specific ProGuard rules here.
# By default, flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html
# 
# Add any project specific keep options here:

# Fix for duplicate classes issue with react-native-slider
-dontwarn com.facebook.react.viewmanagers.RNCSliderManagerDelegate
-keep class com.facebook.react.viewmanagers.RNCSliderManagerDelegate { *; }

# Fix for duplicate classes issue with react-native-slider
-dontwarn com.facebook.react.viewmanagers.RNCSliderManagerInterface
-keep class com.facebook.react.viewmanagers.RNCSliderManagerInterface { *; }

# Fix for duplicate classes issue with react-native-gesture-handler
-dontwarn com.facebook.react.viewmanagers.RNGestureHandlerRootViewManagerDelegate
-keep class com.facebook.react.viewmanagers.RNGestureHandlerRootViewManagerDelegate { *; }

-dontwarn com.facebook.react.viewmanagers.RNGestureHandlerRootViewManagerInterface
-keep class com.facebook.react.viewmanagers.RNGestureHandlerRootViewManagerInterface { *; }

-dontwarn com.facebook.react.viewmanagers.RNGestureHandlerButtonManagerDelegate
-keep class com.facebook.react.viewmanagers.RNGestureHandlerButtonManagerDelegate { *; }

-dontwarn com.facebook.react.viewmanagers.RNGestureHandlerButtonManagerInterface
-keep class com.facebook.react.viewmanagers.RNGestureHandlerButtonManagerInterface { *; }

# Fix for R8 duplicate classes
-keep class com.facebook.react.viewmanagers.** { *; }
-dontwarn com.facebook.react.viewmanagers.**

# Add consumer rules for react-native-slider
-keep class com.reactnativecommunity.slider.** { *; }
-dontwarn com.reactnativecommunity.slider.**

# Add consumer rules for react-native-gesture-handler
-keep class com.swmansion.gesturehandler.** { *; }
-dontwarn com.swmansion.gesturehandler.**

