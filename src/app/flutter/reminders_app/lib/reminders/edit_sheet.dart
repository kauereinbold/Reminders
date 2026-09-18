import 'package:flutter/material.dart';

import '../api/api_client.dart';
import '../api/reminder.dart';
import '../theme/tokens.dart';
import 'delete_dialog.dart';
import 'grouping.dart';

/// Outcome of the create/edit sheet, applied to the list by the caller.
sealed class ReminderSheetResult {
  const ReminderSheetResult();
}

class ReminderSaved extends ReminderSheetResult {
  const ReminderSaved(this.reminder);

  final Reminder reminder;
}

class ReminderDeleted extends ReminderSheetResult {
  const ReminderDeleted(this.id);

  final String id;
}

/// Opens the create ([initial] null) or edit bottom sheet over the list.
Future<ReminderSheetResult?> showReminderSheet(
  BuildContext context, {
  required RemindersApi api,
  Reminder? initial,
}) {
  return showModalBottomSheet<ReminderSheetResult>(
    context: context,
    isScrollControlled: true,
    backgroundColor: AppColors.surface,
    barrierColor: AppColors.scrim,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (_) => ReminderSheet(api: api, initial: initial),
  );
}

/// Create/edit form per the redesign modal spec, rendered as a bottom sheet.
///
/// The sheet owns the API call so an error keeps it open with the draft
/// intact; it pops with a [ReminderSheetResult] only on success. Field
/// errors use the shared contract keys (title, description, limitDate),
/// anything else lands on the banner, mirroring the React sheet.
class ReminderSheet extends StatefulWidget {
  const ReminderSheet({super.key, required this.api, this.initial});

  final RemindersApi api;
  final Reminder? initial;

  @override
  State<ReminderSheet> createState() => _ReminderSheetState();
}

class _ReminderSheetState extends State<ReminderSheet> {
  static const _fieldKeys = ['title', 'description', 'limitDate'];

  late final _title = TextEditingController(text: widget.initial?.title ?? '');
  late final _description = TextEditingController(
    text: widget.initial?.description ?? '',
  );

  /// New reminders default to tomorrow, matching the design prototype.
  late DateTime _limitDate =
      widget.initial?.limitDate ?? startOfToday().add(const Duration(days: 1));
  late bool _isDone = widget.initial?.isDone ?? false;

  bool _busy = false;
  String? _error;
  Map<String, List<String>> _fieldErrors = const {};

  bool get _editing => widget.initial != null;

  @override
  void dispose() {
    _title.dispose();
    _description.dispose();
    super.dispose();
  }

  String? _fieldError(String key) => _fieldErrors[key]?.join(' ');

  /// Validation errors go next to their field; everything else is a banner.
  void _applyError(Object error) {
    if (error is ApiException && error.isValidation) {
      _fieldErrors = error.fieldErrors;
      final unmapped = error.fieldErrors.entries
          .where((entry) => !_fieldKeys.contains(entry.key))
          .expand((entry) => entry.value)
          .join(' ');
      _error = unmapped.isEmpty ? null : unmapped;
    } else {
      _fieldErrors = const {};
      _error = error is ApiException ? error.message : 'Something went wrong.';
    }
  }

