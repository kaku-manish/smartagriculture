import API_URL from '@/api/config';
import { useState, useEffect } from 'react';
import axios from 'axios';
import AdminDroneAnalysis from './AdminDroneAnalysis';   // ← the dark drone controller
import AdminReportGenerator from './AdminReportGenerator';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Drone Analysis Hub — Admin Panel
 *
 * Flow:
 *   Step 1 → Select a farmer from the directory
 *   Step 2 → Upload drone image + run AI analysis  (drone-only, no manual/camera options)
 *   Step 3 → Review result & dispatch report
 *
 * The `ImageUpload` component is reused with allowCamera={false} so only the
 * file-upload path is rendered.  Manual check & live camera remain available
 * exclusively inside the "Disease Analysis" section for farmers.
 */
const AdminDroneReportControl = () => {
    const [farmers, setFarmers] = useState([]);
    const [selectedFarmer, setSelectedFarmer] = useState(null);
    const [step, setStep] = useState(1); // 1 | 2 | 3
    const [latestAnalysis, setLatestAnalysis] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Edit / Delete state
    const [editingFarmer, setEditingFarmer] = useState(null);  // farmer obj or null
    const [confirmDelete, setConfirmDelete] = useState(null);  // user_id or null
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => { fetchFarmers(); }, []);

    const fetchFarmers = async () => {
        try {
            const res = await axios.get(`${API_URL}/admin/farmers`);
            setFarmers(res.data);
        } catch (err) {
            console.error('Failed to fetch farmers:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleFarmerSelect = (farmer) => {
        setSelectedFarmer(farmer);
        setLatestAnalysis(null);
        setStep(2);
    };

    /** Called by ImageUpload when /drone/analysis returns a successful result */
    const handleAnalysisComplete = (result) => {
        setLatestAnalysis(result);
        setStep(3);
    };

    // ── Edit ──────────────────────────────────────────────────────────────────
    const handleEditSave = async (userId, formData) => {
        setActionLoading(true);
        try {
            await axios.put(`${API_URL}/admin/farmers/${userId}`, formData);
            setEditingFarmer(null);
            await fetchFarmers();
        } catch (err) {
            alert('Failed to update farmer: ' + (err.response?.data?.error || err.message));
        } finally {
            setActionLoading(false);
        }
    };

    // ── Delete ────────────────────────────────────────────────────────────────
    const handleDeleteConfirm = async (userId) => {
        setActionLoading(true);
        try {
            await axios.delete(`${API_URL}/admin/farmers/${userId}`);
            setConfirmDelete(null);
            await fetchFarmers();
        } catch (err) {
            alert('Failed to delete farmer: ' + (err.response?.data?.error || err.message));
        } finally {
            setActionLoading(false);
        }
    };

    const filteredFarmers = farmers.filter(f =>
        (f.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (f.username || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 space-y-4 text-gray-400">
                <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-medium">Loading Farmer Directory...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">

            {/* ── Page Header ─────────────────────────────────────────── */}
            <div className="flex items-center justify-between mb-2">
                <div>
                    <h1 className="text-2xl font-black text-white drop-shadow-lg flex items-center gap-2" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.7)' }}>
                        🛸 Drone Analysis Hub
                    </h1>
                    <p className="text-sm text-white/80 mt-0.5 drop-shadow" style={{ textShadow: '0 1px 6px rgba(0,0,0,0.6)' }}>
                        Select a farmer, upload a drone-captured image, and run AI disease detection.
                    </p>
                </div>
            </div>

            {/* ── Step Progress Bar ────────────────────────────────────── */}
            <div className="inline-flex items-center space-x-3 mb-6 bg-black/40 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/10">
                <StepBadge number={1} label="Select Farmer" active={step === 1} completed={step > 1} />
                <Connector />
                <StepBadge number={2} label="Drone Upload" active={step === 2} completed={step > 2} />
                <Connector />
                <StepBadge number={3} label="Review & Dispatch" active={step === 3} completed={step > 3} />
            </div>

            <AnimatePresence mode="wait">

                {/* ════════════════════════════════════════════════════════
                    STEP 1 — Farmer Directory
                ═══════════════════════════════════════════════════════ */}
                {step === 1 && (
                    <motion.div
                        key="step1"
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -16 }}
                        transition={{ duration: 0.25 }}
                    >
                        {/* Search */}
                        <div className="mb-5 max-w-sm">
                            <input
                                type="text"
                                placeholder="Search farmer by name or username..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white shadow-sm"
                            />
                        </div>

                        {filteredFarmers.length === 0 ? (
                            <div className="text-center text-white/60 py-16 text-sm drop-shadow">
                                No farmers found.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                {filteredFarmers.map(farmer => (
                                    <FarmerCard
                                        key={farmer.user_id}
                                        farmer={farmer}
                                        onSelect={handleFarmerSelect}
                                        onEdit={() => setEditingFarmer(farmer)}
                                        onDelete={() => setConfirmDelete(farmer.user_id)}
                                        confirmingDelete={confirmDelete === farmer.user_id}
                                        onDeleteConfirm={() => handleDeleteConfirm(farmer.user_id)}
                                        onDeleteCancel={() => setConfirmDelete(null)}
                                        actionLoading={actionLoading}
                                    />
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}

                {/* ════════════════════════════════════════════════════════
                    STEP 2 — Drone Analysis Controller
                    Shows the full dark drone UI (AdminDroneAnalysis).
                    Manual Check / Live Camera are NOT shown here.
                ═══════════════════════════════════════════════════════ */}
                {step === 2 && selectedFarmer && (
                    <motion.div
                        key="step2"
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -16 }}
                        transition={{ duration: 0.25 }}
                        className="space-y-4"
                    >
                        {/* Slim farmer context strip */}
                        <div className="flex items-center justify-between bg-white rounded-2xl px-6 py-4 border border-gray-100 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-lg">
                                    {(selectedFarmer.full_name || '?').charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p className="font-bold text-gray-800 leading-tight">{selectedFarmer.full_name}</p>
                                    <p className="text-xs text-gray-400">
                                        @{selectedFarmer.username} &nbsp;&middot;&nbsp; Farm ID {selectedFarmer.farm_id} &nbsp;&middot;&nbsp; {selectedFarmer.field_size || 0} Ac
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setStep(1)}
                                className="text-xs font-bold text-gray-400 hover:text-gray-700 uppercase tracking-widest transition-colors border border-gray-200 rounded-xl px-4 py-2 hover:bg-gray-50"
                            >
                                ← Change Farmer
                            </button>
                        </div>

                        {/* Full Drone Analysis Controller (dark panel) */}
                        <AdminDroneAnalysis />
                    </motion.div>
                )}

                {/* ════════════════════════════════════════════════════════
                    STEP 3 — Review Result & Dispatch Report
                ═══════════════════════════════════════════════════════ */}
                {step === 3 && (
                    <motion.div
                        key="step3"
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -16 }}
                        transition={{ duration: 0.25 }}
                    >
                        <AdminReportGenerator
                            farmer={selectedFarmer}
                            analysisResult={latestAnalysis}
                            sourceType="drone"             /* report PDF label = "Drone View" */
                            onBack={() => setStep(2)}
                            onSuccess={() => { setStep(1); setSelectedFarmer(null); }}
                        />
                    </motion.div>
                )}

            </AnimatePresence>

            {/* ── Edit Modal (rendered inside the wrapper div) ── */}
            {editingFarmer && (
                <EditModal
                    farmer={editingFarmer}
                    loading={actionLoading}
                    onSave={handleEditSave}
                    onClose={() => setEditingFarmer(null)}
                />
            )}
        </div>
    );
};

/* ── Sub-components ──────────────────────────────────────────────────────── */

const FarmerCard = ({ farmer, onSelect, onEdit, onDelete,
    confirmingDelete, onDeleteConfirm, onDeleteCancel, actionLoading }) => (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm
                   hover:shadow-xl hover:border-emerald-200
                   transition-all duration-200 group overflow-hidden">

        {/* Clickable main body → opens drone analysis */}
        <div
            onClick={() => !confirmingDelete && onSelect(farmer)}
            className="p-6 cursor-pointer"
        >
            <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600
                                flex items-center justify-center font-bold text-xl
                                group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    {(farmer.full_name || '?').charAt(0).toUpperCase()}
                </div>
                <div className="overflow-hidden">
                    <h3 className="font-bold text-gray-800 truncate">{farmer.full_name}</h3>
                    <p className="text-xs text-gray-400 truncate">@{farmer.username}</p>
                </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-50 grid grid-cols-2 gap-2">
                <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Field Size</p>
                    <p className="text-sm font-bold text-gray-700">{farmer.field_size || 0} Ac</p>
                </div>
                <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Farm ID</p>
                    <p className="text-sm font-bold text-gray-700">{farmer.farm_id || '—'}</p>
                </div>
            </div>

            {/* Hover CTA */}
            {!confirmingDelete && (
                <div className="mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-[11px] font-black text-emerald-600 uppercase tracking-widest text-center">
                        🛸 Start Drone Analysis →
                    </p>
                </div>
            )}
        </div>

        {/* ── Action Bar: Edit / Delete ────────────────────────────── */}
        {!confirmingDelete ? (
            <div className="flex border-t border-gray-100">
                <button
                    onClick={e => { e.stopPropagation(); onEdit(); }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-3
                               text-xs font-bold text-blue-600 hover:bg-blue-50 transition-colors
                               border-r border-gray-100 rounded-bl-3xl"
                >
                    ✏️ Edit
                </button>
                <button
                    onClick={e => { e.stopPropagation(); onDelete(); }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-3
                               text-xs font-bold text-red-500 hover:bg-red-50 transition-colors
                               rounded-br-3xl"
                >
                    🗑️ Delete
                </button>
            </div>
        ) : (
            /* Inline delete confirmation */
            <div className="border-t border-red-100 bg-red-50 px-4 py-3 rounded-b-3xl">
                <p className="text-xs font-bold text-red-700 text-center mb-2">Delete this farmer?</p>
                <div className="flex gap-2">
                    <button
                        onClick={e => { e.stopPropagation(); onDeleteCancel(); }}
                        className="flex-1 py-1.5 text-xs font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={e => { e.stopPropagation(); onDeleteConfirm(); }}
                        disabled={actionLoading}
                        className="flex-1 py-1.5 text-xs font-bold text-white bg-red-500 rounded-xl hover:bg-red-600 disabled:opacity-50 transition"
                    >
                        {actionLoading ? '...' : 'Yes, Delete'}
                    </button>
                </div>
            </div>
        )}
    </div>
);

const Connector = () => (
    <div className="w-8 h-px bg-white/30" />
);

const StepBadge = ({ number, label, active, completed }) => (
    <div className={`flex items-center space-x-2 transition-opacity ${active ? 'opacity-100' : 'opacity-50'}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all
            ${completed ? 'bg-emerald-400 text-white shadow-md'
                : active ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-900/40'
                    : 'bg-white/20 text-white/70 border border-white/20'}`}>
            {completed ? '✓' : number}
        </div>
        <span className={`text-xs font-bold uppercase tracking-widest
            ${active ? 'text-emerald-300' : 'text-white/60'}`}>
            {label}
        </span>
    </div>
);

/* ── Edit Modal ──────────────────────────────────────────────────────────── */
const EditModal = ({ farmer, loading, onSave, onClose }) => {
    const [form, setForm] = useState({
        full_name: farmer.full_name || '',
        email: farmer.email || '',
        phone: farmer.phone || '',
        field_size: farmer.field_size || '',
        location: farmer.location || '',
        current_crop: farmer.current_crop || '',
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(farmer.user_id, {
            ...form,
            field_size: form.field_size !== '' ? parseFloat(form.field_size) : null,
        });
    };

    const fields = [
        { key: 'full_name', label: 'Full Name', type: 'text' },
        { key: 'email', label: 'Email', type: 'email' },
        { key: 'phone', label: 'Phone', type: 'text' },
        { key: 'field_size', label: 'Field Size (Ac)', type: 'number' },
        { key: 'location', label: 'Location', type: 'text' },
        { key: 'current_crop', label: 'Current Crop', type: 'text' },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden"
            >
                {/* Modal header */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-black text-gray-800">✏️ Edit Farmer</h2>
                        <p className="text-xs text-gray-500 mt-0.5">@{farmer.username}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl font-bold transition">✕</button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {fields.map(({ key, label, type }) => (
                        <div key={key}>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">{label}</label>
                            <input
                                type={type}
                                value={form[key]}
                                onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm
                                           focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50"
                                step={type === 'number' ? '0.1' : undefined}
                            />
                        </div>
                    ))}

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 py-3 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-50 transition"
                        >
                            {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

export default AdminDroneReportControl;
