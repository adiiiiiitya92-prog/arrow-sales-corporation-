import React from 'react';
import { Polygon } from '@react-google-maps/api';
import type { FittedPanel } from '../../services/panelLayoutService';

interface PanelOverlayProps {
  panels: FittedPanel[];
}

export const PanelOverlay: React.FC<PanelOverlayProps> = React.memo(({ panels }) => {
  return (
    <>
      {panels.map((panel) => {
        if (!panel.bounds || panel.bounds.length < 4) return null;

        // Simple, clean panel styling
        const isRec = panel.isRecommended;
        const fillColor = isRec ? '#2563eb' : '#ef4444'; // Solid Blue for active, Red for shaded/excluded
        const strokeColor = isRec ? '#ffffff' : '#b91c1c'; // Clean White border
        const fillOpacity = isRec ? 0.85 : 0.35;

        return (
          <Polygon
            key={panel.id}
            path={panel.bounds}
            options={{
              fillColor,
              fillOpacity,
              strokeColor,
              strokeWeight: 1.2,
              strokeOpacity: 0.95,
              clickable: false,
              zIndex: isRec ? 2 : 1
            }}
          />
        );
      })}
    </>
  );
});

export default PanelOverlay;
