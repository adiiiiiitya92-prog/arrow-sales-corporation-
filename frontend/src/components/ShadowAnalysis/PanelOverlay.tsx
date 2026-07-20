import React from 'react';
import { Polygon, Polyline } from '@react-google-maps/api';
import type { FittedPanel } from '../../services/panelLayoutService';

interface PanelOverlayProps {
  panels: FittedPanel[];
}

export const PanelOverlay: React.FC<PanelOverlayProps> = React.memo(({ panels }) => {
  const getPanelColors = (shadingLoss: number, isRecommended: boolean) => {
    if (!isRecommended) {
      return {
        fill: '#ef4444',
        stroke: '#b91c1c',
        opacity: 0.12
      };
    }
    if (shadingLoss < 10) {
      return {
        fill: '#1d4ed8', // Premium Cobalt Blue (Real solar module color)
        stroke: '#1e3a8a', // Darker navy frame
        opacity: 0.72
      };
    }
    if (shadingLoss <= 30) {
      return {
        fill: '#3b82f6', // Medium Royal Blue (moderate shading warning)
        stroke: '#1d4ed8',
        opacity: 0.72
      };
    }
    return {
      fill: '#f97316', // Orange warning color for high shading
      stroke: '#c2410c',
      opacity: 0.72
    };
  };

  // Helper to find the midpoint between two LatLng coords
  const getMidpoint = (a: google.maps.LatLngLiteral, b: google.maps.LatLngLiteral) => ({
    lat: (a.lat + b.lat) / 2,
    lng: (a.lng + b.lng) / 2
  });

  return (
    <>
      {panels.map((panel) => {
        const style = getPanelColors(panel.shadingLoss, panel.isRecommended);
        const bounds = panel.bounds;
        
        // Ensure we have a valid 4-coordinate bounding box to draw PV grid crosshairs
        let gridLines: React.ReactNode = null;
        if (bounds && bounds.length >= 4) {
          const midLeft = getMidpoint(bounds[0], bounds[1]);
          const midRight = getMidpoint(bounds[2], bounds[3]);
          const midBottom = getMidpoint(bounds[0], bounds[3]);
          const midTop = getMidpoint(bounds[1], bounds[2]);

          gridLines = (
            <>
              {/* Horizontal PV Cell Divider */}
              <Polyline
                path={[midLeft, midRight]}
                options={{
                  strokeColor: '#ffffff',
                  strokeWeight: panel.isRecommended ? 1.2 : 0.6,
                  strokeOpacity: panel.isRecommended ? 0.65 : 0.25,
                  clickable: false,
                  zIndex: panel.isRecommended ? 3 : 2
                }}
              />
              {/* Vertical PV Cell Divider */}
              <Polyline
                path={[midBottom, midTop]}
                options={{
                  strokeColor: '#ffffff',
                  strokeWeight: panel.isRecommended ? 1.2 : 0.6,
                  strokeOpacity: panel.isRecommended ? 0.65 : 0.25,
                  clickable: false,
                  zIndex: panel.isRecommended ? 3 : 2
                }}
              />
            </>
          );
        }

        return (
          <React.Fragment key={panel.id}>
            {/* Base Solar Panel Solid Body */}
            <Polygon
              path={bounds}
              options={{
                fillColor: style.fill,
                fillOpacity: style.opacity,
                strokeColor: style.stroke,
                strokeWeight: panel.isRecommended ? 1.8 : 0.8,
                strokeOpacity: panel.isRecommended ? 0.95 : 0.35,
                clickable: false,
                zIndex: panel.isRecommended ? 2 : 1
              }}
            />
            {/* Photovoltaic Cell Grid Details */}
            {gridLines}
          </React.Fragment>
        );
      })}
    </>
  );
});

PanelOverlay.displayName = 'PanelOverlay';
export default PanelOverlay;
