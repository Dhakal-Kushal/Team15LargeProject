import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../main.dart'; // Ensure this points to your main.dart file

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

  String _extractToken(dynamic raw) {
    if (raw == null) return _jwtToken;
    if (raw is Map) return raw['accessToken']?.toString() ?? _jwtToken;
    return raw.toString();
  }

  Future<void> _fetchAllNotes() async {
    try {
      final response = await http.post(
        Uri.parse('https://team15study.com/api/searchcards'),
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
          final key =
              '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
          grouped.putIfAbsent(key, () => []).add(note);
        }
        setState(() => _notesByDate = grouped);
      }
    } catch (e) {
      debugPrint("Calendar Load Error: $e");
    }
  }

  void _previousMonth() => setState(() =>
      _focusedMonth = DateTime(_focusedMonth.year, _focusedMonth.month - 1));

  void _nextMonth() => setState(() =>
      _focusedMonth = DateTime(_focusedMonth.year, _focusedMonth.month + 1));

  String _monthName(int month) => [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ][month - 1];

  @override
  Widget build(BuildContext context) {
    final bool isDark = MyApp.of(context).isDark;
    final bgColor = isDark ? const Color(0xFF121212) : Colors.white;
    final textColor = isDark ? Colors.white : Colors.black;
    final cardColor = isDark ? Colors.white.withOpacity(0.05) : const Color(0xFFF5F7FF);
    final borderColor = isDark ? Colors.white10 : Colors.black12;

    final firstDay = DateTime(_focusedMonth.year, _focusedMonth.month, 1);
    final daysInMonth = DateTime(_focusedMonth.year, _focusedMonth.month + 1, 0).day;
    final startOffset = firstDay.weekday % 7;

    return Scaffold(
      backgroundColor: bgColor,
      appBar: AppBar(
        title: Text('Calendar', style: TextStyle(color: textColor, fontWeight: FontWeight.bold)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: IconThemeData(color: textColor),
      ),
      body: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                IconButton(icon: Icon(Icons.chevron_left, color: textColor), onPressed: _previousMonth),
                Text('${_monthName(_focusedMonth.month)} ${_focusedMonth.year}',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: textColor)),
                IconButton(icon: Icon(Icons.chevron_right, color: textColor), onPressed: _nextMonth),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                  .map((d) => Expanded(
                        child: Center(
                            child: Text(d,
                                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: textColor.withOpacity(0.5)))),
                      ))
                  .toList(),
            ),
            const SizedBox(height: 8),
            Expanded(
              child: GridView.builder(
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 7, mainAxisExtent: 100),
                itemCount: 42,
                itemBuilder: (context, index) {
                  final dayNum = index - startOffset + 1;
                  if (dayNum < 1 || dayNum > daysInMonth) return const SizedBox();

                  final dateKey =
                      '${_focusedMonth.year}-${_focusedMonth.month.toString().padLeft(2, '0')}-${dayNum.toString().padLeft(2, '0')}';
                  final notes = _notesByDate[dateKey] ?? [];

                  return GestureDetector(
                    onTap: () => showDialog(
                      context: context,
                      builder: (_) => _NoteDialog(
                        dateKey: dateKey,
                        initialNotes: notes,
                        jwtToken: _jwtToken,
                        onSave: (text, time) async {
                          final date = DateTime(
                            int.parse(dateKey.split('-')[0]),
                            int.parse(dateKey.split('-')[1]),
                            int.parse(dateKey.split('-')[2]),
                            time.hour,
                            time.minute,
                          );
                          await http.post(
                            Uri.parse('https://team15study.com/api/addcard'),
                            headers: {'Content-Type': 'application/json'},
                            body: jsonEncode({
                              'text': text,
                              'jwtToken': _jwtToken,
                              'date': date.toIso8601String(),
                            }),
                          );
                          await _fetchAllNotes();
                        },
                        onDelete: (id) async {
                          await http.post(
                            Uri.parse('https://team15study.com/api/deletecard'),
                            headers: {'Content-Type': 'application/json'},
                            body: jsonEncode({'id': id, 'jwtToken': _jwtToken}),
                          );
                          await _fetchAllNotes();
                        },
                        onRefresh: () async {
                          await _fetchAllNotes();
                          return _notesByDate[dateKey] ?? [];
                        },
                        onEdit: (id, newText) async {
                          await http.post(
                            Uri.parse('https://team15study.com/api/deletecard'),
                            headers: {'Content-Type': 'application/json'},
                            body: jsonEncode({'id': id, 'jwtToken': _jwtToken}),
                          );
                          await http.post(
                            Uri.parse('https://team15study.com/api/addcard'),
                            headers: {'Content-Type': 'application/json'},
                            body: jsonEncode({
                              'text': newText,
                              'jwtToken': _jwtToken,
                              'date': '${dateKey}T12:00:00.000Z',
                            }),
                          );
                          await _fetchAllNotes();
                        },
                      ),
                    ),
                    child: Container(
                      margin: const EdgeInsets.all(2),
                      decoration: BoxDecoration(
                        color: cardColor,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: borderColor),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(4),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('$dayNum', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: textColor)),
                            const SizedBox(height: 2),
                            ...notes.take(2).map((n) => Container(
                                  margin: const EdgeInsets.only(bottom: 2),
                                  padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                                  decoration: BoxDecoration(color: const Color(0xFF2d4ef5).withOpacity(0.1), borderRadius: BorderRadius.circular(4)),
                                  child: Text(n['text'], maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 8, color: Color(0xFF2d4ef5), fontWeight: FontWeight.w600)),
                                )),
                            if (notes.length > 2)
                              Text('+${notes.length - 2} more', style: const TextStyle(fontSize: 8, color: Colors.grey)),
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
  final String jwtToken;
  final Future<void> Function(String text, TimeOfDay time) onSave;
  final Future<void> Function(String id) onDelete;
  final Future<List<Map<String, dynamic>>> Function() onRefresh;
  final Future<void> Function(String id, String newText) onEdit;

  const _NoteDialog({
    required this.dateKey,
    required this.initialNotes,
    required this.jwtToken,
    required this.onSave,
    required this.onDelete,
    required this.onRefresh,
    required this.onEdit,
  });

  @override
  State<_NoteDialog> createState() => _NoteDialogState();
}

class _NoteDialogState extends State<_NoteDialog> {
  final TextEditingController _controller = TextEditingController();
  bool _showInput = false;
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
    final bool isDark = MyApp.of(context).isDark;
    final dialogBg = isDark ? const Color(0xFF1E1E1E) : Colors.white;
    final textColor = isDark ? Colors.white : Colors.black;

    return Dialog(
      backgroundColor: dialogBg,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Notes: ${widget.dateKey}', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: textColor)),
                IconButton(icon: Icon(Icons.close, color: textColor), onPressed: () => Navigator.pop(context)),
              ],
            ),
            const SizedBox(height: 12),
            ConstrainedBox(
              constraints: const BoxConstraints(maxHeight: 300),
              child: _notes.isEmpty
                  ? Text('No notes.', style: TextStyle(color: textColor.withOpacity(0.5)))
                  : ListView.builder(
                      shrinkWrap: true,
                      itemCount: _notes.length,
                      itemBuilder: (context, i) {
                        final note = _notes[i];
                        return Container(
                          margin: const EdgeInsets.only(bottom: 8),
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: isDark ? Colors.white.withOpacity(0.05) : Colors.grey[200],
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(_formatTime(note['createdAt']),
                                      style: const TextStyle(fontSize: 11, color: Color(0xFF2d4ef5), fontWeight: FontWeight.bold)),
                                  Row(
                                    children: [
                                      IconButton(
                                        icon: const Icon(Icons.edit_outlined, color: Colors.blue, size: 18),
                                        onPressed: () async {
                                          final editCtrl = TextEditingController(text: note['text']);
                                          await showDialog(
                                            context: context,
                                            builder: (_) => AlertDialog(
                                              backgroundColor: dialogBg,
                                              title: Text('Edit Note', style: TextStyle(color: textColor)),
                                              content: TextField(controller: editCtrl, style: TextStyle(color: textColor)),
                                              actions: [
                                                TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
                                                ElevatedButton(
                                                  onPressed: () async {
                                                    await widget.onEdit(note['id'].toString(), editCtrl.text);
                                                    await _refresh();
                                                    if (context.mounted) Navigator.pop(context);
                                                  },
                                                  child: const Text('Save'),
                                                ),
                                              ],
                                            ),
                                          );
                                        },
                                      ),
                                      IconButton(
                                        icon: const Icon(Icons.delete_outline, color: Colors.redAccent, size: 18),
                                        onPressed: () async {
                                          await widget.onDelete(note['id'].toString());
                                          await _refresh();
                                        },
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                              Text(note['text'], style: TextStyle(color: textColor)),
                            ],
                          ),
                        );
                      },
                    ),
            ),
            if (_showInput) ...[
              const Divider(),
              TextField(
                controller: _controller,
                style: TextStyle(color: textColor),
                decoration: InputDecoration(hintText: 'New note...', hintStyle: TextStyle(color: textColor.withOpacity(0.4)), border: InputBorder.none),
              ),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  TextButton(
                    onPressed: () async {
                      final picked = await showTimePicker(context: context, initialTime: _selectedTime);
                      if (picked != null) setState(() => _selectedTime = picked);
                    },
                    child: Text(_selectedTime.format(context)),
                  ),
                  ElevatedButton(
                    onPressed: () async {
                      await widget.onSave(_controller.text, _selectedTime);
                      await _refresh();
                      setState(() {
                        _showInput = false;
                        _controller.clear();
                      });
                    },
                    style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF2d4ef5)),
                    child: const Text('Save', style: TextStyle(color: Colors.white)),
                  ),
                ],
              )
            ] else
              TextButton.icon(onPressed: () => setState(() => _showInput = true), icon: const Icon(Icons.add, color: Color(0xFF2d4ef5)), label: const Text('Add Note', style: TextStyle(color: Color(0xFF2d4ef5)))),
          ],
        ),
      ),
    );
  }
}