import * as GoogleMapsApiLoader from "@googlemaps/js-api-loader";
import {
  BehaviorSubject,
  from,
  NEVER,
  of,
  Subject,
  Observable,
  throwError
} from "rxjs";
import { map, mergeMap, take } from "rxjs/operators";
import * as rx from "@codianz/rx";
import * as LOG from "@codianz/loglike";
import { event_t, GMapInfoWindow } from "./GMapInfoWindow";
const log = LOG.Console;

/**
 * ## 追加モジュール
 *  @googlemaps/google-maps-services-js
 *  @googlemaps/js-api-loader
 *  @types/google.maps
 *
 * ## tsconfig.json
 *  types に "google.maps" を追加
 *
 * ## eslint は文句が多いので全て uninstall
 */

/* https://developers.google.com/maps/documentation/javascript/examples/directions-draggable?hl=ja */

export type google_services_t = {
  map: google.maps.Map;
  directionsService: google.maps.DirectionsService;
};

class GMapApiLoader {
  private static sFuncInstance = () => {
    const instance = new GMapApiLoader();
    GMapApiLoader.sFuncInstance = () => instance;
    return instance;
  };
  public static get Instance() {
    return GMapApiLoader.sFuncInstance();
  }

  private m_apikey = new BehaviorSubject<string | undefined>(undefined);

  private constructor() {
    this.initalize();
  }

  public setApiKey(key: string) {
    this.m_apikey.next(key);
  }

  private initalize() {
    // prettier-ignore
    rx.doSubscribe(
      log,
      "GMapApiLoader.initialize",
      this.m_apikey
      .pipe(mergeMap((key) => {
        if(!key) return NEVER;
        return of(key);
      }))
      .pipe(map((key)=> {
        return new GoogleMapsApiLoader.Loader({
          apiKey: key,
          version: "weekly",
          libraries: []
        })
      }))
      .pipe((mergeMap((loader) => {
        return from(loader.load());
      })))
      .pipe(map(() => {
        this.m_loaded.next(true);
      }))
    );
  }

  private m_loaded = new BehaviorSubject(false);

  public rxWaitLoaded() {
    // prettier-ignore
    return this.m_loaded.asObservable()
    .pipe(mergeMap((bLoaded) => {
      if (!bLoaded) return NEVER;
      return of(void 0);
    }))
    .pipe(take(1));
  }
}

let bApiKeyConfigured = false;

export function setGoogleMapsApiKey(key: string) {
  if (!bApiKeyConfigured) {
    bApiKeyConfigured = true;
    GMapApiLoader.Instance.setApiKey(key);
  }
}

type mo_marker_t = {
  t: "marker";
  o: google.maps.Marker;
  _: string /* tag */;
};

type mo_circle_t = {
  t: "circle";
  o: google.maps.Circle;
  _: string /* tag */;
};

type mo_overlay_t = {
  t: "overlay";
  o: google.maps.OverlayView;
  _: string /* tag */;
};

type mo_polyline_t = {
  t: "polyline";
  o: google.maps.Polyline;
  _: string /* tag */;
};

type mo_trafficlayer_t = {
  t: "trafficlayer";
  o: google.maps.TrafficLayer;
  _: string /* tag */;
};

type mapObject_t =
  | mo_marker_t
  | mo_circle_t
  | mo_overlay_t
  | mo_polyline_t
  | mo_trafficlayer_t;

export class GMapApi {
  private m_services_subject = new BehaviorSubject<
    google_services_t | undefined
  >(undefined);
  private m_onClick = new Subject<google.maps.LatLng>();
  private m_onDrag = new Subject<void>();
  private m_onBoundsChanged = new Subject<google.maps.LatLngBounds>();
  private m_onZoomChanged = new Subject<number>();
  private m_onMapObjectDragged = new Subject<string>();
  private m_onMapObjectClicked = new Subject<string>();
  private m_onDirectionsChanged = new Subject<string>();
  private m_onMapObjectDoubleClicked = new Subject<string>();
  private m_mapObjects: { [_: string]: mapObject_t } = {};
  private m_directionsRenderers: {
    [_: string]: google.maps.DirectionsRenderer;
  } = {};
  private m_sg = new rx.SubscriptionGroup(log);
  private m_infoWindow = new GMapInfoWindow();