  Future<void> _run(Future<ReminderSheetResult> Function() action) async {
    setState(() {
      _busy = true;
      _error = null;
      _fieldErrors = const {};
    });
    try {
      final result = await action();
      if (!mounted) return;
      Navigator.of(context).pop(result);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _busy = false;
        _applyError(e);
      });
    }
  }

  Future<void> _save() {
    final draft = Reminder(
      id: widget.initial?.id,
      title: _title.text.trim(),
      description: _description.text.trim(),
      limitDate: _limitDate,
      isDone: _isDone,
    );
    return _run(() async {
      final saved = _editing
          ? await widget.api.update(draft)
          : await widget.api.create(draft);
      return ReminderSaved(saved);
    });
  }

  Future<void> _delete() async {
    final initial = widget.initial;
    if (initial == null || initial.id == null) return;
    final confirmed = await confirmDeleteReminder(context, initial.title);
    if (!confirmed || !mounted) return;
    await _run(() async {
      await widget.api.delete(initial.id!);
      return ReminderDeleted(initial.id!);
    });
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _limitDate,
      firstDate: DateTime(2000),
      lastDate: DateTime(2100),
    );
    if (picked == null || !mounted) return;
    setState(
      () => _limitDate = DateTime.utc(picked.year, picked.month, picked.day),
    );
  }

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    final canSave = _title.text.trim().isNotEmpty && !_busy;
    return Padding(
      // Keep the footer above the keyboard while typing.
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(AppSpace.padModal),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    _editing ? 'Edit reminder' : 'New reminder',
                    style: text.headlineMedium?.copyWith(fontSize: 24),
                  ),
                ),
                TextButton(
                  onPressed: _busy ? null : () => Navigator.of(context).pop(),
                  child: const Text(
                    'Close',
                    style: TextStyle(color: AppColors.bodyMuted),
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpace.gapFields),
            const _FieldLabel('Title'),
            TextField(
              key: const ValueKey('sheet-title'),
              controller: _title,
              autofocus: true,
              onChanged: (_) => setState(() {}),
              style: const TextStyle(fontSize: 15.5),
              decoration: _decoration('Call the notary'),
            ),
            _FieldError(_fieldError('title')),
            const SizedBox(height: AppSpace.gapFields),
            const _FieldLabel('Description'),
            TextField(
              key: const ValueKey('sheet-description'),
              controller: _description,
              maxLines: 3,
              style: const TextStyle(fontSize: 15),
              decoration: _decoration('Optional detail'),
            ),
            _FieldError(_fieldError('description')),
            const SizedBox(height: AppSpace.gapFields),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const _FieldLabel('Limit date'),
                      _InputBox(
                        key: const ValueKey('sheet-date'),
                        semanticLabel: 'Limit date',
                        onTap: _busy ? null : _pickDate,
                        child: Row(
                          children: [
                            Expanded(
                              child: Text(
                                fullDateLabel(_limitDate),
                                style: const TextStyle(fontSize: 15),
                              ),
                            ),
                            const Icon(
                              Icons.calendar_today_outlined,
                              size: 16,
                              color: AppColors.faint,
                            ),
                          ],
                        ),
                      ),
                      _FieldError(_fieldError('limitDate')),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const _FieldLabel('Status'),
                      _InputBox(
                        key: const ValueKey('sheet-status'),
                        semanticLabel: 'Status',
                        onTap: _busy
                            ? null
                            : () => setState(() => _isDone = !_isDone),
                        child: Row(
                          children: [
                            _StatusCheck(done: _isDone),
                            const SizedBox(width: 9),
                            Flexible(
                              child: Text(
                                _isDone ? 'Done' : 'Not done yet',
                                style: const TextStyle(
                                  fontSize: 14,
                                  color: AppColors.bodyMuted,
                                ),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            if (_error != null) ...[
              const SizedBox(height: AppSpace.gapFields),
              Text(
                _error!,
                style: const TextStyle(fontSize: 13.5, color: AppColors.accent),
              ),
            ],
            const SizedBox(height: 24),
            Row(
              children: [
                Expanded(
                  child: FilledButton(
                    key: const ValueKey('sheet-save'),
                    onPressed: canSave ? _save : null,
                    style: FilledButton.styleFrom(
                      backgroundColor: AppColors.ink,
                      foregroundColor: AppColors.inputFill,
                      shape: const StadiumBorder(),
                      padding: const EdgeInsets.symmetric(vertical: 13),
                      textStyle: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    child: Text(_editing ? 'Save changes' : 'Create reminder'),
                  ),
                ),
                const SizedBox(width: 10),
                OutlinedButton(
                  onPressed: _busy ? null : () => Navigator.of(context).pop(),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.ink,
                    side: const BorderSide(color: AppColors.borderInput),
                    shape: const StadiumBorder(),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 20,
                      vertical: 13,
                    ),
                  ),
                  child: const Text('Cancel'),
                ),
              ],
            ),
            if (_editing) ...[
              const SizedBox(height: 6),
              Align(
                alignment: Alignment.centerRight,
                child: TextButton(
                  key: const ValueKey('sheet-delete'),
                  onPressed: _busy ? null : _delete,
                  style: TextButton.styleFrom(
                    foregroundColor: AppColors.accent,
                  ),
                  child: const Text('Delete reminder'),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  static InputDecoration _decoration(String hint) => InputDecoration(
    hintText: hint,
    hintStyle: const TextStyle(color: AppColors.faint),
    filled: true,
    fillColor: AppColors.inputFill,
    isDense: true,
    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
    border: _border(AppColors.borderInput, 1),
    enabledBorder: _border(AppColors.borderInput, 1),
    focusedBorder: _border(AppColors.accent, 2),
  );

  static OutlineInputBorder _border(Color color, double width) =>
      OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppRadii.input),
        borderSide: BorderSide(color: color, width: width),
      );
}

class _FieldLabel extends StatelessWidget {
  const _FieldLabel(this.label);

  final String label;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 7),
      child: Text(
        label.toUpperCase(),
        style: const TextStyle(
          fontSize: 11.5,
          letterSpacing: 1.05,
          fontWeight: FontWeight.w500,
          color: AppColors.faint,
        ),
      ),
    );
  }
}

class _FieldError extends StatelessWidget {
  const _FieldError(this.message);

  final String? message;

  @override
  Widget build(BuildContext context) {
    if (message == null) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(top: 6),
      child: Text(
        message!,
        style: const TextStyle(fontSize: 12.5, color: AppColors.accent),
      ),
    );
  }
}

/// Tap target styled like a text input: 48px, input border, fill and radius.
class _InputBox extends StatelessWidget {
  const _InputBox({
    super.key,
    required this.semanticLabel,
    required this.onTap,
    required this.child,
  });

  final String semanticLabel;
  final VoidCallback? onTap;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: semanticLabel,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppRadii.input),
        child: Container(
          height: 48,
          padding: const EdgeInsets.symmetric(horizontal: 14),
          alignment: Alignment.centerLeft,
          decoration: BoxDecoration(
            color: AppColors.inputFill,
            border: Border.all(color: AppColors.borderInput),
            borderRadius: BorderRadius.circular(AppRadii.input),
          ),
          child: child,
        ),
      ),
    );
  }
}

class _StatusCheck extends StatelessWidget {
  const _StatusCheck({required this.done});

  final bool done;

  @override
  Widget build(BuildContext context) {
    // Spec: the box keeps its border and fill; only the green check appears.
    return Container(
      width: 20,
      height: 20,
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: AppColors.borderHoverStrong, width: 1.6),
      ),
      child: done
          ? const Icon(Icons.check, size: 13, color: AppColors.success)
          : null,
    );
  }
}
