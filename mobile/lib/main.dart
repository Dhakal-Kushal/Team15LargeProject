import 'package:flutter/material.dart';
import 'screens/login_screen.dart';
import 'screens/home_screen.dart'; // Import the home screen

void main() {
  runApp(const MyApp());
}

class MyApp extends StatefulWidget {
  const MyApp({super.key});

  static _MyAppState of(BuildContext context) =>
      context.findAncestorStateOfType<_MyAppState>()!;

  @override
  State<MyApp> createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {
  ThemeMode _themeMode = ThemeMode.light;

  void toggleTheme() {
    setState(() {
      _themeMode = _themeMode == ThemeMode.light ? ThemeMode.dark : ThemeMode.light;
    });
  }

  bool get isDark => _themeMode == ThemeMode.dark;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Study App',
      debugShowCheckedModeBanner: false,
      themeMode: _themeMode,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.blue),
        useMaterial3: true,
      ),
<<<<<<< Updated upstream
      darkTheme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: Colors.blue,
          brightness: Brightness.dark,
        ),
        useMaterial3: true,
      ),
      home: const LoginScreen(),
=======
      // 1. Set the default page to HomeScreen (Guest Mode)
      home: const HomeScreen(
        jwtToken: '', 
        userData: {'id': -1}, // -1 tells the app this is a guest
      ),
      // 2. Define routes so that buttons can navigate between screens
      routes: {
        '/login': (context) => const LoginScreen(),
      },
>>>>>>> Stashed changes
    );
  }
}