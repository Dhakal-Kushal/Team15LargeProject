import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final TextEditingController _firstNameController = TextEditingController();
  final TextEditingController _lastNameController = TextEditingController();
  final TextEditingController _usernameController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  final TextEditingController _emailController = TextEditingController();
  
  String _errorMessage = '';
  String _successMessage = '';
  bool _isDarkMode = true;

  Future<void> _register() async {
    try {
      final response = await http.post(
        Uri.parse('https://team15study.com/api/register'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'firstName': _firstNameController.text,
          'lastName': _lastNameController.text,
          'login': _usernameController.text,
          'password': _passwordController.text,
          'email': _emailController.text,
        }),
      );

      final data = jsonDecode(response.body);

      if (data['error'] == '' && data['id'] != -1) {
        setState(() {
          _successMessage = 'Account created! Please verify your email.';
          _errorMessage = '';
        });
      } else {
        setState(() {
          _errorMessage = data['error'];
          _successMessage = '';
        });
      }
    } catch (e) {
      setState(() => _errorMessage = "Connection Error");
    }
  }

  @override
  Widget build(BuildContext context) {
    final bgColor = _isDarkMode ? const Color(0xFF121212) : Colors.white;
    final textColor = _isDarkMode ? Colors.white : Colors.black;
    final inputColor = _isDarkMode ? Colors.white10 : Colors.grey[200]!;

    return Scaffold(
      backgroundColor: bgColor,
      appBar: AppBar(
        title: null, // Title removed from top left
        backgroundColor: Colors.transparent,
        elevation: 0,
        foregroundColor: textColor,
        actions: [
          IconButton(
            icon: Icon(_isDarkMode ? Icons.nightlight_round : Icons.wb_sunny),
            onPressed: () => setState(() => _isDarkMode = !_isDarkMode),
          )
        ],
      ),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 400),
            child: Column(
              children: [
                // Header added here
                Text(
                  "Register",
                  style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: textColor),
                ),
                const SizedBox(height: 40),
                _buildField(_firstNameController, 'First Name', inputColor, textColor),
                const SizedBox(height: 12),
                _buildField(_lastNameController, 'Last Name', inputColor, textColor),
                const SizedBox(height: 12),
                _buildField(_usernameController, 'Username', inputColor, textColor),
                const SizedBox(height: 12),
                _buildField(_emailController, 'Email', inputColor, textColor),
                const SizedBox(height: 12),
                _buildField(_passwordController, 'Password', inputColor, textColor, obscure: true),
                const SizedBox(height: 24),
                if (_errorMessage.isNotEmpty)
                  Text(_errorMessage, style: const TextStyle(color: Colors.redAccent)),
                if (_successMessage.isNotEmpty)
                  Text(_successMessage, style: const TextStyle(color: Colors.greenAccent)),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: _register,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF2d4ef5),
                    minimumSize: const Size(double.infinity, 50),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text('Register', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
                ),
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Already have an account? Login', style: TextStyle(color: Color(0xFF2d4ef5))),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildField(TextEditingController controller, String label, Color fill, Color text, {bool obscure = false}) {
    return TextField(
      controller: controller,
      obscureText: obscure,
      style: TextStyle(color: text),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: TextStyle(color: text.withOpacity(0.6)),
        filled: true,
        fillColor: fill,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
      ),
    );
  }
}