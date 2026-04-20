import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

class CalendarScreen extends StatefulWidget {
  final String jwtToken;
  const CalendarScreen({super.key, required this.jwtToken});

  @override
  State<CalendarScreen> createState() => _CalendarScreenState();
}

class _CalendarScreenState extends State<CalendarScreen> {
  late String _jwtToken;
  DateTime _focusedMonth = DateTime.now();
  Map<String, List<Map<String, dynamic>>> _notesByDate = {};

  @override
  void initState() {
    super.initState();
    _jwtToken = widget.jwtToken;
    _fetchAllNotes();
  }

  Future<void> _fetchAllNotes() async {
    final response = await http.post(
      Uri.parse('http://174.138.45.229:5000/api/searchcards'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'search': '', 'jwtToken': _jwtToken}),
    );

    final data = jsonDecode(response.body);
    print('results: ${data['results']}'); // add this line
    if (data['jwtToken'] != null && data['jwtToken'] != '') {
      _jwtToken = data['jwtToken'].toString();
    }

    if (data['results'] != null) {
      final Map<String, List<Map<String, dynamic>>> grouped = {};
      for (var note in data['results']) {
        final date = DateTime.parse(note['createdAt']).toLocal();
        final key = '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
        grouped.putIfAbsent(key, () => []).add(note);
      }
      setState(() => _notesByDate = grouped);
    }

  }

  void _previousMonth() {
    setState(() {
      _focusedMonth = DateTime(_focusedMonth.year, _focusedMonth.month - 1);
    });
  }

  void _nextMonth() {
    setState(() {
      _focusedMonth = DateTime(_focusedMonth.year, _focusedMonth.month + 1);
    });
  }

  String _monthName(int month) {
    const names = ['January','February','March','April','May','June',
      'July','August','September','October','November','December'];
    return names[month - 1];
  }

  @override
  Widget build(BuildContext context) {
    final firstDay = DateTime(_focusedMonth.year, _focusedMonth.month, 1);
    final daysInMonth = DateTime(_focusedMonth.year, _focusedMonth.month + 1, 0).day;
    final startOffset = firstDay.weekday % 7;
    final totalCells = startOffset + daysInMonth;
    final rows = (totalCells / 7).ceil();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Calendar'),
        leading: BackButton(),
      ),
      body: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          children: [
            // Month navigation
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                IconButton(icon: const Icon(Icons.chevron_left), onPressed: _previousMonth),
                Text(
                  '${_monthName(_focusedMonth.month)} ${_focusedMonth.year}',
                  style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                ),
                IconButton(icon: const Icon(Icons.chevron_right), onPressed: _nextMonth),
              ],
            ),
            const SizedBox(height: 8),
            // Day headers
            Row(
              children: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
                  .map((d) => Expanded(
                        child: Center(
                          child: Text(d, style: const TextStyle(
                            fontWeight: FontWeight.bold, fontSize: 12)),
                        ),
                      ))
                  .toList(),
            ),
            const SizedBox(height: 4),
            // Calendar grid
            Expanded(
              child: GridView.builder(
                physics: const NeverScrollableScrollPhysics(),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 7,
                  childAspectRatio: 0.75,
                ),
                itemCount: rows * 7,
                itemBuilder: (context, index) {
                  final dayNum = index - startOffset + 1;
                  if (dayNum < 1 || dayNum > daysInMonth) {
                    return const SizedBox();
                  }

                  final dateKey =
                      '${_focusedMonth.year}-${_focusedMonth.month.toString().padLeft(2, '0')}-${dayNum.toString().padLeft(2, '0')}';
                  final notes = _notesByDate[dateKey] ?? [];

                  return GestureDetector(
                    onTap: () => showDialog(
                      context: context,
                      builder: (_) => _NoteDialog(
                        dateKey: dateKey,
                        notes: notes,
                        onSave: (text) async {
                          final response = await http.post(
                            Uri.parse('http://174.138.45.229:5000/api/addcard'),
                            headers: {'Content-Type': 'application/json'},
                            body: jsonEncode({'text': text, 'jwtToken': _jwtToken}),
                          );
                          final data = jsonDecode(response.body);
                          if (data['jwtToken'] != null && data['jwtToken'] != '') {
                            _jwtToken = data['jwtToken'].toString();
                          }
                          await _fetchAllNotes();
                        },
                      ),
                    ),
                    child: Container(
                      margin: const EdgeInsets.all(2),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Colors.grey.shade200),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(4),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('$dayNum',
                                style: const TextStyle(
                                    fontWeight: FontWeight.bold, fontSize: 12)),
                            const SizedBox(height: 2),
                            ...notes.take(3).map((n) => Container(
                                  margin: const EdgeInsets.only(bottom: 2),
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 4, vertical: 1),
                                  decoration: BoxDecoration(
                                    color: Colors.blue.shade50,
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Text(
                                    n['text'],
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(fontSize: 9),
                                  ),
                                )),
                            if (notes.length > 3)
                              Text('+${notes.length - 3} more',
                                  style: TextStyle(
                                      fontSize: 9, color: Colors.blue.shade400)),
                          ],
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _NoteDialog extends StatefulWidget {
  final String dateKey;
  final List<Map<String, dynamic>> notes;
  final Future<void> Function(String text) onSave;

  const _NoteDialog({
    required this.dateKey,
    required this.notes,
    required this.onSave,
  });

  @override
  State<_NoteDialog> createState() => _NoteDialogState();
}

class _NoteDialogState extends State<_NoteDialog> {
  bool _showInput = false;
  final TextEditingController _controller = TextEditingController();
  bool _saving = false;

  String _formatTime(String isoDate) {
    final dt = DateTime.parse(isoDate).toLocal();
    final h = dt.hour > 12 ? dt.hour - 12 : dt.hour == 0 ? 12 : dt.hour;
    final m = dt.minute.toString().padLeft(2, '0');
    final period = dt.hour >= 12 ? 'PM' : 'AM';
    return '$h:$m $period';
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Notes for ${widget.dateKey}',
                    style: const TextStyle(
                        fontSize: 18, fontWeight: FontWeight.bold)),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.pop(context),
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(),
                ),
              ],
            ),
            const SizedBox(height: 12),
            // Notes list
            ConstrainedBox(
              constraints: const BoxConstraints(maxHeight: 300),
              child: widget.notes.isEmpty
                  ? const Text('No notes for this day.',
                      style: TextStyle(color: Colors.grey))
                  : ListView.builder(
                      shrinkWrap: true,
                      itemCount: widget.notes.length,
                      itemBuilder: (context, i) {
                        final note = widget.notes[i];
                        return Container(
                          margin: const EdgeInsets.only(bottom: 8),
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.grey.shade100,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                _formatTime(note['createdAt']),
                                style: TextStyle(
                                    fontSize: 11,
                                    color: Colors.blue.shade600,
                                    fontWeight: FontWeight.bold),
                              ),
                              const SizedBox(height: 4),
                              Text(note['text']),
                            ],
                          ),
                        );
                      },
                    ),
            ),
            const SizedBox(height: 12),
            // Add note input
            if (_showInput) ...[
              TextField(
                controller: _controller,
                maxLines: 3,
                decoration: InputDecoration(
                  hintText: 'Type your note here...',
                  border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8)),
                ),
              ),
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton(
                    onPressed: () =>
                        setState(() {
                          _showInput = false;
                          _controller.clear();
                        }),
                    child: const Text('Cancel'),
                  ),
                  const SizedBox(width: 8),
                  ElevatedButton(
                    onPressed: _saving
                        ? null
                        : () async {
                            if (_controller.text.isEmpty) return;
                            setState(() => _saving = true);
                            await widget.onSave(_controller.text);
                            if (mounted) Navigator.pop(context);
                          },
                    child: const Text('Save Note'),
                  ),
                ],
              ),
            ] else
              ElevatedButton.icon(
                onPressed: () => setState(() => _showInput = true),
                icon: const Icon(Icons.add),
                label: const Text('Add Note'),
              ),
          ],
        ),
      ),
    );
  }
}