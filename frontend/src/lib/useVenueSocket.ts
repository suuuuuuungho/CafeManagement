import { useEffect, useRef } from "react";
import { wsUrl } from "./api";

/**
 * Opens a WebSocket to /ws/{slug} and calls onMessage for every event the
 * backend broadcasts (order_created/order_updated/deposit_matched/...).
 * Reconnects with exponential backoff — cafe wifi drops are common and both
 * the admin dashboard and the display board are meant to stay open unattended.
 */
export function useVenueSocket(slug: string | null, onMessage: () => void) {
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    if (!slug) return;
    let socket: WebSocket | null = null;
    let retryDelay = 1000;
    let closedByEffect = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    function connect() {
      socket = new WebSocket(wsUrl(slug!));
      socket.onmessage = () => onMessageRef.current();
      socket.onopen = () => {
        retryDelay = 1000;
      };
      socket.onclose = () => {
        if (closedByEffect) return;
        retryTimer = setTimeout(connect, retryDelay);
        retryDelay = Math.min(retryDelay * 2, 30000);
      };
    }
    connect();

    return () => {
      closedByEffect = true;
      clearTimeout(retryTimer);
      socket?.close();
    };
  }, [slug]);
}
