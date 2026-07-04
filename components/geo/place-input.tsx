"use client";

import { MapPin } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";

type PlaceResult = {
  name: string;
  detail: string;
  address: string;
  lat: number;
  lng: number;
};

/**
 * Champ lieu avec autocomplétion Photon (PHIL-P07). Sélectionner une
 * suggestion remplit des champs cachés lat/lng (coordonnées propres pour la
 * carte et les temps de trajet) ; la saisie libre reste possible — le
 * géocodage Nominatim best-effort prend alors le relais côté serveur.
 */
export function PlaceInput({
  name,
  id,
  defaultValue = "",
  placeholder,
  required,
  maxLength,
  latName = "locationLat",
  lngName = "locationLng",
  onSelectAddress,
}: {
  name: string;
  id?: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
  latName?: string;
  lngName?: string;
  /** Renseigne aussi un champ adresse (ex : hébergement). */
  onSelectAddress?: (address: string) => void;
}) {
  const [value, setValue] = useState(defaultValue);
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  function search(q: string) {
    setValue(q);
    setCoords(null); // saisie modifiée = coordonnées plus garanties
    if (debounce.current) {
      clearTimeout(debounce.current);
    }
    if (q.trim().length < 3) {
      setResults([]);
      setOpen(false);
      return;
    }
    debounce.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/geo/search?q=${encodeURIComponent(q)}`);
        const json = (await r.json()) as { results?: PlaceResult[] };
        setResults(json.results ?? []);
        setOpen((json.results ?? []).length > 0);
      } catch {
        setResults([]);
      }
    }, 350);
  }

  return (
    <div ref={containerRef} className="relative">
      <Input
        id={id}
        name={name}
        value={value}
        onChange={(e) => search(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder={placeholder}
        required={required}
        maxLength={maxLength}
        autoComplete="off"
      />
      <input type="hidden" name={latName} value={coords ? String(coords.lat) : ""} />
      <input type="hidden" name={lngName} value={coords ? String(coords.lng) : ""} />
      {open ? (
        <ul className="absolute top-full right-0 left-0 z-20 mt-1 overflow-hidden rounded-md border border-laiton-clair bg-papier shadow-[0_4px_16px_rgba(31,42,68,0.15)]">
          {results.map((r) => (
            <li key={`${r.lat}-${r.lng}`}>
              <button
                type="button"
                className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-laiton/10"
                onClick={() => {
                  setValue(r.name);
                  setCoords({ lat: r.lat, lng: r.lng });
                  if (r.address) {
                    onSelectAddress?.(r.address);
                  }
                  setOpen(false);
                }}
              >
                <MapPin className="mt-0.5 size-3.5 shrink-0 text-laiton" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block truncate text-encre">{r.name}</span>
                  {r.detail ? (
                    <span className="block truncate text-xs text-encre-douce">{r.detail}</span>
                  ) : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