  public get DirectionsRenderers() {
    return this.m_directionsRenderers;
  }

  public rxInitialize(element: HTMLElement, opts?: google.maps.MapOptions) {
    // prettier-ignore
    return GMapApiLoader.Instance.rxWaitLoaded()
    .pipe(map(() => {
      const gmap = new google.maps.Map(element, opts);
      gmap.addListener("click", (ev: google.maps.MapMouseEvent) => {
        if (ev.latLng) {
          this.m_onClick.next(ev.latLng);
        }
      });
      gmap.addListener("drag", () => {
        this.m_onDrag.next(void 0);
      });
      gmap.addListener("bounds_changed", () => {
        const bounds = gmap.getBounds();
        if(bounds !== undefined){
          this.m_onBoundsChanged.next(bounds);
        }
      });
      gmap.addListener("zoom_changed", () => {
        const zoom = gmap.getZoom();
        if(zoom !== undefined){
          this.m_onZoomChanged.next(zoom);
        }
      });
      this.m_services_subject.next({
        map: gmap,
        directionsService: new google.maps.DirectionsService()
      });
    }));
  }

  public rxInitializeForStreetView(
    element: HTMLElement,
    opts?: google.maps.StreetViewPanoramaOptions
  ) {
    // prettier-ignore
    return GMapApiLoader.Instance.rxWaitLoaded()
    .pipe(map(() => {
      return new google.maps.StreetViewPanorama(element, opts);
    }));
  }

  public finalize() {
    log.debug("GMapApi.finalize() called");
    this.m_infoWindow.finalize();
    this.m_services_subject.complete();
    this.m_onClick.complete();
    this.m_onDrag.complete();
    this.m_onMapObjectDragged.complete();
    this.m_onMapObjectClicked.complete();
    this.m_onMapObjectDoubleClicked.complete();
    this.m_onDirectionsChanged.complete();
    this.m_sg.unsubscribeAll();
  }

  public rxServices() {
    // prettier-ignore
    return this.m_services_subject.asObservable()
    .pipe(mergeMap((x) => {
      if (!x) return NEVER;
      return of(x);
    }))
    .pipe(take(1));
  }

  public resetDirectionsRenderers() {
    Object.keys(this.m_directionsRenderers).map((x) =>
      this.deleteDirectionsRenderer(x)
    );
    this.m_directionsRenderers = {};
  }

  private detachMapObject(mo: mapObject_t) {
    switch (mo.t) {
      case "circle":
      case "marker":
      case "overlay": {
        mo.o.setMap(null);
        break;
      }
    }
  }

  public resetMapObjects() {
    Object.keys(this.m_mapObjects)
      .map((x) => this.m_mapObjects[x])
      .map((x) => this.detachMapObject(x));
    this.m_mapObjects = {};
  }

  public resetAll() {
    this.resetDirectionsRenderers();
    this.resetMapObjects();
  }

  public rxCreateDirectionsRenderer(
    id: string,
    opt?: google.maps.DirectionsRendererOptions
  ) {
    // prettier-ignore
    return this.rxServices()
    .pipe(map(({ map }) => {
        const _opt = opt ?? {
          draggable: true,
          suppressMarkers: true
        };
        const renderer = new google.maps.DirectionsRenderer({
          ... _opt,
          map: map
        });
        renderer.addListener("directions_changed", () => {
          this.m_onDirectionsChanged.next(id);
        });
        this.deleteDirectionsRenderer(id);
        this.m_directionsRenderers[id] = renderer;
        return renderer;
      })
    );
  }

  public rxCreateRoute(locations: google.maps.LatLng[]) {
    return new Observable<google.maps.DirectionsResult>((s) => {
      // prettier-ignore
      this.m_sg.append(
        "rxCreateRoute",
        this.rxServices()
        .pipe(map(({ directionsService }) => {
            if (locations.length < 2) {
              s.error("locations.length < 2");
              return;
            }
            const origin = locations[0];
            const destination = locations[locations.length - 1];
            const waypoints =
              locations.length >= 3
                ? locations.splice(1, locations.length - 2).map((x) => {
                    return { location: x } as google.maps.DirectionsWaypoint;
                  })
                : undefined;
            directionsService.route(
              {
                origin,
                destination,
                waypoints,
                travelMode: google.maps.TravelMode.DRIVING,
                avoidTolls: true
              },
              (result, status) => {
                if (status === "OK" && result) {
                  s.next(result);
                  s.complete();
                } else {
                  s.error(status);
                }
              }
            );
          })
        )
      );
    });
  }

