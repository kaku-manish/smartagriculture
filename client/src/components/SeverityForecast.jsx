import React, { useState, useEffect } from 'react';
import API_URL from '@/api/config';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, ReferenceLine
} from 'recharts';

/**
 * Severity Forecast Component
 * Visualizes the predicted disease severity curve with confidence bounds.
 */
const SeverityForecast = ({ zoneId = 1 }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (zoneId) fetchForecast();
    }, [zoneId]);

    const fetchForecast = async () => {
        try {
            const res = await fetch(`${API_URL}/predict/zone/${zoneId}/severity-forecast?days=7`);
            const json = await res.json();

            // Format data for Recharts: Combine history + predictions
            const chartData = [
                ...(json.history || []).map(h => ({ name: `Day ${h.index}`, severity: h.actual, type: 'Historical' })),
                ...(json.predictions || []).map(p => ({
                    name: p.date,
                    severity: p.yhat,
                    lower: p.yhat_lower,
                    upper: p.yhat_upper,
                    type: 'Forecast'
                }))
            ];

            setData({ ...json, chartData });
            setLoading(false);
        } catch (e) {
            console.error(e);
            setLoading(false);
        }
    };

    if (loading) return <div style={styles.loading}>Generating forecast curve...</div>;
    if (!data) return <div>No forecast data.</div>;

    const threshold = 75;

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h3 style={styles.title}>📈 7-Day Severity Forecast</h3>
                <p style={styles.summary}>{data.summary}</p>
                {data.highRiskDate && (
                    <div style={styles.warningBox}>
                        ⚠️ <strong>CRITICAL ALERT:</strong> Severity may cross High Risk (75+) on <strong>{data.highRiskDate}</strong>.
                    </div>
                )}
            </div>

            <div style={styles.chartWrapper}>
                <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={data.chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" fontSize={12} tick={{ fill: '#888' }} />
                        <YAxis domain={[0, 100]} fontSize={12} />
                        <Tooltip
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        />
                        <ReferenceLine y={threshold} label="High Risk" stroke="red" strokeDasharray="3 3" />

                        {/* Confidence Interval Area */}
                        <Area
                            type="monotone"
                            dataKey="upper"
                            stroke="none"
                            fill="#3498db"
                            fillOpacity={0.1}
                        />
                        <Area
                            type="monotone"
                            dataKey="lower"
                            stroke="none"
                            fill="#3498db"
                            fillOpacity={0.1}
                        />

                        {/* Prediction Line */}
                        <Line
                            type="monotone"
                            dataKey="severity"
                            stroke="#3498db"
                            strokeWidth={3}
                            dot={{ r: 4 }}
                            activeDot={{ r: 6 }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            <div style={styles.legend}>
                <div style={styles.legendItem}><span style={{ ...styles.dot, backgroundColor: '#3498db' }}></span> Predicted Path</div>
                <div style={styles.legendItem}><span style={{ ...styles.dot, backgroundColor: 'rgba(52, 152, 219, 0.2)' }}></span> Confidence Bound</div>
                <div style={styles.legendItem}><span style={{ ...styles.dot, backgroundColor: 'red' }}></span> Risk Threshold</div>
            </div>
        </div>
    );
};

const styles = {
    container: { padding: '24px', backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', marginTop: '20px' },
    header: { marginBottom: '24px' },
    title: { margin: '0 0 8px 0', color: '#1a1a1a', fontSize: '20px', fontWeight: 'bold' },
    summary: { color: '#666', fontSize: '14px', lineHeight: '1.5', margin: 0 },
    warningBox: { marginTop: '16px', padding: '12px 16px', backgroundColor: '#fff2f0', borderLeft: '4px solid #ff4d4f', borderRadius: '4px', color: '#ff4d4f', fontSize: '14px' },
    chartWrapper: { width: '100%', height: '300px' },
    legend: { display: 'flex', gap: '24px', justifyContent: 'center', marginTop: '20px' },
    legendItem: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#666' },
    dot: { width: '12px', height: '12px', borderRadius: '3px' },
    loading: { height: '300px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#888' }
};

export default SeverityForecast;
