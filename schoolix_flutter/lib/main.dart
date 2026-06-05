import 'dart:async';
import 'package:flutter/material';
import 'package:flutter/services.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'services/notification_service.dart';
import 'views/splash_screen.dart';

// Local Notifications Channel
const AndroidNotificationChannel channel = AndroidNotificationChannel(
  'schoolix_push_channel', // id
  'Schoolix Notifications', // title
  description: 'This channel is used for important school notifications.', // description
  importance: Importance.high,
  playSound: true,
  enableVibration: true,
);

final FlutterLocalNotificationsPlugin flutterLocalNotificationsPlugin =
    FlutterLocalNotificationsPlugin();

// Background Message Handler for FCM
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  print('Handling a background message: ${message.messageId}');
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Set preferred orientations
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  // Initialize Firebase
  try {
    await Firebase.initializeApp();
    FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);
    
    // Set up local notifications
    await flutterLocalNotificationsPlugin
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(channel);

    // Request permissions
    await FirebaseMessaging.instance.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );
  } catch (e) {
    print("Firebase initialization error: $e");
  }

  runApp(const SchoolixApp());
}

class SchoolixApp extends StatelessWidget {
  const SchoolixApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Schoolix',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        primaryColor: const Color(0xFF1E293B), // Dark blue slate
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF2563EB), // Rich primary royal blue
          primary: const Color(0xFF2563EB),
          secondary: const Color(0xFF0F172A),
          background: Colors.white,
        ),
        fontFamily: 'Inter',
      ),
      home: const SplashScreen(),
    );
  }
}
