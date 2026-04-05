/** Reverse geocode no browser (Nominatim). Evita depender do servidor para GPS. */
export async function fetchReverseGeocode(
  lat: number,
  lng: number
): Promise<{ address: string; lat: number; lon: number }> {
  const url =
    'https://nominatim.openstreetmap.org/reverse?lat=' +
    encodeURIComponent(String(lat)) +
    '&lon=' +
    encodeURIComponent(String(lng)) +
    '&format=json';
  const r = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'Accept-Language': 'pt-BR,pt;q=0.9',
    },
  });
  const data = (await r.json()) as { display_name?: string; error?: string };
  if (!r.ok) {
    throw new Error(data.error ?? 'Não foi possível obter o endereço.');
  }
  if (!data.display_name) {
    throw new Error('Endereço não encontrado.');
  }
  return { address: data.display_name, lat, lon: lng };
}

export function getBrowserPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Seu navegador não suporta geolocalização.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      resolve,
      (err) => {
        const msg =
          err.code === 1
            ? 'Permissão de localização negada. Ative nas configurações do navegador ou do sistema.'
            : err.code === 2
              ? 'Localização indisponível no momento.'
              : 'Tempo esgotado ao obter a localização. Tente de novo.';
        reject(new Error(msg));
      },
      { enableHighAccuracy: true, timeout: 22000, maximumAge: 45000 }
    );
  });
}

export async function getCurrentPlaceDescription(): Promise<{
  address: string;
  lat: number;
  lng: number;
}> {
  const pos = await getBrowserPosition();
  const lat = pos.coords.latitude;
  const lng = pos.coords.longitude;
  const { address, lat: la, lon } = await fetchReverseGeocode(lat, lng);
  return { address, lat: la, lng: lon };
}
