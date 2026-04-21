import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'dart:async';
import 'package:audioplayers/audioplayers.dart';
import 'calendar_screen.dart';
import '../main.dart';

class HomeScreen extends StatefulWidget {
  final String jwtToken;
  final Map<String, dynamic> userData;

  const HomeScreen({
    super.key, 
    required this.jwtToken, 
    required this.userData
  });

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _seconds = 1800;
  int _initialSeconds = 1800;
  bool _isRunning = false;
  Timer? _timer;
  double _volume = 0.5;
  final AudioPlayer _audioPlayer = AudioPlayer();

  bool _showIndicator = true;
  final TextEditingController _noteController = TextEditingController();
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();
  
  final List<dynamic> _notes = []; 
  late String _jwtToken;
  bool get isDark => MyApp.of(context).isDark;

  @override
  void initState() {
    super.initState();
    _jwtToken = widget.jwtToken;
  }

  @override
  void dispose() {
    _timer?.cancel();
    _noteController.dispose();
    _audioPlayer.dispose();
    super.dispose();
  }

  String _formatTime(int totalSeconds) {
    final m = (totalSeconds ~/ 60).toString().padLeft(2, '0');
    final s = (totalSeconds % 60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  void _startStop() {
    _audioPlayer.stop();
    if (_isRunning) {
      _timer?.cancel();
    } else {
      _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
        if (_seconds <= 0) {
          _timer?.cancel();
          setState(() {
            _isRunning = false;
            _seconds = _initialSeconds;
          });
          _playAlarm();
        } else {
          setState(() => _seconds--);
        }
      });
    }
    setState(() => _isRunning = !_isRunning);
  }

  void _playAlarm() async {
    await _audioPlayer.setVolume(_volume);
    await _audioPlayer.play(AssetSource('TimerSound.mp3'));
  }

  void _playTestSound() async {
    await _audioPlayer.setVolume(_volume);
    await _audioPlayer.play(AssetSource('TimerSound.mp3'));
  }

