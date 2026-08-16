from collections import defaultdict

from fastapi import WebSocket


class ConnectionManager:
    """In-memory per-venue WebSocket broadcaster.

    Fine for a single backend process (our Render free-tier deploy target).
    If this ever runs as multiple instances, broadcasts would need to move
    to a shared pub/sub (e.g. Postgres LISTEN/NOTIFY) instead.
    """

    def __init__(self) -> None:
        self._connections: dict[str, set[WebSocket]] = defaultdict(set)

    async def connect(self, venue_id: str, ws: WebSocket) -> None:
        await ws.accept()
        self._connections[venue_id].add(ws)

    def disconnect(self, venue_id: str, ws: WebSocket) -> None:
        self._connections[venue_id].discard(ws)

    async def broadcast(self, venue_id: str, message: dict) -> None:
        dead: list[WebSocket] = []
        for ws in self._connections.get(venue_id, set()):
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(venue_id, ws)


manager = ConnectionManager()
