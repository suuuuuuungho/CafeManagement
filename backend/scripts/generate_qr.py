"""Bulk-generate table QR codes as PNGs.

Usage (from backend/):
    python -m scripts.generate_qr <venue_slug> <frontend_base_url> <table_count>

Example:
    python -m scripts.generate_qr hongdae-cafe https://myuser.github.io/cafe 6
Writes qr_out/table-1.png ... qr_out/table-6.png, each encoding
<frontend_base_url>/#/order?venue=<venue_slug>&table=<n>
"""

import sys
from pathlib import Path

import qrcode


def main(slug: str, base_url: str, table_count: int) -> None:
    out_dir = Path("qr_out")
    out_dir.mkdir(exist_ok=True)
    for n in range(1, table_count + 1):
        url = f"{base_url.rstrip('/')}/#/order?venue={slug}&table={n}"
        img = qrcode.make(url)
        path = out_dir / f"table-{n}.png"
        img.save(path)
        print(f"table {n}: {url} -> {path}")


if __name__ == "__main__":
    if len(sys.argv) != 4:
        print("Usage: python -m scripts.generate_qr <venue_slug> <frontend_base_url> <table_count>")
        raise SystemExit(1)
    main(sys.argv[1], sys.argv[2], int(sys.argv[3]))
