import sqlite3
from pathlib import Path
connection = sqlite3.connect(':memory:')
for file in sorted(Path('drizzle').glob('*.sql')):
    connection.executescript(file.read_text())
connection.execute("INSERT INTO booking_slots VALUES ('slot','2027-01-01T10:00:00Z','2027-01-01T10:55:00Z','Online','available',NULL)")
first = connection.execute("UPDATE booking_slots SET status='held',booking_id=? WHERE id='slot' AND status='available'", ('first',)).rowcount
second = connection.execute("UPDATE booking_slots SET status='held',booking_id=? WHERE id='slot' AND status='available'", ('second',)).rowcount
assert (first, second) == (1, 0), 'Two bookings acquired the same slot'
print('Database check passed: a held slot cannot be claimed twice.')
