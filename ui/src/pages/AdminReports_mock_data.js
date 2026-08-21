export const loadVsQueriesMock = {
  title: 'Server Load vs Queries',
  data: [
    { time: '00:00', load: 32, queries: 1200 },
    { time: '04:00', load: 28, queries: 800 },
    { time: '08:00', load: 65, queries: 4500 },
    { time: '12:00', load: 85, queries: 8200 },
    { time: '16:00', load: 78, queries: 7100 },
    { time: '20:00', load: 55, queries: 3200 },
  ]
};

export const nodeLatencyMock = {
  title: 'Global Node Latency Distribution',
  data: [
    { x: 10, y: 15, z: 200, region: 'US-East (Virginia)', latency: 15, time: '10m', load: 45 },
    { x: 20, y: 35, z: 250, region: 'EU-West (Frankfurt)', latency: 35, time: '20m', load: 55 },
    { x: 45, y: 20, z: 150, region: 'AP-South (Tokyo)', latency: 20, time: '45m', load: 30 },
    { x: 60, y: 85, z: 800, region: 'US-West (Oregon)', latency: 85, time: '60m', load: 88 },
    { x: 80, y: 40, z: 300, region: 'EU-Central (London)', latency: 40, time: '80m', load: 60 },
    { x: 100, y: 25, z: 180, region: 'US-East (N. Virginia)', latency: 25, time: '100m', load: 38 },
    { x: 120, y: 110, z: 1200, region: 'AP-Southeast (Singapore)', latency: 110, time: '120m', load: 95 }
  ]
};

export const resourceQuotasMock = {
  title: 'System Resource Utilization',
  data: [
    { name: 'Storage', value: 82, fill: 'rgb(255, 145, 0)' },
    { name: 'Compute', value: 65, fill: 'rgb(0, 240, 255)' },
    { name: 'Network', value: 45, fill: 'rgb(0, 230, 118)' },
  ]
};
