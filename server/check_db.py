import sqlite3
conn = sqlite3.connect('agriculture.db')
cur = conn.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [r[0] for r in cur.fetchall()]
print('Tables found:', tables)
conn.close()
