export namespace LatLngLike {
  export type LatLng = {
    Lat: number;
    Lng: number;
  };
  export type latlng = {
    lat: number;
    lng: number;
  };
}
export type LatLngLike = LatLngLike.LatLng | LatLngLike.latlng;

export function lat(ll: LatLngLike) {
  return "Lat" in ll ? ll["Lat"] : ll["lat"];
}

export function lng(ll: LatLngLike) {
  return "Lng" in ll ? ll["Lng"] : ll["lng"];
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
