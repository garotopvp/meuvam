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

const ActivityMap = ({ routeData, isHeatmap = false, style }) => {
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

      if (typeof routeData === 'string' && routeData.length > 0) {
        coords = decodePolyline(routeData);
      }

      if (!coords || coords.length === 0) return;

      const center = coords[0];
      
      mapInstance.current = L.map(mapRef.current, {
        zoomControl: false,
        attributionControl: false,
        dragging: !style?.pointerEvents, // Se tiver pointerEvents none, desativa drag
        touchZoom: !style?.pointerEvents,
        scrollWheelZoom: false,
        doubleClickZoom: false,
      }).setView(center, 14);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19
      }).addTo(mapInstance.current);

      const polyline = L.polyline(coords, {
        color: '#fc4c02', // Strava Orange
        weight: 4,
        opacity: 0.9,
        lineJoin: 'round',
        lineCap: 'round'
      }).addTo(mapInstance.current);

      mapInstance.current.fitBounds(polyline.getBounds(), { padding: [30, 30] });

      if (isHeatmap) {
        coords.forEach((point, i) => {
          if (i % 8 === 0) {
            const intensity = Math.random();
            L.circle(point, {
              radius: 25,
              fillColor: intensity > 0.7 ? '#ef4444' : intensity > 0.4 ? '#f59e0b' : '#22c55e',
              fillOpacity: 0.3,
              stroke: false
            }).addTo(mapInstance.current);
          }
        });
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
        border: '1px solid #e2e8f0',
        zIndex: 1,
        ...style
      }} 
    />
  );
};

export default ActivityMap;
