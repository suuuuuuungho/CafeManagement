"""Watches this phone's notifications (via Termux:API) for bank/Toss
deposit alerts, extracts the amount, and forwards it to the cafe
backend's deposit-matching webhook.

Uses only the Python standard library — no `pip install` needed beyond
Termux's own python package. See README.md in this folder for setup.
"""

import json
import re
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

# ---- Configuration — copy these two values from 관리자 > 설정 in the app ----
WEBHOOK_URL = "https://cafe-management-backend-kf1r.onrender.com/api/webhook/deposit/cafe-8e40a4"
WEBHOOK_SECRET = "PASTE_YOUR_WEBHOOK_SECRET_HERE"

POLL_INTERVAL_SECONDS = 5

# A notification is treated as a deposit if its text contains one of these...
INCLUDE_KEYWORDS = ["입금"]
# ...and none of these (withdrawals, card payments, etc).
EXCLUDE_KEYWORDS = ["출금", "이체출금", "카드승인", "결제"]

# Bank apps format amounts differently ("50,000원", "50000 원", ...) — this
# covers the common comma-grouped case. Adjust per your bank if it misses.
AMOUNT_PATTERN = re.compile(r"([\d][\d,]{2,})\s*원")

STATE_FILE = Path.home() / ".deposit_watcher_seen.json"
SEEN_TTL_SECONDS = 60 * 60 * 6  # forget old notification keys after 6h


def load_seen() -> dict:
    if STATE_FILE.exists():
        try:
            return json.loads(STATE_FILE.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            return {}
    return {}


def save_seen(seen: dict) -> None:
    try:
        STATE_FILE.write_text(json.dumps(seen), encoding="utf-8")
    except OSError as e:
        print(f"warning: could not write state file: {e}")


def prune_seen(seen: dict) -> dict:
    cutoff = time.time() - SEEN_TTL_SECONDS
    return {k: v for k, v in seen.items() if v > cutoff}


def get_notifications() -> list[dict]:
    try:
        result = subprocess.run(
            ["termux-notification-list"], capture_output=True, text=True, timeout=15
        )
    except FileNotFoundError:
        print("termux-notification-list not found - is Termux:API (pkg + app) installed?")
        return []
    except subprocess.TimeoutExpired:
        return []
    if result.returncode != 0:
        print(f"termux-notification-list failed: {result.stderr.strip()}")
        return []
    try:
        return json.loads(result.stdout)
    except json.JSONDecodeError:
        return []


def extract_amount(text: str) -> int | None:
    m = AMOUNT_PATTERN.search(text)
    if not m:
        return None
    return int(m.group(1).replace(",", ""))


def send_webhook(amount: int, raw_text: str, dry_run: bool) -> None:
    if dry_run:
        print(f"[dry-run] would send amount={amount} raw_text={raw_text!r}")
        return
    payload = json.dumps({"amount": amount, "raw_text": raw_text}).encode("utf-8")
    req = urllib.request.Request(
        WEBHOOK_URL,
        data=payload,
        headers={"Content-Type": "application/json", "X-Webhook-Secret": WEBHOOK_SECRET},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            body = resp.read().decode("utf-8")
            print(f"[{amount}원] webhook -> {resp.status} {body}")
    except urllib.error.HTTPError as e:
        print(f"[{amount}원] webhook failed -> {e.code} {e.read().decode('utf-8', 'ignore')}")
    except urllib.error.URLError as e:
        print(f"[{amount}원] webhook failed -> {e.reason}")


def main() -> None:
    dry_run = "--dry-run" in sys.argv
    mode = "DRY RUN (nothing will be sent)" if dry_run else "LIVE"
    print(f"deposit watcher started [{mode}], polling every {POLL_INTERVAL_SECONDS}s")
    if WEBHOOK_SECRET == "PASTE_YOUR_WEBHOOK_SECRET_HERE" and not dry_run:
        print("WEBHOOK_SECRET is still the placeholder - edit the top of this file first.")
        return

    seen = load_seen()
    while True:
        seen = prune_seen(seen)
        for note in get_notifications():
            key = str(note.get("key") or f"{note.get('id')}:{note.get('when')}")
            if key in seen:
                continue
            text = f"{note.get('title', '')} {note.get('content', '')}"

            if not any(k in text for k in INCLUDE_KEYWORDS) or any(k in text for k in EXCLUDE_KEYWORDS):
                seen[key] = time.time()
                continue

            amount = extract_amount(text)
            seen[key] = time.time()
            if amount is None:
                print(f"deposit-looking notification but couldn't parse amount: {text!r}")
                continue

            send_webhook(amount, text, dry_run)

        save_seen(seen)
        time.sleep(POLL_INTERVAL_SECONDS)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        pass
