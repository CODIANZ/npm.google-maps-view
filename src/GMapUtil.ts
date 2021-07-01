import * as latlng from "./LatLng";

export function toLatLng(ll: latlng.LatLngLike) {
  return new google.maps.LatLng(latlng.lat(ll), latlng.lng(ll));
}

export function normalizeLatLngBounds(bounds: google.maps.LatLngBounds) {
  const raw = bounds as any;
  const south = raw["south"];
  const west = raw["west"];
  const north = raw["north"];
  const east = raw["east"];
  if (south && west && north && east) {
    return new google.maps.LatLngBounds(
      new google.maps.LatLng(south, west),
      new google.maps.LatLng(north, east)
    );
  } else {
    return bounds;
  }
}

export function treatDirectionsResult(directions_result: google.maps.DirectionsResult) {
  interface ext extends google.maps.DirectionsResult {
    status: string;
    request: {
      origin: {
        location: {
          lat: number;
          lng: number;
        };
      };
      destination: {
        location: {
          lat: number;
          lng: number;
        };
      };
      waypoints: {
        location: {
          location: {
            lat: number;
            lng: number;
          };
        };
        stopover?: boolean;
      }[];
      travelMode: string;
      avoidTolls: boolean;
      ae?: number;
      optimizeWaypoints?: boolean;
      Ih?: number;
      Qg?: number;
    };
  }

  const directions = directions_result as ext;
  const trimmed: ext = {
    geocoded_waypoints:
      directions.geocoded_waypoints,
    routes:
      directions.routes.map((directions_route) => {
        directions_route.legs = directions_route.legs.map(
          (directions_leg) => {
            /* これをやらないと、再度読み込んだ時に表示がされない */
            // directions_leg.via_waypoints = [];
            (directions_leg as any).via_waypoint = [];
            return directions_leg;
          }
        );
        // directions_route.waypoint_order = [0];
        return directions_route;
      }),
    status:
      directions.status,
    request:
      {
        origin: directions.request.origin,
        destination: directions.request.destination,
        waypoints: directions.request.waypoints.map((x) => {
          /* これをやらないと、再度読み込んだ時に編集ができない */
          if(x.stopover === undefined) return [x];
          if(x.stopover) return [];
          x.stopover = void 0;
          return [x];
        }).flat(),
        travelMode: directions.request.travelMode,
        avoidTolls: directions.request.avoidTolls
      }
  };

  return trimmed as google.maps.DirectionsResult;
}
