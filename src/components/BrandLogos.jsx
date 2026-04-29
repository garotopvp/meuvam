import React from 'react';

export const StravaLogo = ({ size = 24 }) => (
  <img 
    src="/assets/logos/strava_logo.png" 
    alt="Strava" 
    style={{ width: size, height: size, objectFit: 'cover' }} 
  />
);

export const GarminLogo = ({ size = 24 }) => (
  <img 
    src="/assets/logos/garmin_logo.png" 
    alt="Garmin" 
    style={{ width: size, height: size, objectFit: 'cover' }} 
  />
);

export const PolarLogo = ({ size = 24, color = '#fff' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M4 12 L8 6 L12 12 L16 6 L20 12" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <path d="M4 16 L8 10 L12 16 L16 10 L20 16" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.5" />
  </svg>
);

export const CorosLogo = ({ size = 24, color = '#fff' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2" fill="none" />
    <circle cx="12" cy="12" r="4" fill={color} />
  </svg>
);
