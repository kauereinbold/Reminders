import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:reminders_app/api/api_client.dart';
import 'package:reminders_app/api/reminder.dart';
import 'package:reminders_app/reminders/grouping.dart';
import 'package:reminders_app/reminders/list_screen.dart';
import 'package:reminders_app/theme/tokens.dart';

import '../helpers.dart';

final upcoming = {
  'id': '3',
  'title': 'Book flights',
  'description': 'Aim for the morning one',
  'limitDate': Reminder.formatDate(dayFromToday(4)),
  'isDone': false,
};

/// Pumps the list screen; the sheet and dialog open over it like in the app.
Future<List<http.Request>> pumpScreen(
  WidgetTester tester, {
  List<Map<String, dynamic>> items = const [],
  FutureOr<http.Response> Function(http.Request)? onWrite,
}) async {
  final requests = <http.Request>[];
  final api = RemindersApi(
    client: MockClient((request) async {
      requests.add(request);
      if (request.method == 'GET') {
        return http.Response(jsonEncode(items), 200);
      }
      return onWrite!(request);
    }),
    baseUrl: 'http://localhost:9999',
  );
  await tester.pumpWidget(
    MaterialApp(
      theme: buildAppTheme(),
      home: RemindersListScreen(api: api),
    ),
  );
  await tester.pumpAndSettle();
  return requests;
}

Future<void> openCreateSheet(WidgetTester tester) async {
  await tester.tap(find.widgetWithText(FloatingActionButton, 'New'));
  await tester.pumpAndSettle();
}

