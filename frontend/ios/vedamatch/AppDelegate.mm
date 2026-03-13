#import "AppDelegate.h"

#import <Firebase.h>
#import <GoogleSignIn/GoogleSignIn.h>
#import <RNVoipPushNotification/RNVoipPushNotificationManager.h>
#import <React/RCTBundleURLProvider.h>
#import <React/RCTLinkingManager.h>

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application
    didFinishLaunchingWithOptions:(NSDictionary *)launchOptions {
  NSURL *firebasePlistURL =
      [[NSBundle mainBundle] URLForResource:@"GoogleService-Info"
                               withExtension:@"plist"];
  NSDictionary *firebasePlist = firebasePlistURL != nil
                                    ? [NSDictionary dictionaryWithContentsOfURL:firebasePlistURL]
                                    : nil;
  NSString *apiKey = [firebasePlist[@"API_KEY"] isKindOfClass:[NSString class]]
                         ? firebasePlist[@"API_KEY"]
                         : nil;
  BOOL hasValidApiKey =
      apiKey != nil && [apiKey hasPrefix:@"AIza"] && apiKey.length == 39;

  if (!hasValidApiKey) {
    NSLog(@"[Firebase] Skipping configure: invalid or missing API_KEY in GoogleService-Info.plist");
  } else if ([FIRApp defaultApp] == nil) {
    [FIRApp configure];
  }

  self.moduleName = @"vedamatch";
  // You can add your custom initial props in the dictionary below.
  // They will be passed down to the ViewController used by React Native.
  self.initialProps = @{};

  // Configure Metro bundler port (8082 instead of default 8081) only in DEBUG
#if DEBUG
  [[RCTBundleURLProvider sharedSettings] setJsLocation:@"localhost:8082"];
#endif

  @try {
    Class optionsClass = NSClassFromString(@"WebRTCModuleOptions");
    if (optionsClass != Nil) {
      SEL sharedSelector = NSSelectorFromString(@"sharedInstance");
      if ([optionsClass respondsToSelector:sharedSelector]) {
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Warc-performSelector-leaks"
        id options = [optionsClass performSelector:sharedSelector];
#pragma clang diagnostic pop
        if (options != nil) {
          [options setValue:@(YES) forKey:@"enableMultitaskingCameraAccess"];
          NSLog(@"[WebRTC] enableMultitaskingCameraAccess=YES");
        }
      }
    }
  } @catch (NSException *exception) {
    NSLog(@"[WebRTC] Failed to enable multitasking camera access: %@", exception.reason);
  }

  return [super application:application
      didFinishLaunchingWithOptions:launchOptions];
}

- (void)pushRegistry:(PKPushRegistry *)registry
    didUpdatePushCredentials:(PKPushCredentials *)credentials
                     forType:(PKPushType)type {
  [RNVoipPushNotificationManager didUpdatePushCredentials:credentials forType:(NSString *)type];
}

- (void)pushRegistry:(PKPushRegistry *)registry
    didReceiveIncomingPushWithPayload:(PKPushPayload *)payload
                              forType:(PKPushType)type {
  [RNVoipPushNotificationManager didReceiveIncomingPushWithPayload:payload
                                                           forType:(NSString *)type];
}

- (void)pushRegistry:(PKPushRegistry *)registry
    didReceiveIncomingPushWithPayload:(PKPushPayload *)payload
                              forType:(PKPushType)type
                withCompletionHandler:(void (^)(void))completion {
  NSString *completionUUID = payload.dictionaryPayload[@"uuid"];
  if ([completionUUID isKindOfClass:[NSString class]] && completionUUID.length > 0) {
    [RNVoipPushNotificationManager addCompletionHandler:completionUUID completionHandler:completion];
  } else if (completion != nil) {
    completion();
  }

  [RNVoipPushNotificationManager didReceiveIncomingPushWithPayload:payload
                                                           forType:(NSString *)type];
}

// iOS SDK compatibility fallback:
// Some simulator/runtime combinations may still invoke these legacy selectors.
// Keep explicit handlers to avoid startup crash (doesNotRecognizeSelector).
- (void)voipRegistrationSucceededWithDeviceToken:(id)deviceToken {
  if ([deviceToken isKindOfClass:[NSData class]]) {
    NSData *tokenData = (NSData *)deviceToken;
    NSMutableString *hex = [NSMutableString stringWithCapacity:tokenData.length * 2];
    const unsigned char *bytes = (const unsigned char *)tokenData.bytes;
    for (NSUInteger i = 0; i < tokenData.length; i++) {
      [hex appendFormat:@"%02x", bytes[i]];
    }
    NSLog(@"[VoIP] Legacy token callback received (%@)", hex);
  } else {
    NSLog(@"[VoIP] Legacy token callback received");
  }
}

- (void)voipRegistrationFailedWithError:(NSError *)error {
  NSLog(@"[VoIP] Legacy registration failed callback: %@", error);
}

- (BOOL)application:(UIApplication *)application
            openURL:(NSURL *)url
            options:(NSDictionary<UIApplicationOpenURLOptionsKey, id> *)options {
  if ([[GIDSignIn sharedInstance] handleURL:url]) {
    return YES;
  }
  return [RCTLinkingManager application:application openURL:url options:options];
}

- (BOOL)application:(UIApplication *)application
    continueUserActivity:(NSUserActivity *)userActivity
      restorationHandler:(void (^)(NSArray * _Nullable))restorationHandler {
  return [RCTLinkingManager application:application
                   continueUserActivity:userActivity
                     restorationHandler:restorationHandler];
}

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge {
  return [self bundleURL];
}

- (NSURL *)bundleURL {
#if DEBUG
  return
      [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"];
#else
  return [[NSBundle mainBundle] URLForResource:@"main"
                                 withExtension:@"jsbundle"];
#endif
}

@end
