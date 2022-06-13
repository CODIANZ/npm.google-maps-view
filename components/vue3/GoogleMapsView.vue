<template>
  <div ref="mapRef" class="gmap" />
</template>
<script lang="ts">
import { defineComponent, onUnmounted, ref, watch } from "vue";
import { GMapApi, google_services_t } from "@codianz/google-maps-view/dist/GMapApi";
import { catchError, map, mergeMap, take } from "rxjs/operators";
import { BehaviorSubject, NEVER, Observable, of, throwError } from "rxjs";
import * as rx from "@codianz/rx";
import * as LOG from "@codianz/loglike";

const log = LOG.Console;

export default defineComponent({
  props: {
    options: {
      type: Object as () => google.maps.MapOptions,
      required: false
    }
  },
  setup(props) {
    const mapRef = ref<HTMLElement>();
    const gmapapi_subject = new BehaviorSubject<GMapApi | undefined>(undefined);
    const sg = new rx.SubscriptionGroup(log);

    onUnmounted(() => {
      // prettier-ignore
      rx.doSubscribe(
        log,
        "onUnmounted",
        gmapapi_subject.asObservable()
        .pipe(map((x) => {
          if (x) x.finalize();
          sg.unsubscribeAll();
          gmapapi_subject.complete();
        }))
      );
    });

    watch(
      () => mapRef.value,
      (elem) => {
        if (!elem) return;
        const options = props.options ?? {
          zoom: 16,
          center: { lat: 35.6979662, lng: 139.7743847 },
          clickableIcons: false
        };
        const api = new GMapApi();
        // prettier-ignore
        sg.append(
          "wait servie wake",
          api.rxInitialize(elem, options)
          .pipe(map(() => {
            gmapapi_subject.next(api);
          }))
        );
      }
    );

    const rxGmapApi = () => {
      // prettier-ignore
      return gmapapi_subject.asObservable()
      .pipe(mergeMap((x) => {
        if(!x) return NEVER;
        return of(x);
      }))
      .pipe(take(1));
    };

    return {
      mapRef,
      fcall(f: (api: GMapApi, raw: google_services_t) => void) {
        // prettier-ignore
        sg.append(
          "call",
          rxGmapApi()
          .pipe(mergeMap((api) => {
            return api.rxServices()
            .pipe(map((raw) => {
              f(api, raw);
            }))
          }))
        );
      },
      rxFcall<T>(f: (api: GMapApi, raw: google_services_t) => Observable<T>) {
        return new Observable<T>((subs) => {
          sg.append(
            "rxFcall",
            // prettier-ignore
            rxGmapApi()
            .pipe(mergeMap((api) => {
              return api.rxServices()
              .pipe(mergeMap((raw) => {
                return f(api, raw);
              }))
              .pipe(map((x: T) => {
                subs.next(x);
                subs.complete();
              }))
            }))
            .pipe(catchError((err) => {
              subs.error(err);
              return throwError(err);
            }))
          );
        });
      }
    };
  }
});
</script>
<style scoped>
.gmap {
  width: 100%;
  height: 100%;
}
</style>
