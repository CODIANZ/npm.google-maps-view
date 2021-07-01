<template>
  <div id="app">
    <google-maps-view />
  </div>
</template>

<script lang="ts">
import { defineComponent } from "@vue/composition-api";
import { setGoogleMapsApiKey } from "@codianz/google-maps-view/dist/GMapApi";
import GoogleMapsView from "@codianz/google-maps-view/components/GoogleMapsView.vue";

export default defineComponent({
  setup() {
    setGoogleMapsApiKey(process.env["VUE_APP_GOOGLE_MAPS_API_KEY"]);
  },
  components: {
    GoogleMapsView
  }
});
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin: 0;
  padding: 0;
  width: 100vw;
  height: 100vh;
}
body {
  margin: 0;
}
</style>
