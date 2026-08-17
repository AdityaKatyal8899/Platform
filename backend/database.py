import sqlite3
import json
import os
from datetime import datetime

def get_db_connection(db_path: str):
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn

def init_db(db_path: str):
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS videos (
            video_id TEXT PRIMARY KEY,
            status TEXT NOT NULL,
            duration REAL,
            thumbnail_url TEXT,
            delivery_url TEXT,
            renditions TEXT,
            error TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)
    conn.commit()
    conn.close()

def create_video(db_path: str, video_id: str, status: str = "queued"):
    now = datetime.utcnow().isoformat()
    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO videos (video_id, status, created_at, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(video_id) DO UPDATE SET
            status = excluded.status,
            updated_at = excluded.updated_at
        """,
        (video_id, status, now, now)
    )
    conn.commit()
    conn.close()

def update_video_status(db_path: str, video_id: str, status: str, error: str = None):
    now = datetime.utcnow().isoformat()
    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    if error:
        cursor.execute(
            """
            UPDATE videos
            SET status = ?, error = ?, updated_at = ?
            WHERE video_id = ?
            """,
            (status, error, now, video_id)
        )
    else:
        cursor.execute(
            """
            UPDATE videos
            SET status = ?, updated_at = ?
            WHERE video_id = ?
            """,
            (status, now, video_id)
        )
    conn.commit()
    conn.close()

def update_video_metadata(db_path: str, video_id: str, duration: float, thumbnail_url: str):
    now = datetime.utcnow().isoformat()
    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    cursor.execute(
        """
        UPDATE videos
        SET duration = ?, thumbnail_url = ?, updated_at = ?
        WHERE video_id = ?
        """,
        (duration, thumbnail_url, now, video_id)
    )
    conn.commit()
    conn.close()

def update_video_delivery(db_path: str, video_id: str, delivery_url: str):
    now = datetime.utcnow().isoformat()
    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    cursor.execute(
        """
        UPDATE videos
        SET delivery_url = ?, updated_at = ?
        WHERE video_id = ?
        """,
        (delivery_url, now, video_id)
    )
    conn.commit()
    conn.close()

def update_video_renditions(db_path: str, video_id: str, renditions: list):
    now = datetime.utcnow().isoformat()
    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    renditions_json = json.dumps(renditions)
    cursor.execute(
        """
        UPDATE videos
        SET renditions = ?, updated_at = ?
        WHERE video_id = ?
        """,
        (renditions_json, now, video_id)
    )
    conn.commit()
    conn.close()

def get_video(db_path: str, video_id: str) -> dict:
    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM videos WHERE video_id = ?", (video_id,))
    row = cursor.fetchone()
    conn.close()
    if row:
        video = dict(row)
        if video.get("renditions"):
            video["renditions"] = json.loads(video["renditions"])
        return video
    return None

def list_videos(db_path: str) -> list[dict]:
    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM videos ORDER BY created_at DESC")
    rows = cursor.fetchall()
    conn.close()
    videos = []
    for row in rows:
        video = dict(row)
        if video.get("renditions"):
            video["renditions"] = json.loads(video["renditions"])
        videos.append(video)
    return videos
