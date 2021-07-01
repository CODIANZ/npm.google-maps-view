import { Subject } from "rxjs";

export type event_t = {
  element: Element;
  eventType: string;
  eventId: string;
};

export class GMapInfoWindow {
  private m_listeners: google.maps.MapsEventListener[] = [];
  private m_event = new Subject<string>();
  private m_window?: google.maps.InfoWindow;

  public finalize() {
    this.destructWindowIfExists();
    this.removeAllListeners();
    this.m_event.complete();
  }

  public rxEvent() {
    return this.m_event.asObservable();
  }

  private addListener(instance: object, eventName: string, eventId: string) {
    this.m_listeners.push(
      google.maps.event.addDomListener(instance, eventName, () => {
        this.m_event.next(eventId);
      })
    );
  }

  private removeAllListeners() {
    this.m_listeners.map((x) => google.maps.event.removeListener(x));
    this.m_listeners = [];
  }

  private destructWindowIfExists() {
    if (this.m_window) {
      this.m_window.close();
      this.m_window.unbindAll();
      this.m_window = undefined;
    }
  }

  public open(
    map: google.maps.Map,
    obj: google.maps.MVCObject,
    opt: google.maps.InfoWindowOptions,
    events?: event_t[]
  ) {
    this.destructWindowIfExists();
    this.removeAllListeners();

    if (events) {
      events.forEach((x) => {
        this.addListener(x.element, x.eventType, x.eventId);
      });
    }
    this.m_window = new google.maps.InfoWindow(opt);
    this.m_window.open(map, obj);
  }
}
