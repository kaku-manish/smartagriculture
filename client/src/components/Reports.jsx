import { useState, useEffect } from 'react';
import axios from 'axios';

const Reports = ({ farmId }) => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedReport, setSelectedReport] = useState(null);

    useEffect(() => {
        const fetchReports = async () => {
            if (!farmId) {
                setLoading(false);
                return;
            }
            try {
                const res = await axios.get(`http://localhost:3000/reports/${farmId}`);
                if (res.data.reports) {
                    setReports(res.data.reports);
                }
            } catch (err) {
                console.error("Failed to fetch reports", err);
            } finally {
                setLoading(false);
            }
        };
        fetchReports();
    }, [farmId]);

    const handlePrint = () => {
        window.print();
    };

    if (loading) return <div className="p-10 text-center text-gray-500">Loading Reports...</div>;

    if (reports.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] text-gray-400">
                <span className="text-6xl mb-4">📂</span>
                <p>No reports have been issued by the admin yet.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in-up pb-10 relative">
            {/* Header */}
            <div className="glass-panel p-6 rounded-2xl bg-white/60 backdrop-blur-md shadow-sm border border-white/50 flex justify-between items-center no-print">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Field Reports</h2>
                    <p className="text-sm text-gray-500">Official analysis documents from your administrator</p>
                </div>
                <div className="bg-blue-50 text-blue-600 px-4 py-2 rounded-xl font-bold text-sm">
                    {reports.length} Documents
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 no-print">
                {reports.map((report) => (
                    <div key={report.report_id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow group">
                        <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center text-red-500 text-2xl group-hover:scale-110 transition-transform font-sans">
                                📄
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-800">{report.title}</h3>
                                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                                    {new Date(report.generated_date).toLocaleDateString(undefined, {
                                        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                    })}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center space-x-3">
                            <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-green-100 text-green-600">
                                {report.status}
                            </span>
                            <button
                                className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl text-xs font-bold transition-colors flex items-center"
                                onClick={() => setSelectedReport(report)}
                            >
                                <span className="mr-2">👁️</span> View Report
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Report Viewer Modal */}
            {selectedReport && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 md:p-8 animate-in fade-in">
                    <div className="bg-white w-full max-w-5xl max-h-full overflow-y-auto rounded-[2.5rem] shadow-2xl relative flex flex-col">

                        {/* Modal Header (Closes & Print) */}
                        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md p-6 border-b border-gray-100 flex justify-between items-center no-print">
                            <div className="flex items-center space-x-2">
                                <span className="bg-blue-100 text-blue-600 p-2 rounded-lg text-xl">📄</span>
                                <h3 className="font-black text-gray-800 tracking-tight">Report Preview</h3>
                            </div>
                            <div className="flex items-center space-x-3">
                                <button
                                    onClick={handlePrint}
                                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center space-x-2 shadow-lg shadow-blue-500/20 transition-all hover:-translate-y-0.5"
                                >
                                    <span>📩</span>
                                    <span>Download PDF</span>
                                </button>
                                <button
                                    onClick={() => setSelectedReport(null)}
                                    className="p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-xl transition-colors"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                </button>
                            </div>
                        </div>

                        {/* Report Content - Reconstruct the generator view */}
                        <div className="p-10 print:p-0">
                            <ReportContent report={selectedReport} />
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @media print {
                    /* Reset body/html for printing */
                    body, html {
                        width: 100%;
                        height: 100%;
                        margin: 0;
                        padding: 0;
                        overflow: visible;
                    }

                    /* Hide everything by default */
                    body * {
                        visibility: hidden;
                    }

                    /* Disable animations/transforms which mess up fixed/absolute positioning */
                    * {
                        animation: none !important;
                        transition: none !important;
                        transform: none !important;
                    }

                    /* Make the actual report visible and positioned correctly */
                    .report-content, .report-content * {
                        visibility: visible;
                    }

                    .report-content {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100vw;
                        min-height: 100vh;
                        margin: 0;
                        padding: 0;
                        background-color: white;
                        z-index: 99999;
                        border: none;
                        
                        /* Force background colors */
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }

                    /* Hide UI elements explicitly */
                    .no-print {
                        display: none !important;
                    }

                    @page {
                        size: A4;
                        margin: 0;
                    }
                }
            `}</style>
        </div>
    );
};

// Sub-component for the actual Report Sheet
const ReportContent = ({ report }) => {
    // Parse the snapshotted data
    let data = {};
    try {
        data = JSON.parse(report.report_data || '{}');
    } catch (e) { console.error("Data parse error", e); }

    const { drone, iot, recommendation, costData } = data;

    const getImageUrl = (path) => {
        if (!path) return null;
        if (path.startsWith('http')) return path;
        const cleanPath = path.replace(/\\/g, '/');
        const filename = cleanPath.split('/').pop();
        return `http://localhost:3000/uploads/${filename}`;
    };

    return (
        <div className="report-content bg-white min-h-[1000px] font-sans relative">
            <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 no-print"></div>

            <div className="flex justify-between mb-12 border-b border-gray-50 pb-8">
                <div>
                    <div className="flex items-center space-x-2 text-blue-600 mb-2">
                        <span className="text-xl font-black italic">SMART AGRI</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded">Verified Analysis</span>
                    </div>
                    <h1 className="text-3xl font-black text-gray-900 mb-1 uppercase tracking-tight">Field Health Report</h1>
                    <p className="text-gray-400 font-bold text-xs">REF: SA-REP-{report.report_id.toString().padStart(6, '0')}</p>
                </div>
                <div className="text-right">
                    <p className="text-gray-400 font-bold uppercase text-[10px]">Date Issued</p>
                    <p className="text-lg font-bold text-gray-800">{new Date(report.generated_date).toLocaleDateString()}</p>
                    <p className="text-gray-500 font-medium text-xs">Drone Mission: Completed</p>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-8">
                {/* Info Column */}
                <div className="col-span-12 md:col-span-4 space-y-8">
                    <div>
                        <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-4">IoT Sensor Analytics</h4>
                        <div className="bg-gray-50 rounded-2xl p-5 space-y-3">
                            <DataRow label="Soil Moisture" value={`${iot?.soil_moisture || '--'}%`} />
                            <DataRow label="Water Level" value={`${iot?.water_level || '--'} cm`} />
                            <DataRow label="Temperature" value={`${iot?.temperature || '--'}°C`} />
                        </div>
                    </div>

                    <div>
                        <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-4">Estimated Treatment Cost</h4>
                        <div className="bg-indigo-600 rounded-xl p-5 text-white text-center shadow-lg shadow-indigo-100">
                            <p className="text-[9px] font-bold uppercase opacity-80 mb-1">Total Budget Required</p>
                            <p className="text-2xl font-black">₹{costData?.primary?.totalMin || '0'} - ₹{costData?.primary?.totalMax || '0'}</p>
                        </div>
                    </div>
                </div>

                {/* Analysis Column */}
                <div className="col-span-12 md:col-span-8 space-y-8">
                    <div className="relative aspect-video rounded-3xl overflow-hidden bg-gray-100 border-4 border-white shadow-xl">
                        {drone ? (
                            <img
                                src={getImageUrl(drone.annotated_image_reference || drone.image_reference)}
                                className="w-full h-full object-cover"
                                alt="Report Analysis"
                            />
                        ) : <div className="w-full h-full flex items-center justify-center text-gray-300">Image Snapshot Missing</div>}
                        <div className="absolute top-4 right-4 bg-red-600 text-white text-[10px] font-black px-4 py-1 rounded-full shadow-lg uppercase tracking-widest">
                            {drone?.severity || 'LOW'} Severity
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="bg-white p-4">
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Identification</h4>
                            <p className="text-2xl font-black text-gray-900 leading-none mb-1">{drone?.disease_type || 'Normal'}</p>
                            <p className="text-[10px] font-bold text-gray-400">AI CONFIDENCE: {drone?.confidence || 0}%</p>
                        </div>
                        <div className="bg-green-50 rounded-2xl p-4 border border-green-100">
                            <h4 className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-2">Recommended Medicine</h4>
                            <p className="text-sm font-black text-green-800 leading-tight">{recommendation?.medicine_suggestion || 'None Required'}</p>
                            <p className="text-[10px] font-bold text-green-600 mt-1">Dosage: {recommendation?.dosage || 'N/A'}</p>
                        </div>
                    </div>

                    <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100 italic text-sm text-gray-600 font-medium">
                        "{recommendation?.preventive_measures || 'No additional measures recorded.'}"
                    </div>
                </div>
            </div>

            <div className="mt-20 pt-8 border-t border-gray-50">
                <p className="text-[10px] text-center font-bold text-gray-300 uppercase tracking-[0.3em]">Smart Agri Automated Analysis Engine • Private & Confidential</p>
            </div>
        </div>
    );
};

const DataRow = ({ label, value }) => (
    <div className="flex justify-between items-center py-1 border-b border-gray-100/50 last:border-0">
        <span className="text-[11px] font-bold text-gray-400 uppercase">{label}</span>
        <span className="text-sm font-black text-gray-800">{value}</span>
    </div>
);

export default Reports;
