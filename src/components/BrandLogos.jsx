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

export const PolarLogo = ({ size = 24 }) => (
  <img 
    src="/assets/logos/polar_logo.png" 
    alt="Polar" 
    style={{ width: size, height: size, objectFit: 'cover' }} 
  />
);

export const CorosLogo = ({ size = 24 }) => (
  <img 
    src="/assets/logos/coros_logo.png" 
    alt="COROS" 
    style={{ width: size, height: size, objectFit: 'cover' }} 
  />
);

export const AmazfitLogo = ({ size = 24 }) => (
  <img 
    src="/assets/logos/amazfit_logo.png" 
    alt="Amazfit" 
    style={{ width: size, height: size, objectFit: 'cover' }} 
  />
);
