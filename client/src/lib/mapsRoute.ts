import type { Visita } from '../types';
import { mapsUrlForVisita } from '../utils';

/** Ordena por data e hora; só entradas com destino no Maps */
export function visitasComDestinoOrdenadas(visitas: Visita[]): Visita[] {
  const withDest = visitas.filter((v) => mapsUrlForVisita(v) != null);
  return [...withDest].sort((a, b) => {
    const ka = `${a.data ?? '1970-01-01'}T${a.hora}`;
    const kb = `${b.data ?? '1970-01-01'}T${b.hora}`;
    return ka.localeCompare(kb);
  });
}

/** URL Google Maps com várias paragens (direções). */
export function googleMapsDirectionsUrl(visitas: Visita[]): string | null {
  const ordered = visitasComDestinoOrdenadas(visitas);
  if (ordered.length === 0) return null;
  const coordsOrQueries = ordered.map((v) => {
    if (v.lat != null && v.lng != null && Number.isFinite(v.lat) && Number.isFinite(v.lng)) {
      return `${v.lat},${v.lng}`;
    }
    return v.endereco?.trim() || '';
  }).filter(Boolean);
  if (coordsOrQueries.length === 0) return null;
  const first = coordsOrQueries[0];
  if (coordsOrQueries.length === 1 && first != null) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(first)}`;
  }
  const origin = coordsOrQueries[0];
  const destination = coordsOrQueries[coordsOrQueries.length - 1];
  if (origin == null || destination == null) return null;
  const waypoints = coordsOrQueries.slice(1, -1).join('|');
  let url =
    `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`;
  if (waypoints) url += `&waypoints=${encodeURIComponent(waypoints)}`;
  return url;
}

export function wazeMultiUrl(visitas: Visita[]): string | null {
  const ordered = visitasComDestinoOrdenadas(visitas);
  const first = ordered[0];
  if (!first) return null;
  if (first.lat != null && first.lng != null) {
    return `https://waze.com/ul?ll=${first.lat},${first.lng}&navigate=yes`;
  }
  if (first.endereco?.trim()) {
    return `https://waze.com/ul?q=${encodeURIComponent(first.endereco.trim())}&navigate=yes`;
  }
  return null;
}
