import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'dart:async';
import 'calendar_screen.dart';

class HomeScreen extends StatefulWidget {
  final String jwtToken;
  const HomeScreen({super.key, required this.jwtToken});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  // Timer variables
  int _seconds = 1800;
  bool _isRunning = false;
  Timer? _timer;

  // Note variable
  final TextEditingController _noteController = TextEditingController();
  final List<Map<String, dynamic>> _notes = [];

  void _startStop() {
    if (_isRunning) {
      _timer?.cancel();
    } else {
      _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
        if (_seconds == 0) {
          _timer?.cancel();
          setState(() => _isRunning = false);
        } else {
          setState(() => _seconds--);
        }
      });
    }
    setState(() => _isRunning = !_isRunning);
  }

  void _reset() {
    _timer?.cancel();
    setState(() {
      _seconds = 1800;
      _isRunning = false;
    });
  }

String _jwtToken = '';

@override
void initState() {
  super.initState();
  _jwtToken = widget.jwtToken;
  _fetchNotes();
}

Future<void> _fetchNotes() async {
  final response = await http.post(
    Uri.parse('http://174.138.45.229:5000/api/searchcards'),
    headers: {'Content-Type': 'application/json'},
    body: jsonEncode({
      'search': '',
      'jwtToken': _jwtToken,
    }),
  );

  final data = jsonDecode(response.body);
  if (data['jwtToken'] != null && data['jwtToken'] != '') {
    _jwtToken = data['jwtToken'].toString();;
  }

  if (data['results'] != null) {
    setState(() {
      _notes.clear();
      for (var r in data['results']) {
        _notes.add({
          'id': r['id']?.toString() ?? '',
          'text': r['text']?.toString() ?? '',
          'createdAt': r['createdAt'] is Map 
              ? r['createdAt']['\$date']?.toString() ?? ''
              : r['createdAt']?.toString() ?? '',
        });
      }
    });
  }
}

Future<void> _createNote() async {
  if (_noteController.text.isEmpty) return;

  final response = await http.post(
    Uri.parse('http://174.138.45.229:5000/api/addcard'),
    headers: {'Content-Type': 'application/json'},
    body: jsonEncode({
      'text': _noteController.text,
      'jwtToken': _jwtToken,
    }),
  );

  final data = jsonDecode(response.body);
  if (data['jwtToken'] != null && data['jwtToken'] != '') {
    _jwtToken = data['jwtToken'].toString();
  }

  if (data['error'] == '') {
    _noteController.clear();
    _fetchNotes();
  }
}

  String _formatTime(int seconds) {
    final h = (seconds ~/ 3600).toString().padLeft(2, '0');
    final m = ((seconds % 3600) ~/ 60).toString().padLeft(2, '0');
    final s = (seconds % 60).toString().padLeft(2, '0');
    return '$h:$m:$s';
  }

  @override
  void dispose() {
    _timer?.cancel();
    _noteController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Welcome to the Study App'),
        actions: [
          IconButton(
            icon: const Icon(Icons.calendar_month),
            onPressed: () => Navigator.push(context, MaterialPageRoute(
              builder: (_) => CalendarScreen(jwtToken: widget.jwtToken),
            )),
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            // Timer section
            const Spacer(),
            Text(
              _formatTime(_seconds),
              style: const TextStyle(fontSize: 64, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 20),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                ElevatedButton(
                  onPressed: _startStop,
                  child: Text(_isRunning ? 'Stop' : 'Start'),
                ),
                const SizedBox(width: 16),
                ElevatedButton(
                  onPressed: _reset,
                  child: const Text('Reset'),
                ),
              ],
            ),
            const Spacer(),

            // Notes section
            TextField(
              controller: _noteController,
              maxLines: 4,
              decoration: const InputDecoration(
                labelText: 'Type your note here...',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 10),
            ElevatedButton(
              onPressed: _createNote,
              child: const Text('Create Note'),
            ),

            // Notes list
            if (_notes.isNotEmpty) ...[
              const SizedBox(height: 16),
              const Align(
                alignment: Alignment.centerLeft,
                child: Text('Saved Notes:', style: TextStyle(fontWeight: FontWeight.bold)),
              ),
              Expanded(
                child: ListView.builder(
                  itemCount: _notes.length,
                  itemBuilder: (context, index) => _NoteCard(note: _notes[index]['text'].toString()),
                ),
              ),
            ]
          ],
        ),
      ),
    );
  }
}

class _NoteCard extends StatefulWidget {
  final String note;
  const _NoteCard({required this.note});

  @override
  State<_NoteCard> createState() => _NoteCardState();
}

class _NoteCardState extends State<_NoteCard> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    final lines = widget.note.split('\n');
    final hasMore = lines.length > 1 || widget.note.length > 60;

    return Card(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    lines.first,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontWeight: FontWeight.w500),
                  ),
                ),
                if (hasMore)
                  IconButton(
                    icon: Icon(_expanded ? Icons.expand_less : Icons.expand_more),
                    onPressed: () => setState(() => _expanded = !_expanded),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                  ),
              ],
            ),
            if (_expanded && hasMore)
              Padding(
                padding: const EdgeInsets.only(top: 6),
                child: Text(widget.note),
              ),
          ],
        ),
      ),
    );
  }
}