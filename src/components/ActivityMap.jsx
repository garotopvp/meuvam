import React, { useEffect, useRef } from 'react';

// Helper: Decodificador de Polyline do Google (usado pelo Strava)
const decodePolyline = (encoded) => {
  if (!encoded) return [];
  let poly = [];
  let index = 0, len = encoded.length;
  let lat = 0, lng = 0;
  while (index < len) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    let dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;
    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    let dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;
    poly.push([lat * 1e-5, lng * 1e-5]);
  }
  return poly;
};

const ActivityMap = ({ routeData, isHeatmap = false }) => {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);

  useEffect(() => {
    // Carrega Leaflet via CDN se não estiver carregado
    if (!window.L) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);

      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = initMap;
      document.head.appendChild(script);
    } else {
      initMap();
    }

    function initMap() {
      if (!mapRef.current || mapInstance.current) return;

      const L = window.L;
      let coords = routeData;

      // Se for uma string (Encoded Polyline do Strava), decodificar
      if (typeof routeData === 'string' && routeData.length > 0) {
        coords = decodePolyline(routeData);
      }

      const center = coords?.[0] || [-23.5505, -46.6333];
      
      mapInstance.current = L.map(mapRef.current, {
        zoomControl: false,
        attributionControl: false
      }).setView(center, 14);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19
      }).addTo(mapInstance.current);

      if (coords && coords.length > 0) {
        const polyline = L.polyline(coords, {
          color: 'var(--primary-color)',
          weight: 4,
          opacity: 0.8,
          lineJoin: 'round'
        }).addTo(mapInstance.current);

        mapInstance.current.fitBounds(polyline.getBounds(), { padding: [20, 20] });

        if (isHeatmap) {
          // Mock de heatmap usando círculos coloridos ao longo da rota
          coords.forEach((point, i) => {
            if (i % 5 === 0) {
              const intensity = Math.random(); // Mock de intensidade
              L.circle(point, {
                radius: 30,
                fillColor: intensity > 0.7 ? '#ff3b30' : intensity > 0.4 ? '#ff9500' : '#34c759',
                fillOpacity: 0.4,
                stroke: false
              }).addTo(mapInstance.current);
            }
          });
        }
      }
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [routeData, isHeatmap]);

  return (
    <div 
      ref={mapRef} 
      style={{ 
        width: '100%', 
        height: '200px', 
        borderRadius: '20px', 
        overflow: 'hidden',
        border: '1px solid var(--border-color)',
        zIndex: 1
      }} 
    />
  );
};

export default ActivityMap;
