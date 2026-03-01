import React, { useEffect, useState } from 'react';
import API_URL from '@/api/config';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

/**
 * Disease Heatmap & Spread Visualization
 * Shows disease density grid and movement vectors
 */
const DiseaseHeatmap = ({ farmId }) => {
    const [heatmapData, setHeatmapData] = useState(null);
    const [progression, setProgression] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, [farmId]);

    const fetchData = async () => {
        try {
            setLoading(true);
            // Fetch Heatmap & Zones
            const hRes = await fetch(`${API_URL}/geo/field/${farmId}/heatmap`);
            const hData = await hRes.json();
            setHeatmapData(hData);

            // Fetch Progression & Spread
            const pRes = await fetch(`${API_URL}/geo/field/${farmId}/progression?days=7`);
            const pData = await pRes.json();
            setProgression(pData);

            setLoading(false);
        } catch (error) {
            console.error('Error fetching heatmap data:', error);
            setLoading(false);
        }
    };

    const getColor = (score) => {
        if (score >= 70) return '#d73027'; // Severe - Red
        if (score >= 40) return '#fc8d59'; // Moderate - Orange
        if (score >= 20) return '#fee08b'; // Mild - Yellow
        return '#d9ef8b'; // Low - Green
    };

    const tileStyle = (feature) => {
        const score = feature.properties.score || 0;
        return {
            fillColor: getColor(score),
            weight: 1,
            opacity: 0.7,
            color: '#666',
            fillOpacity: 0.6
        };
    };

    const onEachTile = (feature, layer) => {
        const props = feature.properties;
        layer.bindPopup(`
      <div style="font-family: Arial; padding: 8px;">
        <h4 style="margin: 0 0 8px 0;">Tile #${props.id || props.tile_id}</h4>
        <p style="margin: 4px 0;"><strong>Score:</strong> ${props.score}/100</p>
        <p style="margin: 4px 0;"><strong>Disease:</strong> ${props.disease || 'None'}</p>
        <p style="margin: 4px 0;"><strong>Severity:</strong> ${props.severity}</p>
      </div>
    `);
    };

    if (loading) {
        return <div style={styles.loading}>Loading spatial analytics...</div>;
    }

    // Calculate Map Center (use first feature or fallback)
    const features = heatmapData?.heatmap?.features || [];
    const coords = features.length > 0 ? features[0].geometry.coordinates[0][0] : [78.486, 17.385];
    const mapCenter = [coords[1], coords[0]]; // [Lat, Lng]

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <div style={styles.headerLeft}>
                    <h2 style={styles.title}>Disease Mapping & Spread Analysis</h2>
                    {progression && progression.status && progression.metrics && (
                        <div style={{ ...styles.badge, backgroundColor: progression.status === 'EXPANDING' ? '#ffebee' : '#e8f5e9' }}>
                            <span style={{ color: progression.status === 'EXPANDING' ? '#c62828' : '#2e7d32', fontWeight: 'bold' }}>
                                {progression.status}: {progression.metrics.growth_pct}%
                                {progression.status === 'EXPANDING' ? ' 📈' : ' 📉'}
                            </span>
                        </div>
                    )}
                </div>
                <div style={styles.legend}>
                    <div style={styles.legendItem}>
                        <div style={{ ...styles.legendColor, backgroundColor: '#d73027' }}></div>
                        <span>Severe</span>
                    </div>
                    <div style={styles.legendItem}>
                        <div style={{ ...styles.legendColor, backgroundColor: '#3498db', height: '4px', width: '30px', borderRadius: '2px' }}></div>
                        <span>Direction</span>
                    </div>
                </div>
            </div>

            <MapContainer center={mapCenter} zoom={18} style={styles.map}>
                <TileLayer
                    attribution='&copy; OpenStreetMap'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {heatmapData && (
                    <GeoJSON data={heatmapData.heatmap} style={tileStyle} onEachFeature={onEachTile} />
                )}

                {progression?.spread_vector && (
                    <GeoJSON
                        data={progression.spread_vector}
                        style={{ color: '#3498db', weight: 5, dashArray: '10, 10' }}
                    />
                )}
            </MapContainer>

            <div style={styles.footer}>
                <StatBox label="Active Infection Area" value={`${progression?.metrics?.current_infected_area_m2 || 0} m²`} />
                <StatBox label="Last Week Area" value={`${progression?.metrics?.previous_infected_area_m2 || 0} m²`} />
                <StatBox label="Spread Direction" value={progression?.spread_vector?.properties?.direction || 'Stable'} />
                <StatBox label="New Hotspots" value={progression?.new_hotspots?.length || 0} />
            </div>
        </div>
    );
};

const StatBox = ({ label, value }) => (
    <div style={styles.statBox}>
        <div style={styles.statLabel}>{label}</div>
        <div style={styles.statValue}>{value}</div>
    </div>
);

const styles = {
    container: { width: '100%', height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f5f7fa' },
    header: { padding: '20px', backgroundColor: '#fff', borderBottom: '2px solid #e0e6ed', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    headerLeft: { display: 'flex', flexDirection: 'column', gap: '5px' },
    title: { margin: 0, fontSize: '20px', fontWeight: 'bold', color: '#1a1a1a' },
    badge: { padding: '4px 12px', borderRadius: '15px', fontSize: '13px', display: 'inline-block', alignSelf: 'flex-start' },
    legend: { display: 'flex', gap: '15px', alignItems: 'center' },
    legendItem: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: '600' },
    legendColor: { width: '14px', height: '14px', borderRadius: '3px' },
    map: { flex: 1, width: '100%' },
    footer: { padding: '20px', backgroundColor: '#fff', borderTop: '2px solid #e0e6ed', display: 'flex', justifyContent: 'space-around' },
    statBox: { textAlign: 'center' },
    statLabel: { fontSize: '12px', color: '#64748b', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' },
    statValue: { fontSize: '20px', fontWeight: 'bold', color: '#1e293b' },
    loading: { height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '16px', color: '#64748b' }
};

export default DiseaseHeatmap;
