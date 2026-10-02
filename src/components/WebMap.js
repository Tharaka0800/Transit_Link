import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';

// Only import WebView on native platforms
let WebView;
if (Platform.OS !== 'web') {
  WebView = require('react-native-webview').WebView;
}

export default function WebMap({ buses }) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        body { margin: 0; padding: 0; }
        #map { height: 100vh; width: 100vw; }
        .bus-icon {
          background-color: #2563EB;
          color: white;
          padding: 4px 8px;
          border-radius: 8px;
          font-size: 11px;
          font-weight: bold;
          white-space: nowrap;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var map = L.map('map').setView([6.9271, 79.8612], 11);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap',
          maxZoom: 19
        }).addTo(map);

        var buses = ${JSON.stringify(buses)};

        buses.forEach(function(bus) {
          var icon = L.divIcon({
            className: '',
            html: '<div class="bus-icon">🚌 ' + bus.routeNumber + ' • ' + bus.eta + ' min</div>',
            iconSize: [80, 24],
            iconAnchor: [40, 12]
          });

          L.marker([bus.lat, bus.lng], { icon: icon })
            .addTo(map)
            .bindPopup('<b>Bus ' + bus.routeNumber + '</b><br>' + bus.from + ' → ' + bus.to + '<br>ETA: ' + bus.eta + ' min');
        });
      </script>
    </body>
    </html>
  `;

  // WEB: Use iframe
  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <iframe
          srcDoc={html}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
          }}
          title="SmartBus Map"
        />
      </View>
    );
  }

  // MOBILE: Use WebView
  return (
    <View style={styles.container}>
      <WebView
        originWhitelist={['*']}
        source={{ html }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});