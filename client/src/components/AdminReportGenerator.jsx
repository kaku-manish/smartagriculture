import API_URL from '@/api/config';
import { useState } from 'react';
import axios from 'axios';

/**
 * Modern Automated Report Generator
 * Allows choosing language and generates PDF + WhatsApp card
 */
const AdminReportGenerator = ({ farmer, onBack, sourceType = 'drone' }) => {
    const [language, setLanguage] = useState('en');
    const [generating, setGenerating] = useState(false);
    const [result, setResult] = useState(null);

    const handleGenerate = async () => {
        setGenerating(true);
        try {
            const res = await axios.post(`${API_URL}/reports/generate`, {
                farm_id: farmer.farm_id || farmer.user_id,
                language: language,
                source_type: sourceType      // drives PDF label: manual/live/drone
            });
            setResult(res.data);
        } catch (err) {
            console.error("Report Generation Error:", err);
            const serverMsg = err.response?.data?.error || err.message;
            alert(`Failed: ${serverMsg}`);
        } finally {
            setGenerating(false);
        }
    };

    const getReportUrl = (path) => `${API_URL}${path}`;

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <button onClick={onBack} style={styles.backBtn}>← Back</button>
                <h2 style={styles.title}>📄 Automated Report Engine</h2>
            </div>

            <div style={styles.card}>
                <div style={styles.farmerInfo}>
                    <div style={styles.avatar}>{farmer.full_name.charAt(0)}</div>
                    <div>
                        <h3 style={styles.farmerName}>{farmer.full_name}</h3>
                        <p style={styles.farmerMeta}>{farmer.location || 'Unknown Location'} • {farmer.field_size || 0} Acres</p>
                    </div>
                </div>

                <div style={styles.settings}>
                    <p style={styles.label}>Select Report Language:</p>
                    <div style={styles.langToggle}>
                        <button
                            style={{ ...styles.langBtn, ...(language === 'en' ? styles.activeLang : {}) }}
                            onClick={() => setLanguage('en')}
                        >
                            English
                        </button>
                        <button
                            style={{ ...styles.langBtn, ...(language === 'te' ? styles.activeLang : {}) }}
                            onClick={() => setLanguage('te')}
                        >
                            తెలుగు (Telugu)
                        </button>
                    </div>
                </div>

                {!result ? (
                    <button
                        onClick={handleGenerate}
                        disabled={generating}
                        style={{ ...styles.generateBtn, ...(generating ? styles.disabledBtn : {}) }}
                    >
                        {generating ? 'Engine Working...' : 'Generate AI Report'}
                    </button>
                ) : (
                    <div style={styles.results}>
                        <div style={styles.successBadge}>✅ Report Generated Successfully!</div>

                        <div style={styles.downloadGrid}>
                            <a href={getReportUrl(result.pdf_url)} target="_blank" style={styles.downloadItem}>
                                <span style={styles.icon}>📄</span>
                                <div>
                                    <strong>Download PDF</strong>
                                    <p>Full Professional Report</p>
                                </div>
                            </a>

                            <a href={getReportUrl(result.card_url)} target="_blank" style={styles.downloadItem}>
                                <span style={styles.icon}>📸</span>
                                <div>
                                    <strong>WhatsApp Card</strong>
                                    <p>Share-ready Image</p>
                                </div>
                            </a>
                        </div>

                        {/* WhatsApp Direct Share Section */}
                        <div style={styles.whatsappSection}>
                            <p style={styles.label}>Direct Action: Send to Farmer via WhatsApp</p>
                            <button
                                onClick={() => {
                                    const phone = farmer.phone?.replace(/\D/g, '') || '';
                                    if (!phone) return alert("No phone number found for this farmer.");

                                    const message = `🌾 *PaddyPulse AI Health Report* 🌾\n\nHello ${farmer.full_name},\n\nYour farm health report is ready.\n🚩 *Risk Score:* ${result.risk_score?.toFixed(1)}/100\n✅ *Status:* ${result.risk_level}\n\nYou can view your full PDF report here:\n${API_URL}${result.pdf_url}\n\nStay alert, Stay safe!`;

                                    const waUrl = `https://wa.me/${phone.startsWith('91') ? phone : '91' + phone}?text=${encodeURIComponent(message)}`;
                                    window.open(waUrl, '_blank');
                                }}
                                style={styles.whatsappBtn}
                            >
                                <span style={styles.waIcon}>💬</span>
                                Send Full Report to {farmer.phone}
                            </button>
                        </div>

                        <div style={styles.previewCard}>
                            <p style={styles.label}>Quick Preview (WhatsApp Card):</p>
                            <img src={getReportUrl(result.card_url)} style={styles.previewImg} alt="Report Card" />
                        </div>

                        <button onClick={() => setResult(null)} style={styles.resetBtn}>Generate Another</button>
                    </div>
                )}
            </div>
        </div>
    );
};

