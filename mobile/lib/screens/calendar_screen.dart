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

  String _extractToken(dynamic raw) {
    if (raw == null) return _jwtToken;
    if (raw is Map) return raw['accessToken']?.toString() ?? _jwtToken;
    final str = raw.toString();
    if (str.contains('accessToken')) {
      final decoded = jsonDecode(str);
      return decoded['accessToken']?.toString() ?? _jwtToken;
    }
    return str;
  }

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
    if (data['jwtToken'] != null && data['jwtToken'] != '') {
      _jwtToken = _extractToken(data['jwtToken']);
    }

    if (data['results'] != null) {
      final Map<String, List<Map<String, dynamic>>> grouped = {};
      for (var note in data['results']) {
        final date = DateTime.parse(note['createdAt']);
        final key = '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
        grouped.putIfAbsent(key, () => []).add(note);
      }
      for (var key in grouped.keys) {
        grouped[key]!.sort((a, b) => b['createdAt'].toString().compareTo(a['createdAt'].toString()));
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
                IconButton(
                  icon: const Icon(Icons.chevron_left),
                  onPressed: _previousMonth,
                  tooltip: 'Previous month',
                ),
                Text(
                  '${_monthName(_focusedMonth.month)} ${_focusedMonth.year}',
                  style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                ),
                IconButton(
                  icon: const Icon(Icons.chevron_right),
                  onPressed: _nextMonth,
                  tooltip: 'Next month',
                ),
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
                  mainAxisExtent: 100,
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
                        initialNotes: notes,
                        onSave: (text, time) async {
                          final date = DateTime(
                            int.parse(dateKey.split('-')[0]),
                            int.parse(dateKey.split('-')[1]),
                            int.parse(dateKey.split('-')[2]),
                            time.hour,
                            time.minute,
                          );
                          final response = await http.post(
                            Uri.parse('http://174.138.45.229:5000/api/addcard'),
                            headers: {'Content-Type': 'application/json'},
                            body: jsonEncode({
                              'text': text,
                              'jwtToken': _jwtToken,
                              'date': date.toIso8601String(),
                            }),
                          );
                          final data = jsonDecode(response.body);
                          if (data['jwtToken'] != null) {
                            _jwtToken = _extractToken(data['jwtToken']);
                          }
                          await _fetchAllNotes();
                        },
                        onDelete: (id) async {
                          final response = await http.post(
                            Uri.parse('http://174.138.45.229:5000/api/deletecard'),
                            headers: {'Content-Type': 'application/json'},
                            body: jsonEncode({
                              'id': id,
                              'jwtToken': _jwtToken,
                            }),
                          );
                          final data = jsonDecode(response.body);
                          if (data['jwtToken'] != null) {
                            _jwtToken = _extractToken(data['jwtToken']);
                          }
                          await _fetchAllNotes();
                        },
                        onRefresh: () async {
                          await _fetchAllNotes();
                          return _notesByDate[dateKey] ?? [];
                        },
                        onEdit: (id, newText) async {
                          // delete old note
                          final deleteResponse = await http.post(
                            Uri.parse('http://174.138.45.229:5000/api/deletecard'),
                            headers: {'Content-Type': 'application/json'},
                            body: jsonEncode({'id': id, 'jwtToken': _jwtToken}),
                          );
                          final deleteData = jsonDecode(deleteResponse.body);
                          if (deleteData['jwtToken'] != null) {
                            _jwtToken = _extractToken(deleteData['jwtToken']);
                          }

                          // recreate with same date
                          final addResponse = await http.post(
                            Uri.parse('http://174.138.45.229:5000/api/addcard'),
                            headers: {'Content-Type': 'application/json'},
                            body: jsonEncode({
                              'text': newText,
                              'jwtToken': _jwtToken,
                              'date': '${dateKey}T12:00:00.000Z',
                            }),
                          );
                          final addData = jsonDecode(addResponse.body);
                          if (addData['jwtToken'] != null) {
                            _jwtToken = _extractToken(addData['jwtToken']);
                          }
                          await _fetchAllNotes();
                        },
                      ),
                    ),
                    child: Container(
                      margin: const EdgeInsets.all(2),
                      decoration: BoxDecoration(
                        color: Theme.of(context).colorScheme.surface,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Theme.of(context).colorScheme.outlineVariant),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(4),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
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
                                    color: Theme.of(context).colorScheme.primaryContainer,
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
  final List<Map<String, dynamic>> initialNotes;
  final Future<void> Function(String text, TimeOfDay time) onSave;
  final Future<void> Function(String id) onDelete;
  final Future<List<Map<String, dynamic>>> Function() onRefresh;
  final Future<void> Function(String id, String newText) onEdit;

  const _NoteDialog({
    required this.dateKey,
    required this.initialNotes,
    required this.onSave,
    required this.onDelete,
    required this.onRefresh,
    required this.onEdit,
  });

  @override
  State<_NoteDialog> createState() => _NoteDialogState();
}

