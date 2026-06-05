import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import '../main.dart';

class NotificationService {
  static final NotificationService _instance = NotificationService._internal();
  factory NotificationService() => _instance;
  NotificationService._internal();

  bool _initialized = false;
  String? _fcmToken;

  Future<void> initialize() async {
    if (_initialized) return;

    // Get FCM Token
    try {
      _fcmToken = await FirebaseMessaging.instance.getToken();
      print("FCM Registration Token: $_fcmToken");
    } catch (e) {
      print("Error getting FCM Token: $e");
    }

    // Monitor Token Refresh
    FirebaseMessaging.instance.onTokenRefresh.listen((token) {
      _fcmToken = token;
      print("FCM Token refreshed: $token");
      // Here you would typically send the token to your server backend via API or Webview injection
    });

    // Configure foreground presentation options
    await FirebaseMessaging.instance.setForegroundNotificationPresentationOptions(
      alert: true,
      badge: true,
      sound: true,
    );

    // Set up local notifications configuration
    const initSettingsAndroid = AndroidInitializationSettings('@mipmap/ic_launcher');
    const initSettingsIOS = DarwinInitializationSettings();
    const initSettings = InitializationSettings(
      android: initSettingsAndroid,
      iOS: initSettingsIOS,
    );

    await flutterLocalNotificationsPlugin.initialize(
      initSettings,
      onDidReceiveNotificationResponse: (NotificationResponse response) async {
        final payload = response.payload;
        if (payload != null) {
          print('Notification clicked with payload: $payload');
          // Handle deep link / navigation here
        }
      },
    );

    // Listen to foreground notifications
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      RemoteNotification? notification = message.notification;
      AndroidNotification? android = message.notification?.android;

      if (notification != null && android != null) {
        flutterLocalNotificationsPlugin.show(
          notification.hashCode,
          notification.title,
          notification.body,
          NotificationDetails(
            android: AndroidNotificationDetails(
              channel.id,
              channel.name,
              channelDescription: channel.description,
              icon: android.smallIcon ?? '@mipmap/ic_launcher',
              importance: Importance.max,
              priority: Priority.high,
              playSound: true,
            ),
            iOS: const DarwinNotificationDetails(
              presentAlert: true,
              presentSound: true,
              presentBadge: true,
            ),
          ),
          payload: message.data.toString(),
        );
      }
    });

    // Handle background notification clicks when app is opened from terminated state
    FirebaseMessaging.instance.getInitialMessage().then((RemoteMessage? message) {
      if (message != null) {
        print('App opened from terminated state via notification: ${message.messageId}');
      }
    });

    // Handle notification clicks when app is in background but running
    FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
      print('Notification clicked while app in background: ${message.messageId}');
    });

    _initialized = true;
  }

  String? get fcmToken => _fcmToken;
}
