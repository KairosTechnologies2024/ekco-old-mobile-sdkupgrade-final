import React, { useRef } from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';

interface Marker {
  lat: number;
  lng: number;
  title: string;
  description: string;
  color: string;
}

interface Polyline {
  coordinates: { lat: number; lng: number }[];
  color: string;
  weight: number;
}

interface LeafletMapProps {
  center: { lat: number; lng: number };
  markers: Marker[];
  polylines?: Polyline[];
  zoom?: number;
  style?: any;
  onMapReady?: () => void;
}

const LeafletMap: React.FC<LeafletMapProps> = ({
  center,
  markers,
  polylines = [],
  zoom = 15,
  style = { height: 300, width: "100%" },
  onMapReady
}) => {
  const webViewRef = useRef<WebView>(null);

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="initial-scale=1, maximum-scale=1" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

      <style>
        html, body {
          height: 100%;
          width: 100%;
          padding: 0;
          margin: 0;
        }
        #map {
          height: 100%;
          width: 100%;
        }
      </style>
    </head>

    <body>
      <div id="map"></div>

      <script>
        var map = L.map('map').setView([${center.lat}, ${center.lng}], ${zoom});

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
        }).addTo(map);

        ${markers
          .map(
            (m, i) => `
          var icon${i} = L.divIcon({
            html: '<div style="background-color: ${m.color}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>',
            className: 'custom-marker',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          });
          var marker${i} = L.marker([${m.lat}, ${m.lng}], {icon: icon${i}}).addTo(map);
          marker${i}.bindPopup("<b>${m.title}</b><br>${m.description}");
        `
          )
          .join("")}

        ${polylines
          .map(
            (pl, i) => `
          L.polyline(${JSON.stringify(
            pl.coordinates.map((c) => [c.lat, c.lng])
          )}, {
            color: "${pl.color}",
            weight: ${pl.weight}
          }).addTo(map);
        `
          )
          .join("")}
      </script>
    </body>
    </html>
  `;

  return (
    <View style={[{ overflow: "hidden" }, style]}>
      <WebView
        ref={webViewRef}
        originWhitelist={["*"]}
        allowFileAccess
        allowUniversalAccessFromFileURLs
        source={{ html: htmlContent }}
        javaScriptEnabled
        domStorageEnabled
        style={{ flex: 1 }}
        onLoadEnd={() => onMapReady && onMapReady()}
      />
    </View>
  );
};

export default LeafletMap;