  void _showTimerSettings() {
    showModalBottomSheet(
      context: context,
      backgroundColor: isDark ? const Color(0xFF1A1A1A) : Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Padding(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text("Timer Settings", style: TextStyle(color: isDark ? Colors.white : Colors.black, fontSize: 20, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 20),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      _buildTimeButton(15, setModalState),
                      _buildTimeButton(30, setModalState),
                      _buildTimeButton(45, setModalState),
                      _buildTimeButton(60, setModalState),
                    ],
                  ),
                  const SizedBox(height: 20),
                  Row(
                    children: [
                      Icon(Icons.volume_down, color: isDark ? Colors.white : Colors.black),
                      Expanded(
                        child: Slider(
                          value: _volume,
                          onChanged: (val) {
                            setModalState(() => _volume = val);
                            setState(() => _volume = val);
                          },
                        ),
                      ),
                      IconButton(icon: Icon(Icons.play_arrow, color: isDark ? Colors.white : Colors.black), onPressed: _playTestSound)
                    ],
                  ),
                ],
              ),
            );
          },
        );
      },
    ).whenComplete(() => _audioPlayer.stop());
  }

  Widget _buildTimeButton(int mins, StateSetter setModalState) {
    bool isSelected = (_initialSeconds == mins * 60);
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 4),
      child: ChoiceChip(
        label: Text("${mins}m"),
        selected: isSelected,
        onSelected: (selected) {
          if (selected) {
            setModalState(() {
              _initialSeconds = mins * 60;
              _seconds = _initialSeconds;
              _isRunning = false;
              _timer?.cancel();
            });
            setState(() {});
          }
        },
      ),
    );
  }

  String _extractToken(dynamic tokenData) {
    if (tokenData == null) return _jwtToken;
    if (tokenData is Map) {
      return tokenData['accessToken']?.toString() ?? tokenData['jwtToken']?.toString() ?? _jwtToken;
    }
    return tokenData.toString();
  }

  Future<void> _createNote() async {
    final String idStr = widget.userData['id']?.toString() ?? "-1";
    final String noteText = _noteController.text.trim();
    if (idStr == "-1" || idStr == "null" || noteText.isEmpty) return;

    try {
      final response = await http.post(
        Uri.parse('http://174.138.45.229:5000/api/addcard'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'userId': idStr, 'text': noteText, 'jwtToken': _jwtToken}),
      );
      if (!mounted) return;
      final data = jsonDecode(response.body);
      if (data['jwtToken'] != null) setState(() => _jwtToken = _extractToken(data['jwtToken']));
      if (data['error'] == null || data['error'] == "") {
        setState(() => _notes.insert(0, {'text': noteText, 'id': data['id']}));
        _noteController.clear();
      }
    } catch (e) { debugPrint("Error: $e"); }
  }

  Future<void> _deleteNote(String noteId) async {
    try {
      setState(() => _notes.removeWhere((note) => note['id'].toString() == noteId));
      await http.post(
        Uri.parse('http://174.138.45.229:5000/api/deletecard'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'id': noteId, 'jwtToken': _jwtToken}),
      );
    } catch (e) { debugPrint("Error: $e"); }
  }

  @override
  Widget build(BuildContext context) {
    final String idStr = widget.userData['id']?.toString() ?? "-1";
    final bool isLoggedIn = idStr != "-1" && idStr != "null" && idStr != "";
    final bgColor = isDark ? const Color(0xFF121212) : Colors.white;
    final textColor = isDark ? Colors.white : Colors.black;

    return Scaffold(
      key: _scaffoldKey,
      backgroundColor: bgColor,
      drawer: Drawer(
        backgroundColor: isDark ? const Color(0xFF1A1A1A) : Colors.white,
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.fromLTRB(16, 60, 16, 20),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(isLoggedIn ? "Session Notes (${_notes.length})" : "Guest Mode", 
                       style: TextStyle(color: textColor, fontWeight: FontWeight.bold, fontSize: 18)),
                  IconButton(icon: Icon(Icons.close, color: textColor), onPressed: () => Navigator.pop(context)),
                ],
              ),
            ),
            Expanded(
              child: isLoggedIn 
                ? ListView.builder(
                    padding: const EdgeInsets.all(12),
                    itemCount: _notes.length,
                    itemBuilder: (context, i) => ListTile(
                      title: Text(_notes[i]['text'] ?? "", style: TextStyle(color: textColor)),
                      trailing: IconButton(icon: const Icon(Icons.delete_outline, color: Colors.redAccent), onPressed: () => _deleteNote(_notes[i]['id'].toString())),
                    ),
                  )
                : const Center(child: Text("Log in to see notes")),
            ),
          ],
        ),
      ),
      body: Stack(
        fit: StackFit.expand,
        children: [
          SafeArea(
            child: SingleChildScrollView(
              child: Column(
                children: [
                  const SizedBox(height: 50),
                  if (_showIndicator)
                    Transform.translate(
                      offset: const Offset(0, -10), 
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(color: const Color(0xFF2d4ef5).withOpacity(0.1), borderRadius: BorderRadius.circular(20)),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text("Click here to change timer settings", style: TextStyle(color: textColor.withOpacity(0.6), fontSize: 13)),
                            const SizedBox(width: 8),
                            GestureDetector(onTap: () => setState(() => _showIndicator = false), child: Icon(Icons.close, size: 16, color: textColor.withOpacity(0.6))),
                          ],
                        ),
                      ),
                    ),
                  GestureDetector(
                    onTap: _showTimerSettings,
                    child: Text(_formatTime(_seconds), style: TextStyle(fontSize: 72, fontWeight: FontWeight.bold, color: textColor, fontFamily: 'monospace', height: 1.0)),
                  ),
                  const SizedBox(height: 5),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      GestureDetector(
                        onTap: _startStop,
                        child: Container(
                          width: 130, height: 50,
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [Color(0xFF4C00FF), Color(0xFF1E006E)]),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          alignment: Alignment.center,
                          child: Text(_isRunning ? 'PAUSE' : 'START', style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold, letterSpacing: 2)),
                        ),
                      ),
                      const SizedBox(width: 12),
                      GestureDetector(
                        onTap: () {
                          _timer?.cancel();
                          setState(() {
                            _seconds = _initialSeconds;
                            _isRunning = false;
                          });
                          _audioPlayer.stop();
                        },
                        child: Container(
                          width: 130, height: 50,
                          decoration: BoxDecoration(
                            color: Colors.grey.shade800,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          alignment: Alignment.center,
                          child: const Text('RESET', style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold, letterSpacing: 2)),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 40),
                  ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 600),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      child: Container(
                        height: 300,
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          color: isDark ? Colors.white.withOpacity(0.05) : const Color(0xFFEEF4FF),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFF6c8ef2), width: 2), 
                        ),
                        child: TextField(
                          controller: _noteController,
                          maxLines: null,
                          style: TextStyle(color: textColor, fontSize: 18),
                          decoration: const InputDecoration(hintText: "Write a quick note", border: InputBorder.none),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  ElevatedButton(
                    onPressed: _createNote,
                    style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF2d4ef5), padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 12), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24))),
                    child: const Text("Create Note", style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w600)),
                  ),
                  const SizedBox(height: 100), 
                ],
              ),
            ),
          ),
          Positioned(top: 16, left: 16, child: FloatingActionButton.small(heroTag: "m", backgroundColor: const Color(0xFF2d4ef5), onPressed: () => _scaffoldKey.currentState?.openDrawer(), child: const Icon(Icons.menu, color: Colors.white))),
          Positioned(top: 16, right: 16, child: FloatingActionButton.small(
            heroTag: "t", 
            backgroundColor: MyApp.of(context).isDark ? const Color(0xFF1E1E1E) : Colors.white, 
            onPressed: () {
              MyApp.of(context).toggleTheme();
              setState(() {});
            }, 
            child: Icon(MyApp.of(context).isDark ? Icons.nightlight_round : Icons.wb_sunny, 
              color: MyApp.of(context).isDark ? Colors.yellow : Colors.orange)
          )),
          if (!isLoggedIn)
            Positioned(bottom: 16, left: 16, child: ElevatedButton(onPressed: () => Navigator.pushReplacementNamed(context, '/login'), style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF2d4ef5), shape: const StadiumBorder(), padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12)), child: const Text("Login / Register", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)))),
          
          // --- UPDATED CALENDAR BUTTON ---
          Positioned(
            bottom: 16, 
            right: 16, 
            child: FloatingActionButton(
              heroTag: "c", 
              backgroundColor: const Color(0xFF2d4ef5), 
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => CalendarScreen(jwtToken: _jwtToken),
                  ),
                );
              }, 
              child: const Icon(Icons.calendar_month, color: Colors.white)
            )
          ),
        ],
      ),
    );
  }
}