import React, { useState, useEffect } from 'react';
import API_URL from '@/api/config';

/**
 * Predictive Alerts Component
 * Displays early warning forecasts and predictions per zone.
 */
const PredictiveAlerts = ({ farmId }) => {
    const [alerts, setAlerts] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (farmId) fetchAlerts();
    }, [farmId]);

    const fetchAlerts = async () => {
        try {
            const res = await fetch(`${API_URL}/predict/field/${farmId}/alerts`);
            const data = await res.json();
            setAlerts(data);

            // Optionally fetch aggregated stats
            setLoading(false);
        } catch (e) {
            console.error(e);
            setLoading(false);
        }
    };

    const getAlertColor = (level) => {
        switch (level) {
            case 'CRITICAL': return '#ff4d4f';
            case 'HIGH': return '#faad14';
            case 'MEDIUM': return '#1890ff';
            default: return '#52c41a';
        }
    };

    if (loading) return <div>Analyzing forecasts...</div>;

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h3 style={styles.title}>📡 Early Warning Intelligence</h3>
                <p style={styles.subtitle}>Predictions for the next 7-14 days based on environmental & trend data.</p>
            </div>

            <div style={styles.alertList}>
                {!Array.isArray(alerts) || alerts.length === 0 ? (
                    <div style={styles.empty}>No active disease alerts for this field.</div>
                ) : (
                    alerts.map(alert => (
                        <div key={alert.alert_id} style={{ ...styles.alertCard, borderLeft: `6px solid ${getAlertColor(alert.level)}` }}>
                            <div style={styles.alertHeader}>
                                <span style={{ ...styles.badge, backgroundColor: getAlertColor(alert.level) }}>
                                    {alert.level} RISK
                                </span>
                                <span style={styles.time}>{new Date(alert.timestamp).toLocaleDateString()}</span>
                            </div>
                            <div style={styles.message}>{alert.message}</div>
                            {alert.reasons && (
                                <div style={styles.reasons}>
                                    <strong>Factors:</strong>
                                    <ul>
                                        {JSON.parse(alert.reasons).map((r, i) => <li key={i}>{r}</li>)}
                                    </ul>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

const styles = {
    container: { padding: '20px', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' },
    header: { marginBottom: '20px', borderBottom: '1px solid #f0f0f0', paddingBottom: '10px' },
    title: { margin: 0, color: '#262626', fontSize: '18px' },
    subtitle: { margin: '5px 0 0 0', color: '#8c8c8c', fontSize: '13px' },
    alertList: { display: 'flex', flexDirection: 'column', gap: '15px' },
    alertCard: { padding: '15px', backgroundColor: '#fafafa', borderRadius: '8px', position: 'relative' },
    alertHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '10px' },
    badge: { color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' },
    time: { fontSize: '12px', color: '#bfbfbf' },
    message: { fontSize: '14px', color: '#434343', fontWeight: '500' },
    reasons: { marginTop: '10px', fontSize: '13px', color: '#595959' },
    empty: { textAlign: 'center', padding: '40px', color: '#bfbfbf', fontStyle: 'italic' }
};

export default PredictiveAlerts;