  public craeteRouteAndDirectionsRenderer(
    id: string,
    latlngs: google.maps.LatLng[]
  ) {
    /* Markers は latlng指定を採用しているので、取得できないことを考慮する必要がない */
    // prettier-ignore
    this.m_sg.append(
      "craeteRoute",
      this.rxCreateRoute(latlngs)
      .pipe(mergeMap((result) => {
        return this.rxCreateDirectionsRenderer(id)
        .pipe(map((renderer) => {
          renderer.setDirections(result);
          /* 初回の通知は directions_changed ではなくココ */
          this.m_onDirectionsChanged.next(id);
        }));
      }))
    );
  }

  public fetchDirectionsRenderer(id: string) {
    if (id in this.m_directionsRenderers) {
      return this.m_directionsRenderers[id];
    }
  }

  public deleteDirectionsRenderer(id: string) {
    if (id in this.m_directionsRenderers) {
      this.m_directionsRenderers[id].setMap(null);
      delete this.m_directionsRenderers[id];
    }
  }

  public rxOnClick() {
    return this.m_onClick.asObservable();
  }

  public rxOnDrag() {
    return this.m_onDrag.asObservable();
  }

  public rxOnBoundsChanged() {
    return this.m_onBoundsChanged.asObservable();
  }

  public rxOnZoomChanged() {
    return this.m_onZoomChanged.asObservable();
  }

  public rxOnMapObjectDragged() {
    return this.m_onMapObjectDragged.asObservable();
  }

  public rxOnMapObjectClicked() {
    return this.m_onMapObjectClicked.asObservable();
  }

  public rxOnMapObjectDoubleClicked() {
    return this.m_onMapObjectDoubleClicked.asObservable();
  }

  public rxOnDirectionsChanged() {
    return this.m_onDirectionsChanged.asObservable();
  }

  public rxOnInfoWindowEvent() {
    return this.m_infoWindow.rxEvent();
  }

  public addMarker(id: string, tag: string, opt: google.maps.MarkerOptions) {
    // prettier-ignore
    this.m_sg.append(
      "GMapApi.addMarkerObject",
      this.rxAddMarker(id, tag, opt)
    );
  }

  public rxAddMarker(id: string, tag: string, opt: google.maps.MarkerOptions) {
    // prettier-ignore
    return this.rxServices()
    .pipe(map(({ map }) => {
      const marker = new google.maps.Marker(opt);
      marker.addListener("click", () => {
        this.m_onMapObjectClicked.next(id);
      });
      marker.addListener("dblclick", () => {
        this.m_onMapObjectDoubleClicked.next(id);
      });
      marker.addListener("dragend", () => {
        this.m_onMapObjectDragged.next(id);
      });
      marker.setMap(map);
      this.addMapObject(id, {
        t: "marker",
        o: marker,
        _: tag
      });
      return this.m_mapObjects[id];
    }));
  }

  public rxShowInfoWindowEx(
    targetObjectId: string,
    opt: google.maps.InfoWindowOptions,
    events?: event_t[]
  ) {
    // prettier-ignore
    return this.rxServices()
    .pipe(map(({ map }) => {
      if(targetObjectId in this.m_mapObjects){
        this.m_infoWindow.open(map,this.m_mapObjects[targetObjectId].o, opt, events);
      }
    }))
  }

  public addCircle(id: string, tag: string, opt: google.maps.CircleOptions) {
    // prettier-ignore
    this.m_sg.append(
      "GMapApi.addCircleObject",
      this.rxAddCircle(id, tag, opt)
    );
  }

