import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'register_screen.dart';
import 'home_screen.dart';
import 'forgot_password_screen.dart';
import '../main.dart'; // Import main to access MyApp

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final TextEditingController _usernameController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  String _errorMessage = '';

  Map<String, dynamic> decodeJWT(String token) {
    try {
      final parts = token.split('.');
      if (parts.length != 3) return {};
      final payload = parts[1];
      var normalized = base64Url.normalize(payload);
      var resp = utf8.decode(base64Url.decode(normalized));
      return jsonDecode(resp);
    } catch (e) { return {}; }
  }

  Future<void> _login() async {
    try {
      final response = await http.post(
        Uri.parse('https://team15study.com/api/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'login': _usernameController.text,
          'password': _passwordController.text,
        }),
      );
      if (!mounted) return;
      final data = jsonDecode(response.body);

      if (data['accessToken'] != null && data['accessToken'] != '') {
        final Map<String, dynamic> payload = decodeJWT(data['accessToken']);
        final Map<String, dynamic> userData = {
          'id': payload['userId']?.toString() ?? '-1',
          'firstName': payload['firstName'] ?? '',
          'lastName': payload['lastName'] ?? '',
        };

        Navigator.pushReplacement(context, MaterialPageRoute(
          builder: (_) => HomeScreen(
            jwtToken: data['accessToken'],
            userData: userData,
          ),
        ));
      } else {
        setState(() => _errorMessage = data['error'] ?? 'Login failed');
      }
    } catch (e) {
      if (mounted) setState(() => _errorMessage = "Connection Error");
    }
  }

  @override
  Widget build(BuildContext context) {
    // --- GLOBAL THEME SYNC ---
    final bool isDark = MyApp.of(context).isDark;
    final bgColor = isDark ? const Color(0xFF121212) : Colors.white;
    final textColor = isDark ? Colors.white : Colors.black;
    final inputColor = isDark ? Colors.white10 : Colors.grey[200]!;

    return Scaffold(
      backgroundColor: bgColor,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leadingWidth: 180,
        leading: TextButton(
          onPressed: () {
            Navigator.pushReplacement(context, MaterialPageRoute(
              builder: (_) => const HomeScreen(jwtToken: '', userData: {'id': -1}),
            ));
          },
          child: const Text("Continue as Guest", 
            style: TextStyle(color: Color(0xFF2d4ef5), fontWeight: FontWeight.bold, fontSize: 15)),
        ),
        actions: [
          IconButton(
            icon: Icon(isDark ? Icons.nightlight_round : Icons.wb_sunny),
            color: isDark ? Colors.yellow : Colors.orange,
            onPressed: () => MyApp.of(context).toggleTheme(), // TOGGLE GLOBAL
          ),
        ],
      ),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 400),
            child: Column(
              children: [
                Text("Login", style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: textColor)),
                const SizedBox(height: 40),
                TextField(
                  controller: _usernameController,
                  style: TextStyle(color: textColor),
                  decoration: InputDecoration(
                    labelText: 'Username', labelStyle: TextStyle(color: textColor.withOpacity(0.6)),
                    filled: true, fillColor: inputColor,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                  ),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _passwordController,
                  obscureText: true,
                  style: TextStyle(color: textColor),
                  decoration: InputDecoration(
                    labelText: 'Password', labelStyle: TextStyle(color: textColor.withOpacity(0.6)),
                    filled: true, fillColor: inputColor,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                  ),
                ),
                const SizedBox(height: 24),
                if (_errorMessage.isNotEmpty)
                  Text(_errorMessage, style: const TextStyle(color: Colors.redAccent)),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: _login,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF2d4ef5),
                    minimumSize: const Size(double.infinity, 50),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text('Login', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                ),
                TextButton(
                  onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ForgotPasswordScreen())),
                  child: const Text('Forgot password?', style: TextStyle(color: Color(0xFF2d4ef5))),
                ),
                TextButton(
                  onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const RegisterScreen())),
                  child: const Text('No account? Register', style: TextStyle(color: Color(0xFF2d4ef5))),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}