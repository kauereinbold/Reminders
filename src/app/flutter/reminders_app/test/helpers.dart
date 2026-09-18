/// Dates are relative to the real today: the screens group against it.
DateTime dayFromToday(int offset) {
  final now = DateTime.now();
  return DateTime.utc(now.year, now.month, now.day).add(Duration(days: offset));
}
