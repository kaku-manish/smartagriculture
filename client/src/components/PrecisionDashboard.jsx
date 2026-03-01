import React, { useEffect, useState } from 'react';
import API_URL from '@/api/config';

/**
 * Precision Disease Management Dashboard
 * Displays risk scores, recommendations, and treatment plans
 */
const PrecisionDashboard = ({ farmId, zoneId }) => {
    const [riskData, setRiskData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRiskData();
    }, [farmId, zoneId]);

    const fetchRiskData = async () => {
        try {
            const endpoint = zoneId
                ? `${API_URL}/precision/zone/${zoneId}/recommendations`
                : `${API_URL}/precision/field/${farmId}/risk-summary`;

            const response = await fetch(endpoint);
            const data = await response.json();
            setRiskData(data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching risk data:', error);
            setLoading(false);
        }
    };

    if (loading) {
        return <div style={styles.loading}>Loading risk assessment...</div>;
    }

    if (!riskData) {
        return <div style={styles.error}>No risk data available</div>;
    }

    const getRiskColor = (score) => {
        if (score >= 90) return '#b71c1c'; // Critical - Dark Red
        if (score >= 80) return '#d32f2f'; // High - Red
        if (score >= 60) return '#f57c00'; // Medium - Orange
        if (score >= 30) return '#fbc02d'; // Low-Medium - Yellow
        return '#388e3c'; // Low - Green
    };

    const getRiskLabel = (score) => {
        if (score >= 90) return 'CRITICAL';
        if (score >= 80) return 'HIGH';
        if (score >= 60) return 'MEDIUM';
        if (score >= 30) return 'LOW-MEDIUM';
        return 'LOW';
    };

    // Handle both direct risk data or wrapped in recommendation_json
    const recommendation = riskData.recommendation_json || riskData.recommendation || {};
    const breakdown = riskData.breakdown || {};
    const riskScore = Math.round(riskData.risk_score || riskData.overall_risk_score || 0);
    const explainability = riskData.explainability || [];

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <h2 style={styles.title}>🎯 Precision Disease Management</h2>
                <button onClick={fetchRiskData} style={styles.refreshBtn}>
                    🔄 Refresh
                </button>
            </div>

            {/* Risk Score Card */}
            <div style={styles.riskCard}>
                <div style={styles.scoreSection}>
                    <div style={{ ...styles.scoreCircle, borderColor: getRiskColor(riskScore) }}>
                        <div style={styles.scoreValue}>
                            {typeof riskScore === 'number' ? riskScore.toFixed(0) : riskScore}
                        </div>
                        <div style={styles.scoreLabel}>Risk Score</div>
                    </div>
                    <div style={styles.riskInfo}>
                        <div style={{ ...styles.riskBadge, backgroundColor: getRiskColor(riskScore) }}>
                            {getRiskLabel(riskScore)}
                        </div>
                        {riskData.dominant_disease && (
                            <div style={styles.diseaseInfo}>
                                <strong>Dominant Disease:</strong> {riskData.dominant_disease}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Score Breakdown */}
            {Object.keys(breakdown).length > 0 && (
                <div style={styles.breakdownCard}>
                    <h3 style={styles.cardTitle}>📊 Score Breakdown</h3>
                    <div style={styles.breakdownGrid}>
                        {breakdown.dss !== undefined && (
                            <ScoreBar label="Disease Severity (DSS)" value={breakdown.dss} color="#e53935" />
                        )}
                        {breakdown.wri !== undefined && (
                            <ScoreBar label="Weather Risk (WRI)" value={breakdown.wri} color="#fb8c00" />
                        )}
                        {breakdown.ssi !== undefined && (
                            <ScoreBar label="Soil Stress (SSI)" value={breakdown.ssi} color="#fdd835" />
                        )}
                        {breakdown.htf !== undefined && (
                            <ScoreBar label="History Trend (HTF)" value={breakdown.htf} color="#8e24aa" />
                        )}
                        {breakdown.disease_pressure !== undefined && (
                            <ScoreBar label="Disease Pressure" value={breakdown.disease_pressure} color="#e53935" />
                        )}
                        {breakdown.weather_risk !== undefined && (
                            <ScoreBar label="Weather Risk" value={breakdown.weather_risk} color="#fb8c00" />
                        )}
                        {breakdown.soil_stress !== undefined && (
                            <ScoreBar label="Soil Stress" value={breakdown.soil_stress} color="#fdd835" />
                        )}
                    </div>
                </div>
            )}

            {/* Recommendation Card */}
            {recommendation.action && (
                <div style={styles.recommendationCard}>
                    <h3 style={styles.cardTitle}>💊 Recommended Action</h3>
                    <div style={styles.actionBadge}>
                        {recommendation.action}
                    </div>

                    {recommendation.treatment && (
                        <div style={styles.treatmentSection}>
                            <div style={styles.treatmentItem}>
                                <span style={styles.treatmentLabel}>Category:</span>
                                <span style={styles.treatmentValue}>
                                    {recommendation.pesticide_category || 'N/A'}
                                </span>
                            </div>
                            <div style={styles.treatmentItem}>
                                <span style={styles.treatmentLabel}>Product:</span>
                                <span style={styles.treatmentValue}>
                                    {recommendation.treatment.product_name || recommendation.treatment.product}
                                </span>
                            </div>
                            <div style={styles.treatmentItem}>
                                <span style={styles.treatmentLabel}>Dosage:</span>
                                <span style={styles.treatmentValue}>
                                    {recommendation.treatment.dosage_per_acre}
                                </span>
                            </div>
                        </div>
                    )}

                    {recommendation.spray_window && (
                        <div style={styles.sprayWindow}>
                            <h4 style={styles.subTitle}>🕐 Best Spray Windows</h4>
                            {Array.isArray(recommendation.spray_window) && recommendation.spray_window.length > 0 ? (
                                recommendation.spray_window.slice(0, 3).map((window, idx) => (
                                    <div key={idx} style={styles.windowItem}>
                                        {typeof window === 'string' ? (
                                            <span>{window}</span>
                                        ) : (
                                            <>
                                                <span style={styles.windowTime}>⏰ {window.time}</span>
                                                <span style={styles.windowCondition}>
                                                    {window.condition} | Temp: {Math.round(window.temp)}°C | Wind: {Math.round(window.wind)}km/h
                                                </span>
                                            </>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <p style={styles.windowText}>
                                    {recommendation.spray_window.best_time || 'Check weather conditions'}
                                </p>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Explainability */}
            {explainability.length > 0 && (
                <div style={styles.explainCard}>
                    <h3 style={styles.cardTitle}>🔍 Why This Score?</h3>
                    <ul style={styles.explainList}>
                        {explainability.map((item, idx) => (
                            <li key={idx} style={styles.explainItem}>{item}</li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

// Score Bar Component
const ScoreBar = ({ label, value, color }) => (
    <div style={styles.scoreBarContainer}>
        <div style={styles.scoreBarHeader}>
            <span style={styles.scoreBarLabel}>{label}</span>
            <span style={styles.scoreBarValue}>{value}/100</span>
        </div>
        <div style={styles.scoreBarTrack}>
            <div style={{ ...styles.scoreBarFill, width: `${value}%`, backgroundColor: color }} />
        </div>
    </div>
);

const styles = {
    container: {
        padding: '20px',
        maxWidth: '1200px',
        margin: '0 auto',
        backgroundColor: '#f5f7fa',
        minHeight: '100vh'
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '30px'
    },
    title: {
        fontSize: '28px',
        fontWeight: 'bold',
        color: '#2c3e50'
    },
    refreshBtn: {
        padding: '10px 20px',
        backgroundColor: '#3498db',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '600'
    },
    riskCard: {
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '30px',
        marginBottom: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    },
    scoreSection: {
        display: 'flex',
        alignItems: 'center',
        gap: '40px'
    },
    scoreCircle: {
        width: '180px',
        height: '180px',
        borderRadius: '50%',
        border: '8px solid',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fafafa'
    },
    scoreValue: {
        fontSize: '56px',
        fontWeight: 'bold',
        color: '#2c3e50'
    },
    scoreLabel: {
        fontSize: '14px',
        color: '#7f8c8d',
        marginTop: '5px'
    },
    riskInfo: {
        flex: 1
    },
    riskBadge: {
        display: 'inline-block',
        padding: '12px 24px',
        borderRadius: '8px',
        color: 'white',
        fontSize: '20px',
        fontWeight: 'bold',
        marginBottom: '15px'
    },
    diseaseInfo: {
        fontSize: '16px',
        color: '#34495e'
    },
    breakdownCard: {
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '25px',
        marginBottom: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    },
    cardTitle: {
        fontSize: '20px',
        fontWeight: 'bold',
        color: '#2c3e50',
        marginBottom: '20px'
    },
    breakdownGrid: {
        display: 'grid',
        gap: '15px'
    },
    scoreBarContainer: {
        marginBottom: '10px'
    },
    scoreBarHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '8px'
    },
    scoreBarLabel: {
        fontSize: '14px',
        color: '#34495e',
        fontWeight: '600'
    },
    scoreBarValue: {
        fontSize: '14px',
        color: '#7f8c8d',
        fontWeight: 'bold'
    },
    scoreBarTrack: {
        height: '10px',
        backgroundColor: '#ecf0f1',
        borderRadius: '5px',
        overflow: 'hidden'
    },
    scoreBarFill: {
        height: '100%',
        transition: 'width 0.5s ease'
    },
    recommendationCard: {
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '25px',
        marginBottom: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    },
    actionBadge: {
        display: 'inline-block',
        padding: '15px 30px',
        backgroundColor: '#e74c3c',
        color: 'white',
        borderRadius: '8px',
        fontSize: '18px',
        fontWeight: 'bold',
        marginBottom: '20px'
    },
    treatmentSection: {
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '20px'
    },
    treatmentItem: {
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '12px',
        paddingBottom: '12px',
        borderBottom: '1px solid #dee2e6'
    },
    treatmentLabel: {
        fontSize: '14px',
        color: '#7f8c8d',
        fontWeight: '600'
    },
    treatmentValue: {
        fontSize: '14px',
        color: '#2c3e50',
        fontWeight: 'bold'
    },
    sprayWindow: {
        backgroundColor: '#e8f5e9',
        borderRadius: '8px',
        padding: '20px'
    },
    subTitle: {
        fontSize: '16px',
        fontWeight: 'bold',
        color: '#2c3e50',
        marginBottom: '15px'
    },
    windowItem: {
        backgroundColor: 'white',
        padding: '12px 15px',
        borderRadius: '6px',
        marginBottom: '10px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    windowTime: {
        fontSize: '14px',
        fontWeight: 'bold',
        color: '#27ae60'
    },
    windowCondition: {
        fontSize: '13px',
        color: '#7f8c8d'
    },
    windowText: {
        fontSize: '14px',
        color: '#2c3e50',
        margin: 0
    },
    explainCard: {
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '25px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    },
    explainList: {
        margin: 0,
        paddingLeft: '20px'
    },
    explainItem: {
        fontSize: '14px',
        color: '#34495e',
        marginBottom: '10px',
        lineHeight: '1.6'
    },
    loading: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '18px',
        color: '#7f8c8d'
    },
    error: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '18px',
        color: '#e74c3c'
    }
};

export default PrecisionDashboard;
