import os
import json
import re
import requests
from datetime import datetime, timezone

# Your 6 channel video IDs
VIDEO_IDS = ["s0LLVQeMmtU", "1wECsnGZcfc", "nObUcHKZEGY", "3miKzKlmA-4", "281kTVNp8Wc", "AT0fo8Ty4jo"]

def fetch_and_save():
    current_data = {"timestamp": datetime.now(timezone.utc).isoformat(), "viewers": {}}
    
    # We must force English language so the comma formatting is predictable
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9"
    }

    for vid in VIDEO_IDS:
        try:
            url = f"https://www.youtube.com/watch?v={vid}"
            response = requests.get(url, headers=headers)
            html = response.text
            
            # 1st Try: Look for the exact concurrentViewers JSON object
            match = re.search(r'"concurrentViewers"\s*:\s*\{\s*"simpleText"\s*:\s*"([\d,]+)"', html)
            
            # 2nd Try (Fallback): Look for the literal "watching" text on the page
            if not match:
                match = re.search(r'\{\s*"text"\s*:\s*"([\d,]+)"\s*\}\s*,\s*\{\s*"text"\s*:\s*"\s*watching', html)
                
            if match:
                # Remove commas from the string (e.g., "12,345" -> "12345") before converting to integer
                viewers = int(match.group(1).replace(',', ''))
                print(f"Success: {vid} is LIVE with {viewers} viewers.")
            else:
                print(f"Offline: {vid} is not live right now (0 viewers).")
                viewers = 0
                
            current_data["viewers"][vid] = viewers
            
        except Exception as e:
            print(f"Error fetching {vid}: {e}")
            current_data["viewers"][vid] = 0

    # Load the existing database
    db = []
    if os.path.exists('data.json'):
        with open('data.json', 'r') as f:
            try:
                db = json.load(f)
            except json.JSONDecodeError:
                pass # Start fresh if file is empty/corrupted

    # Append new data
    db.append(current_data)
    
    # Keep only the last 30 days of data (approx 1440 entries at 30-min intervals)
    if len(db) > 1440:
        db = db[-1440:]

    # Save it back to data.json
    with open('data.json', 'w') as f:
        json.dump(db, f, indent=2)

if __name__ == "__main__":
    fetch_and_save()