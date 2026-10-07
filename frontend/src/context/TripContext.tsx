import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import type { Trip } from "../lib/types";

const STORAGE_KEY = "routelog.trip";

interface Ctx {
  trip: Trip | null;
  setTrip: (t: Trip | null) => void;
}

const TripContext = createContext<Ctx | undefined>(undefined);

export function TripProvider({ children }: { children: ReactNode }) {
  const [trip, setTripState] = useState<Trip | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Trip) : null;
    } catch {
      return null;
    }
  });

  const setTrip = (t: Trip | null) => {
    setTripState(t);
    try {
      if (t) localStorage.setItem(STORAGE_KEY, JSON.stringify(t));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* quota errors, ignore */
    }
  };

  return (
    <TripContext.Provider value={{ trip, setTrip }}>
      {children}
    </TripContext.Provider>
  );
}

export function useTrip() {
  const ctx = useContext(TripContext);
  if (!ctx) throw new Error("useTrip must be used within TripProvider");
  return ctx;
}