  public rxAddCircle(id: string, tag: string, opt: google.maps.CircleOptions) {
    // prettier-ignore
    return this.rxServices()
    .pipe(map(({ map }) => {
      const circle = new google.maps.Circle(opt);
      circle.addListener("click", () => {
        this.m_onMapObjectClicked.next(id);
      });
      circle.addListener("dblclick", () => {
        this.m_onMapObjectDoubleClicked.next(id);
      });
      circle.addListener("dragend", () => {
        this.m_onMapObjectDragged.next(id);
      });
      circle.setMap(map);
      this.addMapObject(id, {
        t: "circle",
        o: circle,
        _: tag
      });
    }));
  }

  public addPolyline(
    id: string,
    tag: string,
    opt: google.maps.PolylineOptions
  ) {
    // prettier-ignore
    this.m_sg.append(
      "GMapApi.addPolyline",
      this.rxAddPolyline(id, tag, opt)
    );
  }

  public rxAddPolyline(
    id: string,
    tag: string,
    opt: google.maps.PolylineOptions
  ) {
    // prettier-ignore
    return this.rxServices()
    .pipe(map(({ map }) => {
      const polyline = new google.maps.Polyline(opt);
      polyline.setMap(map);
      this.addMapObject(id, {
        t: "polyline",
        o: polyline,
        _: tag
      });
    }));
  }

  public addTrafficLayer(
    id: string,
    tag: string,
    opt: google.maps.TrafficLayerOptions
  ) {
    // prettier-ignore
    this.m_sg.append(
      "GMapApi.addTrafficLayer",
      this.rxAddTrafficLayer(id, tag, opt)
    );
  }

  public rxAddTrafficLayer(
    id: string,
    tag: string,
    opt: google.maps.TrafficLayerOptions
  ) {
    // prettier-ignore
    return this.rxServices()
    .pipe(map(({ map }) => {
      const trafficlayer = new google.maps.TrafficLayer(opt);
      trafficlayer.setMap(map);
      this.addMapObject(id, {
        t: "trafficlayer",
        o: trafficlayer,
        _: tag
      });
    }));
  }

  public addOverlay<T extends google.maps.OverlayView>(
    id: string,
    tag: string,
    ctor: () => T
  ) {
    // prettier-ignore
    this.m_sg.append(
      "GMapApi.addOverlay",
      this.rxAddOverlay(id, tag, ctor)
    );
  }

  public rxAddOverlay<T extends google.maps.OverlayView>(
    id: string,
    tag: string,
    ctor: () => T
  ) {
    // prettier-ignore
    return this.rxServices()
    .pipe(map(({map}) => {
      const overlay = ctor();
      overlay.setMap(map);
      this.addMapObject(id, {
        t: "overlay",
        o: overlay,
        _: tag
      });
    }));
  }

  public addMapObject(id: string, obj: mapObject_t) {
    this.deleteMapObjectWithId(id);
    this.m_mapObjects[id] = obj;
  }

  public deleteMapObjectWithId(id: string) {
    if (id in this.m_mapObjects) {
      this.detachMapObject(this.m_mapObjects[id]);
      delete this.m_mapObjects[id];
    }
  }

  public deleteMapObjectWithTagRegex(tag: RegExp) {
    Object.keys(this.m_mapObjects)
      .map((id) => ({ id: id, o: this.m_mapObjects[id] }))
      .filter((x) => x.o._.match(tag))
      .forEach((x) => {
        this.deleteMapObjectWithId(x.id);
      });
  }

  public fetchMapObject(id: string) {
    if (id in this.m_mapObjects) {
      return this.m_mapObjects[id];
    }
  }

