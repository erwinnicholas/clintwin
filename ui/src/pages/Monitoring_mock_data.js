export const mapCoordinatesMock = {
  title: 'Global Trial Sites',
  data: [
    { top: '35%', left: '25%', intensity: 0.8 }, // North America (high density)
    { top: '50%', left: '55%', intensity: 0.5 }, // Europe (medium)
    { top: '60%', left: '75%', intensity: 0.3 }, // Asia (low)
    { top: '40%', left: '20%', intensity: 0.9 }, // US West
    { top: '45%', left: '28%', intensity: 0.7 }, // US East
    { top: '52%', left: '50%', intensity: 0.6 }, // UK/France
    { top: '30%', left: '70%', intensity: 0.2 }, // Russia/China border
  ]
};

export const heatMapConfigMock = {
  title: 'Heat Mapping Tool',
  styles: ['Represents Marker Density', 'Represents Incident Severity', 'Represents Patient Volume'],
  samples: ['All Markers In Data', 'Critical Alerts Only', 'High Priority Only'],
  colors: {
    dense: '#ff0000', // Red
    medium: '#ffff00', // Yellow
    light: '#00ff00' // Green
  },
  initialSliders: {
    radius: 75,
    opacity: 73,
    threshold: 49
  }
};
