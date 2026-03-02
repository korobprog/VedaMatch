#import "AppDelegate.h"

#import <Firebase.h>
#import <AVKit/AVKit.h>
#import <React/RCTBundleURLProvider.h>
#import <React/RCTBridgeModule.h>

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

#pragma mark - CallPiPModule (iOS Video PiP)

@interface CallPiPModule : NSObject <RCTBridgeModule, AVPictureInPictureControllerDelegate>
@property(nonatomic, strong) AVPictureInPictureController *pipController;
@property(nonatomic, strong) AVPictureInPictureVideoCallViewController *pipContentController;
@property(nonatomic, weak) UIView *sourceView;
@property(nonatomic, assign) BOOL callActive;
@end

@implementation CallPiPModule

RCT_EXPORT_MODULE();

+ (BOOL)requiresMainQueueSetup {
  return YES;
}

- (dispatch_queue_t)methodQueue {
  return dispatch_get_main_queue();
}

- (UIWindow *)resolveKeyWindow {
  if (@available(iOS 13.0, *)) {
    NSSet<UIScene *> *scenes = [UIApplication sharedApplication].connectedScenes;
    for (UIScene *scene in scenes) {
      if (![scene isKindOfClass:[UIWindowScene class]]) {
        continue;
      }
      UIWindowScene *windowScene = (UIWindowScene *)scene;
      if (windowScene.activationState != UISceneActivationStateForegroundActive &&
          windowScene.activationState != UISceneActivationStateForegroundInactive) {
        continue;
      }
      for (UIWindow *window in windowScene.windows) {
        if (window.isKeyWindow) {
          return window;
        }
      }
    }
  }
  return [UIApplication sharedApplication].keyWindow;
}

- (UIView *)resolveActiveSourceView {
  UIWindow *window = [self resolveKeyWindow];
  if (window == nil) {
    return nil;
  }

  UIViewController *controller = window.rootViewController;
  while (controller.presentedViewController != nil) {
    controller = controller.presentedViewController;
  }

  return controller.view ?: window;
}

- (BOOL)prepareControllerWithPreferredSize:(CGSize)preferredSize {
  if (@available(iOS 15.0, *)) {
    UIView *activeSourceView = [self resolveActiveSourceView];
    if (activeSourceView == nil) {
      return NO;
    }

    if (self.pipController != nil && self.sourceView == activeSourceView) {
      return YES;
    }

    self.sourceView = activeSourceView;
    self.pipContentController = [[AVPictureInPictureVideoCallViewController alloc] init];
    CGFloat safeWidth = preferredSize.width > 0 ? preferredSize.width : 9.0;
    CGFloat safeHeight = preferredSize.height > 0 ? preferredSize.height : 16.0;
    self.pipContentController.preferredContentSize = CGSizeMake(safeWidth, safeHeight);

    AVPictureInPictureControllerContentSource *contentSource =
        [[AVPictureInPictureControllerContentSource alloc]
            initWithActiveVideoCallSourceView:activeSourceView
                         contentViewController:self.pipContentController];
    self.pipController = [[AVPictureInPictureController alloc] initWithContentSource:contentSource];
    self.pipController.delegate = self;
    self.pipController.canStartPictureInPictureAutomaticallyFromInline = YES;

    return YES;
  }

  return NO;
}

- (void)stopPiPIfNeeded {
  @try {
    if (@available(iOS 15.0, *)) {
      if (self.pipController != nil && self.pipController.pictureInPictureActive) {
        [self.pipController stopPictureInPicture];
      }
    }
  } @catch (NSException *exception) {
    NSLog(@"[CallPiPModule] stopPiPIfNeeded exception: %@", exception.reason);
  }
}

RCT_EXPORT_METHOD(setCallActive:(BOOL)active) {
  @try {
    self.callActive = active;
    if (!active) {
      [self stopPiPIfNeeded];
    }
  } @catch (NSException *exception) {
    NSLog(@"[CallPiPModule] setCallActive exception: %@", exception.reason);
  }
}

RCT_REMAP_METHOD(isSupported,
                 isSupportedWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject) {
  (void)reject;
  BOOL supported = NO;
  if (@available(iOS 15.0, *)) {
    supported = [AVPictureInPictureController isPictureInPictureSupported];
  }
  resolve(@(supported));
}

RCT_REMAP_METHOD(enterPiP,
                 enterPiPWithWidth:(nonnull NSNumber *)width
                 height:(nonnull NSNumber *)height
                 resolve:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject) {
  (void)reject;
  if (!self.callActive) {
    resolve(@(NO));
    return;
  }

  if (@available(iOS 15.0, *)) {
    if (![AVPictureInPictureController isPictureInPictureSupported]) {
      resolve(@(NO));
      return;
    }

    CGFloat safeWidth = width != nil ? width.floatValue : 9.0;
    CGFloat safeHeight = height != nil ? height.floatValue : 16.0;
    BOOL prepared = [self prepareControllerWithPreferredSize:CGSizeMake(safeWidth, safeHeight)];
    if (!prepared || self.pipController == nil) {
      resolve(@(NO));
      return;
    }

    if (!self.pipController.pictureInPictureActive) {
      [self.pipController startPictureInPicture];
    }

    resolve(@(YES));
    return;
  }

  resolve(@(NO));
}

RCT_REMAP_METHOD(stopPiP,
                 stopPiPWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject) {
  (void)reject;
  [self stopPiPIfNeeded];
  resolve(@(YES));
}

@end