Future<void> openEditSheet(WidgetTester tester, String id) async {
  await tester.tap(find.byKey(ValueKey('card-$id')));
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('tapping the checkbox toggles without opening the sheet', (
    tester,
  ) async {
    // The checkbox sits inside the card, which opens the sheet on tap. This
    // pins which of the two nested taps wins: the checkbox must take it, or
    // the sheet opens every time someone ticks a reminder off.
    final requests = await pumpScreen(
      tester,
      items: [upcoming],
      onWrite: (_) =>
          http.Response(jsonEncode({...upcoming, 'isDone': true}), 200),
    );

    await tester.tap(find.byKey(const ValueKey('toggle-3')));
    await tester.pumpAndSettle();

    expect(find.text('Edit reminder'), findsNothing);
    expect(requests.last.method, 'PUT');
    expect(jsonDecode(requests.last.body)['isDone'], true);
  });

  testWidgets('FAB opens the create sheet defaulting to tomorrow', (
    tester,
  ) async {
    await pumpScreen(tester);
    await openCreateSheet(tester);

    expect(find.text('New reminder'), findsOneWidget);
    expect(find.text(fullDateLabel(dayFromToday(1))), findsOneWidget);
    expect(find.text('Not done yet'), findsOneWidget);

    // Blank title: save is a no-op.
    final save = tester.widget<FilledButton>(
      find.byKey(const ValueKey('sheet-save')),
    );
    expect(save.onPressed, isNull);
    expect(find.text('Delete reminder'), findsNothing);
  });

  testWidgets('creates a reminder and adds it to the list', (tester) async {
    final requests = await pumpScreen(
      tester,
      onWrite: (request) => http.Response(
        jsonEncode({
          ...jsonDecode(request.body) as Map<String, dynamic>,
          'id': '9',
        }),
        201,
      ),
    );
    await openCreateSheet(tester);

    await tester.enterText(
      find.byKey(const ValueKey('sheet-title')),
      'Dentist',
    );
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('sheet-save')));
    await tester.pumpAndSettle();

    expect(requests.last.method, 'POST');
    expect(jsonDecode(requests.last.body)['title'], 'Dentist');
    expect(find.text('New reminder'), findsNothing);
    expect(find.text('Dentist'), findsOneWidget);
  });

  testWidgets('card tap opens the edit sheet prefilled and saves changes', (
    tester,
  ) async {
    final requests = await pumpScreen(
      tester,
      items: [upcoming],
      onWrite: (request) => http.Response(request.body, 200),
    );
    await openEditSheet(tester, '3');

    expect(find.text('Edit reminder'), findsOneWidget);
    expect(find.text('Book flights'), findsWidgets);
    expect(find.text('Aim for the morning one'), findsWidgets);

    // The status toggle flips the label and lands in the payload.
    await tester.tap(find.byKey(const ValueKey('sheet-status')));
    await tester.pumpAndSettle();
    expect(find.text('Done'), findsWidgets);

    await tester.enterText(
      find.byKey(const ValueKey('sheet-title')),
      'Book trains',
    );
    await tester.tap(find.byKey(const ValueKey('sheet-save')));
    await tester.pumpAndSettle();

    expect(requests.last.method, 'PUT');
    expect(jsonDecode(requests.last.body)['isDone'], true);
    expect(find.text('Edit reminder'), findsNothing);
    expect(find.text('Book trains'), findsOneWidget);
  });

  testWidgets('cancel discards without a request', (tester) async {
    final requests = await pumpScreen(tester, items: [upcoming]);
    await openEditSheet(tester, '3');

    await tester.enterText(
      find.byKey(const ValueKey('sheet-title')),
      'Changed',
    );
    await tester.tap(find.text('Cancel'));
    await tester.pumpAndSettle();

    expect(requests.every((r) => r.method == 'GET'), isTrue);
    expect(find.text('Book flights'), findsOneWidget);
    expect(find.text('Changed'), findsNothing);
  });

  testWidgets('a validation error keeps the sheet open next to its field', (
    tester,
  ) async {
    await pumpScreen(
      tester,
      onWrite: (_) => http.Response(
        jsonEncode({
          'title': 'Validation failed',
          'errors': {
            'title': ['Title is required.'],
          },
        }),
        400,
      ),
    );
    await openCreateSheet(tester);

    await tester.enterText(find.byKey(const ValueKey('sheet-title')), 'x');
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('sheet-save')));
    await tester.pumpAndSettle();

    expect(find.text('New reminder'), findsOneWidget);
    expect(find.text('Title is required.'), findsOneWidget);
  });

  testWidgets('a server error lands on the sheet banner', (tester) async {
    await pumpScreen(
      tester,
      onWrite: (_) =>
          http.Response(jsonEncode({'message': 'Database is down'}), 500),
    );
    await openCreateSheet(tester);

    await tester.enterText(
      find.byKey(const ValueKey('sheet-title')),
      'Dentist',
    );
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('sheet-save')));
    await tester.pumpAndSettle();

    // Not a field error: it goes to the banner and the draft survives.
    expect(find.text('New reminder'), findsOneWidget);
    expect(find.text('Database is down'), findsOneWidget);
    expect(find.text('Dentist'), findsOneWidget);
  });

  testWidgets('the sheet cannot be dismissed while a save is in flight', (
    tester,
  ) async {
    // Dismissing mid-save would pop the route and drop the result, leaving
    // the list stale. The barrier tap and the drag are both refused here.
    final post = Completer<http.Response>();
    await pumpScreen(
      tester,
      onWrite: (request) => post.future,
    );
    await openCreateSheet(tester);

    await tester.enterText(
      find.byKey(const ValueKey('sheet-title')),
      'Dentist',
    );
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('sheet-save')));
    await tester.pump();

    await tester.tapAt(const Offset(10, 10));
    await tester.pump();
    expect(find.text('New reminder'), findsOneWidget);

    await tester.fling(
      find.text('New reminder'),
      const Offset(0, 400),
      1200,
    );
    await tester.pumpAndSettle();
    expect(find.text('New reminder'), findsOneWidget);

    post.complete(
      http.Response(jsonEncode({...upcoming, 'id': '9', 'title': 'Dentist'}), 201),
    );
    await tester.pumpAndSettle();

    // The save survived the dismissal attempts and reached the list.
    expect(find.text('New reminder'), findsNothing);
    expect(find.text('Dentist'), findsOneWidget);
  });

  testWidgets('delete asks for confirmation and Keep it backs out', (
    tester,
  ) async {
    final requests = await pumpScreen(tester, items: [upcoming]);
    await openEditSheet(tester, '3');

    await tester.tap(find.byKey(const ValueKey('sheet-delete')));
    await tester.pumpAndSettle();

    expect(find.text('Delete this reminder?'), findsOneWidget);
    expect(
      find.text('“Book flights” will be removed permanently.'),
      findsOneWidget,
    );

    await tester.tap(find.byKey(const ValueKey('delete-keep')));
    await tester.pumpAndSettle();

    expect(find.text('Delete this reminder?'), findsNothing);
    expect(find.text('Edit reminder'), findsOneWidget);
    expect(requests.every((r) => r.method == 'GET'), isTrue);
  });

  testWidgets('confirming delete removes the reminder from the list', (
    tester,
  ) async {
    final requests = await pumpScreen(
      tester,
      items: [upcoming],
      onWrite: (_) => http.Response('', 204),
    );
    await openEditSheet(tester, '3');

    await tester.tap(find.byKey(const ValueKey('sheet-delete')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('delete-confirm')));
    await tester.pumpAndSettle();

    expect(requests.last.method, 'DELETE');
    expect(find.text('Edit reminder'), findsNothing);
    expect(find.text('Book flights'), findsNothing);
    expect(find.text('Nothing on the list'), findsOneWidget);
  });
}