class _NoteDialogState extends State<_NoteDialog> {
  bool _showInput = false;
  final TextEditingController _controller = TextEditingController();
  bool _saving = false;
  late List<Map<String, dynamic>> _notes;
  TimeOfDay _selectedTime = TimeOfDay.now();

  @override
  void initState() {
    super.initState();
    _notes = List.from(widget.initialNotes);
  }

  String _formatTime(String isoDate) {
    final dt = DateTime.parse(isoDate);
    final h = dt.hour > 12 ? dt.hour - 12 : dt.hour == 0 ? 12 : dt.hour;
    final m = dt.minute.toString().padLeft(2, '0');
    final period = dt.hour >= 12 ? 'PM' : 'AM';
    return '$h:$m $period';
  }

  Future<void> _refresh() async {
    final updated = await widget.onRefresh();
    setState(() => _notes = updated);
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
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Notes for ${widget.dateKey}',
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.pop(context),
                  tooltip: 'Close',
                ),
              ],
            ),
            const SizedBox(height: 12),
            ConstrainedBox(
              constraints: const BoxConstraints(maxHeight: 300),
              child: _notes.isEmpty
                  ? const Text('No notes for this day.', style: TextStyle(color: Colors.grey))
                  : ListView.builder(
                      shrinkWrap: true,
                      itemCount: _notes.length,
                      itemBuilder: (context, i) {
                        final note = _notes[i];
                        return Container(
                          margin: const EdgeInsets.only(bottom: 8),
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Theme.of(context).colorScheme.surfaceContainerHighest,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    _formatTime(note['createdAt'].toString()),
                                    style: TextStyle(fontSize: 11, color: Colors.blue.shade600, fontWeight: FontWeight.bold),
                                  ),
                                  Row(
                                    children: [
                                      IconButton(
                                        icon: const Icon(Icons.edit_outlined, color: Colors.blue, size: 16),
                                        tooltip: 'Edit note',
                                        onPressed: () async {
                                          final editController = TextEditingController(text: note['text'].toString());
                                          await showDialog(
                                            context: context,
                                            builder: (_) => AlertDialog(
                                              title: const Text('Edit Note'),
                                              content: TextField(
                                                controller: editController,
                                                maxLines: 3,
                                                decoration: const InputDecoration(border: OutlineInputBorder()),
                                              ),
                                              actions: [
                                                TextButton(
                                                  onPressed: () => Navigator.pop(context),
                                                  child: const Text('Cancel'),
                                                ),
                                                ElevatedButton(
                                                  onPressed: () async {
                                                    if (editController.text.isEmpty) return;
                                                    await widget.onEdit(note['id'].toString(), editController.text);
                                                    await _refresh();
                                                    if (mounted) Navigator.pop(context);
                                                  },
                                                  child: const Text('Save'),
                                                ),
                                              ],
                                            ),
                                          );
                                          editController.dispose();
                                        },
                                      ),
                                      IconButton(
                                        icon: const Icon(Icons.delete_outline, color: Colors.red, size: 16),
                                        tooltip: 'Delete note',
                                        onPressed: () async {
                                          await widget.onDelete(note['id'].toString());
                                          await _refresh();
                                        },
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                              const SizedBox(height: 4),
                              Text(note['text'].toString()),
                            ],
                          ),
                        );
                      },
                    ),
            ),
            const SizedBox(height: 12),
            if (_showInput) ...[
              Row(
                children: [
                  const Text('Time: ', style: TextStyle(fontWeight: FontWeight.bold)),
                  TextButton(
                    onPressed: () async {
                      final picked = await showTimePicker(
                        context: context,
                        initialTime: _selectedTime,
                      );
                      if (picked != null) {
                        setState(() => _selectedTime = picked);
                      }
                    },
                    child: Text(
                      '${_selectedTime.hourOfPeriod == 0 ? 12 : _selectedTime.hourOfPeriod}:${_selectedTime.minute.toString().padLeft(2, '0')} ${_selectedTime.period == DayPeriod.am ? 'AM' : 'PM'}',
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              TextField(
                controller: _controller,
                maxLines: 3,
                decoration: InputDecoration(
                  hintText: 'Type your note here...',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                ),
              ),
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton(
                    onPressed: () => setState(() {
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
                            await widget.onSave(_controller.text, _selectedTime);
                            await _refresh();
                            setState(() {
                              _saving = false;
                              _showInput = false;
                              _controller.clear();
                            });
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