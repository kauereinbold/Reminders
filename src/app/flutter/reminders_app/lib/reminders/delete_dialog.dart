import 'package:flutter/material.dart';

import '../theme/tokens.dart';

/// Asks before a delete; resolves true only when the user confirms.
Future<bool> confirmDeleteReminder(BuildContext context, String title) async {
  final confirmed = await showDialog<bool>(
    context: context,
    barrierColor: AppColors.scrim,
    builder: (_) => ReminderDeleteDialog(title: title),
  );
  return confirmed ?? false;
}

/// Delete confirmation per the redesign spec: serif title, body quoting the
/// reminder, destructive Delete and secondary Keep it.
class ReminderDeleteDialog extends StatelessWidget {
  const ReminderDeleteDialog({super.key, required this.title});

  final String title;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    return Dialog(
      backgroundColor: AppColors.surface,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 400),
        child: Padding(
          padding: const EdgeInsets.all(AppSpace.padModal),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'Delete this reminder?',
                style: text.headlineMedium?.copyWith(fontSize: 24),
              ),
              const SizedBox(height: 10),
              Text(
                '“$title” will be removed permanently.',
                style: const TextStyle(
                  fontSize: 14.5,
                  color: AppColors.bodyMuted,
                ),
              ),
              const SizedBox(height: 22),
              // Spec order: destructive action first, then the way out.
              Row(
                children: [
                  FilledButton(
                    key: const ValueKey('delete-confirm'),
                    onPressed: () => Navigator.of(context).pop(true),
                    style: FilledButton.styleFrom(
                      backgroundColor: AppColors.accent,
                      foregroundColor: AppColors.surface,
                      shape: const StadiumBorder(),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 22,
                        vertical: 12,
                      ),
                    ),
                    child: const Text('Delete'),
                  ),
                  const SizedBox(width: 10),
                  OutlinedButton(
                    key: const ValueKey('delete-keep'),
                    onPressed: () => Navigator.of(context).pop(false),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.ink,
                      side: const BorderSide(color: AppColors.borderInput),
                      shape: const StadiumBorder(),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 20,
                        vertical: 12,
                      ),
                    ),
                    child: const Text('Keep it'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