const styles = {
    container: { maxWidth: '800px', margin: '0 auto', padding: '20px' },
    header: { display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '30px' },
    backBtn: { background: 'none', border: 'none', color: '#2196f3', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' },
    title: { margin: 0, fontSize: '24px', color: '#2c3e50' },
    card: { backgroundColor: 'white', borderRadius: '24px', padding: '40px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' },
    farmerInfo: { display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '30px', paddingBottom: '30px', borderBottom: '1px solid #eee' },
    avatar: { width: '60px', height: '60px', borderRadius: '30px', backgroundColor: '#e3f2fd', color: '#1976d2', display: 'flex', alignItems: 'center', justifyCenter: 'center', fontSize: '24px', fontWeight: 'bold' },
    farmerName: { margin: '0 0 5px 0', fontSize: '20px', color: '#1a1a1a' },
    farmerMeta: { margin: 0, color: '#666', fontSize: '14px' },
    settings: { marginBottom: '40px' },
    label: { fontSize: '14px', fontWeight: 'bold', color: '#7f8c8d', marginBottom: '15px' },
    langToggle: { display: 'flex', gap: '10px' },
    langBtn: { padding: '12px 24px', borderRadius: '12px', border: '2px solid #eee', background: 'white', cursor: 'pointer', fontSize: '15px', fontWeight: 'bold', transition: 'all 0.2s' },
    activeLang: { borderColor: '#2196f3', backgroundColor: '#e3f2fd', color: '#1976d2' },
    generateBtn: { width: '100%', padding: '20px', borderRadius: '15px', background: '#1976d2', color: 'white', border: 'none', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', transition: 'transform 0.2s' },
    disabledBtn: { opacity: 0.6, cursor: 'not-allowed' },
    results: { marginTop: '20px' },
    successBadge: { padding: '15px', backgroundColor: '#e8f5e9', color: '#2e7d32', borderRadius: '12px', textAlign: 'center', fontWeight: 'bold', marginBottom: '30px' },
    downloadGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' },
    downloadItem: { display: 'flex', alignItems: 'center', gap: '15px', padding: '20px', borderRadius: '15px', border: '1px solid #eee', textDecoration: 'none', color: '#2c3e50', transition: 'background 0.2s' },
    icon: { fontSize: '30px' },
    previewCard: { backgroundColor: '#f9f9f9', padding: '20px', borderRadius: '15px', marginBottom: '30px' },
    previewImg: { width: '100%', borderRadius: '10px', display: 'block' },
    resetBtn: { color: '#666', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', textDecoration: 'underline' },
    whatsappSection: { marginBottom: '30px', padding: '20px', backgroundColor: '#e7f7e9', borderRadius: '15px', border: '1px solid #c8e6c9' },
    whatsappBtn: { width: '100%', padding: '15px', borderRadius: '12px', backgroundColor: '#25D366', color: 'white', border: 'none', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', transition: 'background 0.2s' },
    waIcon: { fontSize: '24px' }
};

export default AdminReportGenerator;
