import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Sun,
} from "lucide-react";
import { type DailyForecast, weatherLabel } from "@/lib/weather/open-meteo";

function WeatherIcon({ code, className }: { code: number; className?: string }) {
  const props = { className, "aria-hidden": true as const };
  if (code === 0) return <Sun {...props} />;
  if (code <= 2) return <CloudSun {...props} />;
  if (code === 3) return <Cloud {...props} />;
  if (code <= 48) return <CloudFog {...props} />;
  if (code <= 57) return <CloudDrizzle {...props} />;
  if (code <= 67) return <CloudRain {...props} />;
  if (code <= 77) return <CloudSnow {...props} />;
  if (code <= 82) return <CloudRain {...props} />;
  if (code <= 86) return <CloudSnow {...props} />;
  return <CloudLightning {...props} />;
}

/** Encart météo de la semaine à destination (PHIL-O02). */
export function WeatherStrip({
  days,
  destination,
}: {
  days: DailyForecast[];
  destination: string;
}) {
  if (days.length === 0) {
    return null;
  }
  return (
    <section
      aria-label={`Météo à ${destination}`}
      className="rounded-lg border border-laiton-clair bg-papier px-4 py-3"
    >
      <h2 className="mb-2 text-xs font-medium text-laiton uppercase tracking-wide">
        Météo à {destination}
      </h2>
      <ul className="scrollbar-none flex gap-1 overflow-x-auto">
        {days.map((d) => (
          <li
            key={d.date}
            className="flex min-w-16 flex-col items-center gap-0.5 rounded-md px-2 py-1.5 text-center"
            title={weatherLabel(d.code)}
          >
            <span className="text-xs text-encre-douce capitalize">
              {format(new Date(`${d.date}T12:00:00`), "EEE d", { locale: fr })}
            </span>
            <WeatherIcon code={d.code} className="size-5 text-encre" />
            <span className="text-xs text-encre tabular-nums">
              {d.tMax}° <span className="text-encre-douce">/ {d.tMin}°</span>
            </span>
            {d.precipProb !== null && d.precipProb >= 30 ? (
              <span className="text-[0.65rem] text-encre-douce">☂ {d.precipProb}%</span>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Ligne météo d'une journée (vue jour + hero Aujourd'hui). */
export function WeatherLine({ day }: { day: DailyForecast }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-encre-douce">
      <WeatherIcon code={day.code} className="size-4" />
      {weatherLabel(day.code)}, {day.tMax}° / {day.tMin}°
      {day.precipProb !== null && day.precipProb >= 30 ? ` · ☂ ${day.precipProb}%` : ""}
    </span>
  );
}
