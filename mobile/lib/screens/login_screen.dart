import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'register_screen.dart';
import 'home_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final TextEditingController _usernameController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  String _errorMessage = '';
  bool _isDarkMode = true;

  Future<void> _login() async {
    try {
      final response = await http.post(
        Uri.parse('http://174.138.45.229:5000/api/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'login': _usernameController.text,
          'password': _passwordController.text,
        }),
      );

      final data = jsonDecode(response.body);

      if (data['accessToken'] != null && data['accessToken'] != '') {
        final Map<String, dynamic> payload = decodeJWT(data['accessToken']);
        
        final Map<String, dynamic> userData = {
          'id': payload['userId'].toString(),
          'firstName': payload['firstName'] ?? '',
          'lastName': payload['lastName'] ?? '',
        };

        if (mounted) {
          Navigator.pushReplacement(context, MaterialPageRoute(
            builder: (_) => HomeScreen(
              jwtToken: data['accessToken'], 
              userData: userData,
            ),
          ));
        }
      } else {
        setState(() => _errorMessage = data['error'] ?? 'Login failed');
      }
    } catch (e) {
      setState(() => _errorMessage = "Connection Error");
    }
  }

  Map<String, dynamic> decodeJWT(String token) {
    final parts = token.split('.');
    if (parts.length != 3) return {};
    final payload = parts[1];
    var normalized = base64Url.normalize(payload);
    var resp = utf8.decode(base64Url.decode(normalized));
    return jsonDecode(resp);
  }

  @override
  Widget build(BuildContext context) {
    final bgColor = _isDarkMode ? const Color(0xFF121212) : Colors.white;
    final textColor = _isDarkMode ? Colors.white : Colors.black;
    final inputColor = _isDarkMode ? Colors.white10 : Colors.grey[200]!;

    return Scaffold(
      backgroundColor: bgColor,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        foregroundColor: textColor,
        // 1. Set the width to be just enough for the text
        leadingWidth: 180, 
        leading: TextButton(
          onPressed: () {
            Navigator.pushReplacement(
              context,
              MaterialPageRoute(
                builder: (_) => const HomeScreen(
                  jwtToken: '',
                  userData: {'id': -1},
                ),
              ),
            );
          },
          style: TextButton.styleFrom(
            // 2. Remove the default padding that was pushing the text off-center
            padding: EdgeInsets.zero, 
            // 3. Center the text within the 180px area
            alignment: Alignment.center, 
          ),
          child: const Text(
            "Continue as Guest",
            textAlign: TextAlign.center, // 4. Ensure text internal alignment is centered
            maxLines: 1,
            style: TextStyle(
              color: Color(0xFF2d4ef5),
              fontWeight: FontWeight.bold,
              fontSize: 15,
            ),
          ),
        ),
        actions: [
          IconButton(
            icon: Icon(_isDarkMode ? Icons.nightlight_round : Icons.wb_sunny),
            onPressed: () => setState(() => _isDarkMode = !_isDarkMode),
          ),
        ],
      ),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 400),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  "Login",
                  style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: textColor),
                ),
                const SizedBox(height: 40),
                TextField(
                  controller: _usernameController,
                  style: TextStyle(color: textColor),
                  decoration: InputDecoration(
                    labelText: 'Username',
                    labelStyle: TextStyle(color: textColor.withOpacity(0.6)),
                    filled: true,
                    fillColor: inputColor,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                  ),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _passwordController,
                  obscureText: true,
                  style: TextStyle(color: textColor),
                  decoration: InputDecoration(
                    labelText: 'Password',
                    labelStyle: TextStyle(color: textColor.withOpacity(0.6)),
                    filled: true,
                    fillColor: inputColor,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                  ),
                ),
                const SizedBox(height: 24),
                if (_errorMessage.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 16),
                    child: Text(_errorMessage, style: const TextStyle(color: Colors.redAccent)),
                  ),
                ElevatedButton(
                  onPressed: _login,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF2d4ef5),
                    minimumSize: const Size(double.infinity, 50),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text('Login', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
                ),
                const SizedBox(height: 16),
                TextButton(
                  onPressed: () => Navigator.push(context, MaterialPageRoute(
                    builder: (_) => const RegisterScreen(),
                  )),
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