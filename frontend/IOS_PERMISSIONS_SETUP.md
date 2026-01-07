# iOS Permissions Setup for Media Features

## Add Permissions to Info.plist

Add the following keys to your `ios/[ProjectName]/Info.plist` file:

### Camera Permission (Image Picker)
```xml
<key>NSCameraUsageDescription</key>
<string>App needs access to camera to take photos</string>
```

### Photo Library Permission (Image Picker)
```xml
<key>NSPhotoLibraryUsageDescription</key>
<string>App needs access to photo library to select photos</string>
```

### Microphone Permission (Audio Recording)
```xml
<key>NSMicrophoneUsageDescription</key>
<string>App needs access to microphone to record voice messages</string>
```

### Photo Library Add Only Permission (iOS 14+)
```xml
<key>NSPhotoLibraryAddUsageDescription</key>
<string>App needs access to save photos</string>
```

## Complete Info.plist Example

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>CFBundleDevelopmentRegion</key>
	<string>en</string>
	<key>CFBundleDisplayName</key>
	<string>RagAgent</string>
	<key>CFBundleExecutable</key>
	<string>$(EXECUTABLE_NAME)</string>
	<key>CFBundleIdentifier</key>
	<string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
	<key>CFBundleInfoDictionaryVersion</key>
	<string>6.0</string>
	<key>CFBundleName</key>
<string>$(PRODUCT_NAME)</string>
	<key>CFBundlePackageType</key>
	<string>APPL</string>
	<key>CFBundleShortVersionString</key>
	<string>$(MARKETING_VERSION)</string>
	<key>CFBundleVersion</key>
	<string>$(CURRENT_PROJECT_VERSION)</string>
	<key>LSRequiresIPhoneOS</key>
	<true/>
	<key>UIAppSupportsHDR</key>
	<false/>
	<key>UILaunchStoryboardName</key>
	<string>LaunchScreen</string>
	<key>UIRequiredDeviceCapabilities</key>
	<array>
		<string>armv7</string>
	</array>
	<key>UISupportedInterfaceOrientations</key>
	<array>
		<string>UIInterfaceOrientationPortrait</string>
		<string>UIInterfaceOrientationLandscapeLeft</string>
		<string>UIInterfaceOrientationLandscapeRight</string>
	</array>
	<key>UIViewControllerBasedStatusBarAppearance</key>
	<false/>

	<!-- Media Permissions -->
	<key>NSCameraUsageDescription</key>
	<string>Приложению нужен доступ к камере для создания фото</string>
	<key>NSPhotoLibraryUsageDescription</key>
	<string>Приложению нужен доступ к галерее для выбора фото</string>
	<key>NSPhotoLibraryAddUsageDescription</key>
	<string>Приложению нужен доступ для сохранения фото</string>
	<key>NSMicrophoneUsageDescription</key>
	<string>Приложению нужен доступ к микрофону для записи голосовых сообщений</string>

</dict>
</plist>
```

## Build Settings

Make sure the following is set in your iOS project build settings:

### Deployment Target
- Minimum iOS version: 13.0+ (for React Native 0.76.5)

### Swift Version
- Set to 5.0 or higher

### Code Signing
- Configure your development team in Xcode
- Enable "Automatically manage signing"

## Pod Installation

After adding permissions, run:

```bash
cd ios
pod install
cd ..
```

## Testing Permissions

To test if permissions work correctly:

1. **Clean build folder**: `npm run clean` (if available) or delete `ios/build` folder
2. **Reinstall app**: Remove app from simulator/device and rebuild
3. **Test each permission**:
   - Try to pick image from gallery → Should ask for photo library permission
   - Try to take photo with camera → Should ask for camera permission
   - Try to record audio → Should ask for microphone permission

## Troubleshooting

### Permission Dialog Not Showing

If the permission dialog doesn't appear:

1. Make sure the permission key is exactly as shown above (case-sensitive)
2. Clean your build: `rm -rf ios/build && rm -rf ios/Pods`
3. Reinstall pods: `cd ios && pod install`
4. Delete app from device and reinstall

### App Crashes When Accessing Media

1. Check console logs for permission errors
2. Ensure Info.plist is properly formatted (no syntax errors)
3. Verify the bundle identifier is correct
4. Try running on a physical device (simulator sometimes has permission issues)

### Audio Recording Issues

If audio recording doesn't work:

1. Ensure `NSMicrophoneUsageDescription` is in Info.plist
2. Check if microphone hardware is available on simulator (some simulators don't support it)
3. Test on physical device if possible
4. Check console for specific error messages

## Additional Resources

- [React Native Permissions Documentation](https://github.com/zoontek/react-native-permissions)
- [React Native Image Picker Documentation](https://github.com/react-native-image-picker/react-native-image-picker)
- [React Native Audio Recorder Player Documentation](https://github.com/dooboolab/react-native-audio-recorder-player)
- [Apple Human Interface Guidelines - Permissions](https://developer.apple.com/design/human-interface-guidelines/accessibility/overview/permissions)
