import { createContext, useContext, useState, type ReactNode } from "react";
import { useAuth } from "./auth";

interface ActiveVenueContextValue {
  venueId: string | null;
  venueSlug: string | null;
  setSelectedVenue: (id: string, slug: string) => void;
}

const ActiveVenueContext = createContext<ActiveVenueContextValue | null>(null);

/**
 * venue_owner is always scoped to their own venue (from the JWT). super_admin
 * has no venue of their own, so they explicitly pick one from the "전체 업장"
 * page before any venue-scoped admin API call can succeed (the backend
 * requires a venue_id query param for super_admin — see deps.resolve_venue_id).
 */
export function ActiveVenueProvider({ children }: { children: ReactNode }) {
  const { role, venueId, venueSlug } = useAuth();
  const [selected, setSelected] = useState<{ id: string; slug: string } | null>(() => {
    const id = localStorage.getItem("selected_venue_id");
    const slug = localStorage.getItem("selected_venue_slug");
    return id && slug ? { id, slug } : null;
  });

  function setSelectedVenue(id: string, slug: string) {
    localStorage.setItem("selected_venue_id", id);
    localStorage.setItem("selected_venue_slug", slug);
    setSelected({ id, slug });
  }

  const value: ActiveVenueContextValue =
    role === "super_admin"
      ? { venueId: selected?.id ?? null, venueSlug: selected?.slug ?? null, setSelectedVenue }
      : { venueId, venueSlug, setSelectedVenue };

  return <ActiveVenueContext.Provider value={value}>{children}</ActiveVenueContext.Provider>;
}

export function useActiveVenue() {
  const ctx = useContext(ActiveVenueContext);
  if (!ctx) throw new Error("useActiveVenue must be used within ActiveVenueProvider");
  return ctx;
}

export function venueQuery(venueId: string | null): string {
  return venueId ? `?venue_id=${venueId}` : "";
}
