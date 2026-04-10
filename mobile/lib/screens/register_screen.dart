import 'package:flutter/material.dart';
import 'home_screen.dart';

class RegisterScreen extends StatelessWidget {
  const RegisterScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Register')),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            const TextField(decoration: InputDecoration(labelText: 'First Name')),
            const TextField(decoration: InputDecoration(labelText: 'Last Name')),
            const TextField(decoration: InputDecoration(labelText: 'Username')),
            const TextField(decoration: InputDecoration(labelText: 'Password'), obscureText: true),
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const HomeScreen())),
              child: const Text('Register'),
            ),
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Already have an account? Login'),
            )
          ],
        ),
      ),
    );
  }
}