  public rxPresentLocation(): Observable<GeolocationPosition> {
    if (!navigator.geolocation)
      return throwError(new Error("navigator.geolocation is not supported."));
    return new Observable<GeolocationPosition>((s) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          s.next(pos);
          s.complete();
        },
        (err) => {
          s.error(err);
        }
      );
    });
  }

  public rxSetCenter(latlng: google.maps.LatLng) {
    // prettier-ignore
    return this.rxServices().pipe(map((x) => {
      x.map.panTo(latlng);
    }));
  }

  public rxGetCenter() {
    // prettier-ignore
    return this.rxServices().pipe(map((x) => {
      return x.map.getCenter();
    }));
  }

  public rxFitBounds(bounds: google.maps.LatLngBounds) {
    // prettier-ignore
    return this.rxServices()
    .pipe(map((x) => {
      x.map.fitBounds(bounds);
    }))
  }

  public rxGetBounds() {
    // prettier-ignore
    return this.rxServices()
    .pipe(map((x) => {
      return x.map.getBounds();
    }))
  }

  public rxSetZoom(n: number) {
    // prettier-ignore
    return this.rxServices()
    .pipe(map((x) => {
      x.map.setZoom(n);
    }));
  }

  public rxGetZoom() {
    // prettier-ignore
    return this.rxServices()
    .pipe(map((x) => {
      return x.map.getZoom();
    }));
  }

  public setLandmarkVisible(bVisible: boolean) {
    // prettier-ignore
    this.m_sg.append(
      "setLandmarkVisible",
      this.rxServices()
      .pipe(map((x) => {
        x.map.setOptions({
          styles: bVisible
            ? []
            : [
              /* https://developers.google.com/maps/documentation/android-sdk/style-reference?hl=ja */
              {
                featureType: "landscape.man_made",
                elementType: "labels.icon",
                stylers: [{ visibility: "off" }]
              },
              {
                featureType: "poi",
                elementType: "labels.icon",
                stylers: [{ visibility: "off" }]
              }
            ]
        });
      }))
    );
  }

  public createOverlay(
    latlng: google.maps.LatLng,
    content: HTMLElement
  ): google.maps.OverlayView {
    /**
     * google.maps.OverlayView は google maps services のロードが完了しないと
     * 関数の実体が存在していないのでクラス生成を行うことができない。
     * したがって、関数型を使用してクラス生成を遅延させる必要がある。
     *
     * 参考にした URL
     * https://developers.google.com/maps/documentation/javascript/examples/overlay-popup
     *
     * 要素の階層構造は下記のとおり
     *  +-- container ------+
     *  |  +-- inner ----+  |
     *  |  |   content   |  |
     *  |  +-------------+  |
     *  +-------------------+
     *
     * 表示座標は下記のとおり
     *
     *    +-- inner ----+
     *    |   content   |
     *    x-------------+
     *    ^
     *    |
     *    +-- conteiner (0 x 0 pixel)
     *
     * これは container の `height: 0` とすることで、指定座標の下から上へ配置されることを利用している。
     *
     * content のスタイルを下記のように組み合わせて設定した場合の表示座標
     *  `position: ablsolute`
     *  `transform: translate(-50%, -100%)`
     *
     *    +-- inner ----+
     *    |   content   |
     *    +------x------+
     *           ^
     *           |
     *           +-- conteiner (0 x 0 pixel)
     */
    class Overlay extends google.maps.OverlayView {
      private m_latlng: google.maps.LatLng;
      private m_containerDiv: HTMLDivElement;

      constructor(latlng: google.maps.LatLng, content: HTMLElement) {
        super();
        this.m_latlng = latlng;

        const inner = document.createElement("div");
        inner.style.position = "absolute";
        inner.style.width = "100%";
        inner.style.left = "0";
        inner.style.bottom = "0";
        inner.appendChild(content);

        const container = document.createElement("div");
        container.style.height = "0";
        container.style.position = "absolute";
        container.appendChild(inner);

        this.m_containerDiv = container;
        Overlay.preventMapHitsAndGesturesFrom(this.m_containerDiv);
      }

      onAdd() {
        this.getPanes()?.floatPane.appendChild(this.m_containerDiv);
      }

      onRemove() {
        this.m_containerDiv.parentElement?.removeChild(this.m_containerDiv);
      }

      draw() {
        const divPosition = this.getProjection().fromLatLngToDivPixel(
          this.m_latlng
        )!;

        const display =
          Math.abs(divPosition.x) < 4000 && Math.abs(divPosition.y) < 4000
            ? "block"
            : "none";

        if (display === "block") {
          this.m_containerDiv.style.left = divPosition.x + "px";
          this.m_containerDiv.style.top = divPosition.y + "px";
        }

        if (this.m_containerDiv.style.display !== display) {
          this.m_containerDiv.style.display = display;
        }
      }
    }
    return new Overlay(latlng, content);
  }
}
