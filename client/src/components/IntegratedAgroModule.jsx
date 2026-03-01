import React, { useState } from 'react';
import PrecisionDashboard from './PrecisionDashboard';
import DiseaseHeatmap from './DiseaseHeatmap';
import PredictiveAlerts from './PredictiveAlerts';
import SeverityForecast from './SeverityForecast';

/**
 * Integrated Module showing all 4 features:
 * 1. Precision Decision Engine Dashboard
 * 2. Disease Heatmap Visualization
 * 3. Predictive Outbreak Intelligence (Early Warnings)
 * 4. Executive Summary
 */
const IntegratedAgroModule = ({ farmId = 1, onBack }) => {
    const [activeTab, setActiveTab] = useState('precision');

    // Fallback if farmId is passed as null/undefined
    const effectiveFarmId = farmId || 1;

    return (
        <div style={styles.container}>
            {/* Navigation Tabs */}
            <div style={styles.tabBar}>
                <button
                    style={{ ...styles.tab, ...(activeTab === 'precision' ? styles.activeTab : {}) }}
                    onClick={() => setActiveTab('precision')}
                >
                    🎯 Risk Dashboard
                </button>
                <button
                    style={{ ...styles.tab, ...(activeTab === 'heatmap' ? styles.activeTab : {}) }}
                    onClick={() => setActiveTab('heatmap')}
                >
                    🗺️ Field Heatmap
                </button>
                <button
                    style={{ ...styles.tab, ...(activeTab === 'alerts' ? styles.activeTab : {}) }}
                    onClick={() => setActiveTab('alerts')}
                >
                    📡 Early Warnings
                </button>
                <button
                    style={{ ...styles.tab, ...(activeTab === 'combined' ? styles.activeTab : {}) }}
                    onClick={() => setActiveTab('combined')}
                >
                    📊 Combined View
                </button>
            </div>

            {/* Content Area */}
            <div style={styles.content}>
                {activeTab === 'precision' && (
                    <div>
                        <h2 style={styles.heading}>🌾 Precision Disease Management</h2>
                        <p style={styles.description}>
                            Real-time risk assessment based on drone detections, weather, soil conditions, and historical trends.
                        </p>
                        <PrecisionDashboard farmId={effectiveFarmId} />
                    </div>
                )}

                {activeTab === 'heatmap' && (
                    <div>
                        <h2 style={styles.heading}>🗺️ Disease Distribution Heatmap</h2>
                        <p style={styles.description}>
                            Spatial visualization of disease hotspots across your field with infection zone clustering.
                        </p>
                        <DiseaseHeatmap farmId={effectiveFarmId} />
                    </div>
                )}

                {activeTab === 'alerts' && (
                    <div>
                        <h2 style={styles.heading}>📡 Predictive Outbreak Intelligence</h2>
                        <p style={styles.description}>
                            Early warning system forecasting risks for the next 7-14 days.
                        </p>
                        <SeverityForecast zoneId={1} />
                        <PredictiveAlerts farmId={effectiveFarmId} />
                    </div>
                )}

                {activeTab === 'combined' && (
                    <div style={styles.combinedView}>
                        <h2 style={styles.heading}>📊 Executive Summary</h2>
                        <div style={styles.grid}>
                            <div style={styles.gridItem}>
                                <PrecisionDashboard farmId={effectiveFarmId} />
                            </div>
                            <div style={styles.gridItem}>
                                <DiseaseHeatmap farmId={effectiveFarmId} />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Optional Back Button (AdminDashboard already has one, but good for local navigation) */}
            {onBack && (
                <button onClick={onBack} style={styles.backButton}>
                    ← Back to Farmers List
                </button>
            )}
        </div>
    );
};

const styles = {
    container: {
        width: '100%',
        minHeight: '100vh',
        backgroundColor: '#f0f2f5',
        paddingBottom: '50px'
    },
    tabBar: {
        display: 'flex',
        backgroundColor: '#fff',
        borderBottom: '2px solid #e0e0e0',
        padding: '0 20px',
        position: 'sticky',
        top: 0,
        zIndex: 100
    },
    tab: {
        padding: '15px 30px',
        fontSize: '15px',
        fontWeight: '600',
        border: 'none',
        backgroundColor: 'transparent',
        cursor: 'pointer',
        color: '#666',
        borderBottom: '3px solid transparent',
        transition: 'all 0.3s ease'
    },
    activeTab: {
        color: '#2196f3',
        borderBottomColor: '#2196f3'
    },
    content: {
        padding: '30px'
    },
    heading: {
        fontSize: '28px',
        fontWeight: 'bold',
        color: '#2c3e50',
        marginBottom: '10px'
    },
    description: {
        fontSize: '15px',
        color: '#7f8c8d',
        marginBottom: '25px',
        lineHeight: '1.5'
    },
    combinedView: {
        width: '100%'
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '20px',
        marginBottom: '30px'
    },
    gridItem: {
        backgroundColor: 'white',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    },
    backButton: {
        position: 'fixed',
        bottom: '20px',
        left: '20px',
        padding: '10px 20px',
        backgroundColor: '#2c3e50',
        color: 'white',
        border: 'none',
        borderRadius: '25px',
        cursor: 'pointer',
        zIndex: 1000,
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
    }
};

export default IntegratedAgroModule;
