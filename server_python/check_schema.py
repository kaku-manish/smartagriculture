import sqlite3
import os

path = os.path.join("..", "server", "agriculture.db")
conn = sqlite3.connect(path)
cur = conn.cursor()
cur.execute("SELECT sql FROM sqlite_master WHERE name='drone_analysis'")
row = cur.fetchone()
if row: print(row[0])
else: print("Table not found")
