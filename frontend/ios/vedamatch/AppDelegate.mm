#import "AppDelegate.h"

#import <Firebase.h>
#import <React/RCTBundleURLProvider.h>

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
