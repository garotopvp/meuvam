import React, { useEffect, useRef } from 'react';

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
      // Coordenadas padrão (São Paulo) se não houver rota
      const center = routeData?.[0] || [-23.5505, -46.6333];
      
      mapInstance.current = L.map(mapRef.current, {
        zoomControl: false,
        attributionControl: false
      }).setView(center, 14);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19
      }).addTo(mapInstance.current);

      if (routeData && routeData.length > 0) {
        const polyline = L.polyline(routeData, {
          color: 'var(--primary-color)',
          weight: 4,
          opacity: 0.8,
          lineJoin: 'round'
        }).addTo(mapInstance.current);

        mapInstance.current.fitBounds(polyline.getBounds(), { padding: [20, 20] });

        if (isHeatmap) {
          // Mock de heatmap usando círculos coloridos ao longo da rota
          routeData.forEach((point, i) => {
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
