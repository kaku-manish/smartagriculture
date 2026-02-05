import { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

const AdminSettings = () => {
    const { t } = useTranslation();
    const [groupedMedicines, setGroupedMedicines] = useState({});
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [expandedDisease, setExpandedDisease] = useState(null);
    const [editForm, setEditForm] = useState({ unit_price: '', brand_name: '', available: 1 });
    const [diseases, setDiseases] = useState([]);
    const [newMedicine, setNewMedicine] = useState({ medicine_name: '', brand_name: '', unit_price: '', unit: 'liter', disease_name: '' });
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const [medsRes, diseasesRes] = await Promise.all([
                axios.get('http://localhost:3000/cost/grouped-medicines'),
                axios.get('http://localhost:3000/cost/diseases')
            ]);

            setGroupedMedicines(medsRes.data);

            // Deduplicate and format disease names
            const uniqueDiseases = [...new Set(diseasesRes.data.map(d => d.replace(/_/g, ' ')))];
            setDiseases(uniqueDiseases);

            if (uniqueDiseases.length > 0) {
                setNewMedicine(prev => ({ ...prev, disease_name: uniqueDiseases[0] }));
            }

            const keys = Object.keys(medsRes.data);
            if (keys.length > 0 && !expandedDisease) {
                setExpandedDisease(keys[0]);
            }
            setLoading(false);
        } catch (err) {
            console.error("Failed to fetch data:", err);
            setLoading(false);
        }
    };

    const toggleDisease = (disease) => {
        setExpandedDisease(expandedDisease === disease ? null : disease);
    };

    const handleEditStart = (med) => {
        setEditingId(med.id);
        setEditForm({
            unit_price: med.unit_price,
            brand_name: med.brand_name || '',
            available: med.available
        });
    };

    const handleUpdate = async (id) => {
        try {
            await axios.put(`http://localhost:3000/cost/medicine/${id}`, editForm);
            setMessage({ type: 'success', text: 'Price updated successfully!' });
            setEditingId(null);
            fetchAllData();
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to update price.' });
        }
    };

    const handleAddMedicine = async (e) => {
        e.preventDefault();
        try {
            await axios.post('http://localhost:3000/cost/medicine', newMedicine);
            setMessage({ type: 'success', text: 'New medicine added successfully!' });
            const oldDisease = newMedicine.disease_name;
            setNewMedicine({ medicine_name: '', brand_name: '', unit_price: '', unit: 'liter', disease_name: oldDisease });
            fetchAllData();

            if (oldDisease) setExpandedDisease(oldDisease);
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to add medicine.' });
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-20 space-y-4">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-500 font-bold animate-pulse">Syncing Database...</p>
        </div>
    );

    const diseaseColors = {
        'Blast': 'from-blue-600 to-blue-700',
        'Brown Spot': 'from-amber-600 to-amber-700',
        'Bacterial Leaf Blight': 'from-emerald-600 to-emerald-700',
        'Bacterial Leaf Blight (BLB)': 'from-emerald-600 to-emerald-700',
        'Sheath Blight': 'from-rose-600 to-rose-700',
        'Tungro': 'from-purple-600 to-purple-700',
        'hispa': 'from-indigo-600 to-indigo-700',
        'dead_heart': 'from-slate-600 to-slate-700',
        'downy_mildew': 'from-teal-600 to-teal-700'
    };

    const getDiseaseColor = (name) => {
        return diseaseColors[name] || 'from-gray-600 to-gray-700';
    };

    return (
        <div className="space-y-8 pb-20">
            <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-2xl p-6 text-white shadow-lg">
                <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
                        <span className="text-2xl">💊</span>
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold">Medicine Catalog</h2>
                        <p className="text-gray-400 text-sm">Manage medicine prices and agricultural inventory</p>
                    </div>
                </div>
            </div>

            {message.text && (
                <div className={`p-4 rounded-xl text-center font-medium shadow-sm transition-all duration-300 ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                    {message.text}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Price Management Section */}
                <div className="lg:col-span-3 space-y-6">
                    {Object.keys(groupedMedicines).length > 0 ? (
                        Object.entries(groupedMedicines).map(([diseaseName, medList]) => (
                            <div key={diseaseName} className="bg-white rounded-[2rem] shadow-xl shadow-gray-100/30 border border-gray-100 overflow-hidden transform transition-all duration-500">
                                {/* Disease Title Card Header (Clickable Toggle) */}
                                <div
                                    onClick={() => toggleDisease(diseaseName)}
                                    className={`px-8 py-6 bg-gradient-to-r ${getDiseaseColor(diseaseName)} text-white flex justify-between items-center cursor-pointer hover:brightness-110 active:scale-[0.99] transition-all`}
                                >
                                    <div className="flex items-center space-x-4">
                                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-xl backdrop-blur-sm">
                                            {expandedDisease === diseaseName ? '📂' : '📁'}
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-black uppercase tracking-wider">{diseaseName.replace(/_/g, ' ')}</h3>
                                            <p className="text-[10px] text-white/70 font-bold uppercase tracking-widest mt-0.5">Click to {expandedDisease === diseaseName ? 'collapse' : 'expand'} medicines</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-4">
                                        <div className="bg-white/20 px-3 py-1 rounded-full backdrop-blur-md">
                                            <span className="text-xs font-bold">{medList.length} Medicines</span>
                                        </div>
                                        <span className={`text-2xl transition-transform duration-300 ${expandedDisease === diseaseName ? 'rotate-180' : ''}`}>
                                            ▼
                                        </span>
                                    </div>
                                </div>

                                {/* Slide-out Medicine List */}
                                <div className={`transition-all duration-500 ease-in-out overflow-hidden ${expandedDisease === diseaseName ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                    <div className="overflow-x-auto p-2">
                                        <table className="w-full text-sm text-left">
                                            <thead className="text-[10px] text-gray-400 uppercase font-black bg-gray-50/50">
                                                <tr>
                                                    <th className="px-8 py-4">Medicine Name</th>
                                                    <th className="px-6 py-4">Brand</th>
                                                    <th className="px-6 py-4">Unit Price</th>
                                                    <th className="px-6 py-4">Unit</th>
                                                    <th className="px-8 py-4 text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {medList.map((med) => (
                                                    <tr key={med.id} className="group hover:bg-gray-50/80 transition-colors">
                                                        <td className="px-8 py-5 font-bold text-gray-800">{med.medicine_name}</td>
                                                        <td className="px-6 py-5">
                                                            {editingId === med.id ? (
                                                                <input
                                                                    type="text"
                                                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                                                                    value={editForm.brand_name}
                                                                    onChange={(e) => setEditForm({ ...editForm, brand_name: e.target.value })}
                                                                />
                                                            ) : (
                                                                <span className="text-gray-500 font-medium">{med.brand_name || 'Generic'}</span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-5">
                                                            {editingId === med.id ? (
                                                                <input
                                                                    type="number"
                                                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                                                                    value={editForm.unit_price}
                                                                    onChange={(e) => setEditForm({ ...editForm, unit_price: e.target.value })}
                                                                />
                                                            ) : (
                                                                <div className="flex flex-col">
                                                                    <span className="font-black text-gray-900 text-base">₹{med.unit_price}</span>
                                                                    <span className="text-[10px] text-gray-400 uppercase font-bold tracking-tighter">Current rate</span>
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-5">
                                                            <span className="bg-gray-100 text-gray-500 px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest">{med.unit}</span>
                                                        </td>
                                                        <td className="px-8 py-5 text-right">
                                                            {editingId === med.id ? (
                                                                <div className="flex justify-end space-x-2">
                                                                    <button onClick={() => handleUpdate(med.id)} className="bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 transition-all">Save</button>
                                                                    <button onClick={() => setEditingId(null)} className="bg-gray-100 text-gray-500 px-4 py-2 rounded-xl text-xs font-bold hover:bg-gray-200 transition-all">Cancel</button>
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    onClick={() => handleEditStart(med)}
                                                                    className="px-4 py-2 text-xs font-black text-blue-600 bg-blue-50 rounded-xl opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all hover:bg-blue-600 hover:text-white"
                                                                >
                                                                    Edit
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="p-20 text-center bg-gray-50 rounded-[3rem] border border-dashed border-gray-200">
                            <span className="text-5xl block mb-4">🔦</span>
                            <h3 className="text-xl font-bold text-gray-800">No linked medicines found</h3>
                            <p className="text-gray-500 max-w-sm mx-auto mt-2 italic">Add medicines to the catalog or update your knowledge base links.</p>
                        </div>
                    )}
                </div>

                {/* Add New Medicine Sidebar */}
                <div className="lg:col-span-1">
                    <div className="sticky top-8">
                        <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-gray-200/50 border border-gray-100 p-8">
                            <h3 className="font-black text-gray-900 mb-8 flex items-center text-xl">
                                <span className="w-10 h-10 bg-blue-600 text-white rounded-2xl flex items-center justify-center mr-4 shadow-lg shadow-blue-600/30">＋</span>
                                Add to Catalog
                            </h3>
                            <form onSubmit={handleAddMedicine} className="space-y-6">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Target Disease</label>
                                    <select
                                        required
                                        className="w-full border-2 border-blue-50 rounded-[1.25rem] px-5 py-4 bg-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm font-bold cursor-pointer text-gray-800"
                                        value={newMedicine.disease_name}
                                        onChange={(e) => setNewMedicine({ ...newMedicine, disease_name: e.target.value })}
                                    >
                                        <option value="" disabled>Select Disease Category...</option>
                                        {diseases.map(d => (
                                            <option key={d} value={d} className="text-gray-800 py-2">{d}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Medicine Name</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full border border-gray-200 rounded-[1.25rem] px-5 py-4 bg-gray-50/50 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm font-bold"
                                        value={newMedicine.medicine_name}
                                        onChange={(e) => setNewMedicine({ ...newMedicine, medicine_name: e.target.value })}
                                        placeholder="e.g. Copper Oxychloride"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Brand Name</label>
                                    <input
                                        type="text"
                                        className="w-full border border-gray-200 rounded-[1.25rem] px-5 py-4 bg-gray-50/50 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm font-bold"
                                        value={newMedicine.brand_name}
                                        onChange={(e) => setNewMedicine({ ...newMedicine, brand_name: e.target.value })}
                                        placeholder="e.g. Blitox"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Price (₹)</label>
                                        <input
                                            type="number"
                                            required
                                            className="w-full border border-gray-200 rounded-[1.25rem] px-5 py-4 bg-gray-50/50 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm font-bold"
                                            value={newMedicine.unit_price}
                                            onChange={(e) => setNewMedicine({ ...newMedicine, unit_price: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Unit</label>
                                        <select
                                            className="w-full border border-gray-200 rounded-[1.25rem] px-5 py-4 bg-gray-50/50 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm font-bold appearance-none cursor-pointer"
                                            value={newMedicine.unit}
                                            onChange={(e) => setNewMedicine({ ...newMedicine, unit: e.target.value })}
                                        >
                                            <option value="liter">Liter</option>
                                            <option value="kg">KG</option>
                                            <option value="pack">Pack</option>
                                        </select>
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-[1.5rem] shadow-xl shadow-blue-600/20 transition-all hover:-translate-y-1 active:scale-95 text-sm uppercase tracking-widest"
                                >
                                    Push to Database
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminSettings;
