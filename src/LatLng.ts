export namespace LatLngLike {
  export type LatLng = {
    Lat: number | (() => number);
    Lng: number | (() => number);
  };
  export type latlng = {
    lat: number | (() => number);
    lng: number | (() => number);
  };
}
export type LatLngLike = LatLngLike.LatLng | LatLngLike.latlng;

export function lat(ll: LatLngLike) {
  const x = "Lat" in ll ? ll["Lat"] : ll["lat"];
  return typeof x === "function" ? x() : x;
}

export function lng(ll: LatLngLike) {
  const x = "Lng" in ll ? ll["Lng"] : ll["lng"];
  return typeof x === "function" ? x() : x;
}

/**
 * 地球を半径6371kmとして算出
 * http://yamao.lolipop.jp/map/2017/g-m.htm
 * */
export function distance(loc1: LatLngLike, loc2: LatLngLike) {
  const rad_lat1 = (lat(loc1) * Math.PI) / 180;
  const rad_lng1 = (lng(loc1) * Math.PI) / 180;
  const rad_lat2 = (lat(loc2) * Math.PI) / 180;
  const rad_lng2 = (lng(loc2) * Math.PI) / 180;
  return (
    6371 *
    1000 *
    Math.acos(
      Math.cos(rad_lat1) * Math.cos(rad_lat2) * Math.cos(rad_lng2 - rad_lng1) +
        Math.sin(rad_lat1) * Math.sin(rad_lat2)
    )
  );
}

/**
 * ０～２π（東が０、反時計回り）
 */
export function direction(loc1: LatLngLike, loc2: LatLngLike) {
  const rad_lat1 = (lat(loc1) * Math.PI) / 180;
  const rad_lng1 = (lng(loc1) * Math.PI) / 180;
  const rad_lat2 = (lat(loc2) * Math.PI) / 180;
  const rad_lng2 = (lng(loc2) * Math.PI) / 180;
  const Y = Math.cos(rad_lng2) * Math.sin(rad_lat1 - rad_lat2);
  const X =
    Math.cos(rad_lng1) * Math.sin(rad_lng2) -
    Math.sin(rad_lng1) * Math.cos(rad_lng2) * Math.cos(rad_lat1 - rad_lat2);

  const rad = Math.atan2(Y, X);
  return rad > 0 ? rad : rad + 2 * Math.PI;
}

export function bounds(locations: LatLngLike[]) {
  if (locations.length == 0) return undefined;

  let lat_min = Number.MAX_SAFE_INTEGER;
  let lat_max = 0;
  let lng_min = Number.MAX_SAFE_INTEGER;
  let lng_max = 0;

  locations.forEach((x) => {
    const _lat = lat(x);
    const _lng = lng(x);
    lat_min = Math.min(_lat, lat_min);
    lat_max = Math.max(_lat, lat_max);
    lng_min = Math.min(_lng, lng_min);
    lng_max = Math.max(_lng, lng_max);
  });

  return {
    n: lat_max,
    s: lat_min,
    w: lng_min,
    e: lng_max,
    sw: { lat: lat_min, lng: lng_min },
    ne: { lat: lat_max, lng: lng_max }
  };
}
