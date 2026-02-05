import API_URL from '@/api/config';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ShoppingBag,
    ChevronRight,
    AlertCircle,
    Leaf,
    ShieldCheck,
    Info,
    CheckCircle2,
    Clock,
    ArrowRight,
    Search,
    MapPin,
    Calendar,
    Plus,
    Minus,
    Package,
    TrendingUp,
    HelpCircle,
    Video,
    Cpu,
    CreditCard,
    X
} from 'lucide-react';

const MedicineMarketplace = ({ farmId, user }) => {
    const [medicines, setMedicines] = useState([]);
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(true);
    const [cart, setCart] = useState({});
    const [orders, setOrders] = useState([]);
    const [orderStatus, setOrderStatus] = useState({ type: '', text: '' });

    // Checkout Modal State
    const [showCheckout, setShowCheckout] = useState(false);
    const [selectedMedForCheckout, setSelectedMedForCheckout] = useState(null);
    const [checkoutDetails, setCheckoutDetails] = useState({
        customerName: '',
        phoneNumber: '',
        address: '',
        state: '',
        district: '',
        pincode: '',
        paymentMethod: 'Cash on Delivery'
    });

    useEffect(() => {
        fetchMarketplaceData();
        fetchMyOrders();

        const interval = setInterval(fetchMarketplaceData, 30000);
        return () => clearInterval(interval);
    }, [farmId]);

    const fetchMarketplaceData = async () => {
        try {
            const [analysisRes, medicinesRes] = await Promise.all([
                axios.get(`http://localhost:3000/cost/estimate/${farmId}`),
                axios.get(`http://localhost:3000/cost/medicines`)
            ]);

            if (analysisRes.data.hasData) {
                setAnalysis(analysisRes.data);
                // Pre-fill name if empty
                if (!checkoutDetails.customerName && analysisRes.data.farm?.farmerName) {
                    setCheckoutDetails(prev => ({ ...prev, customerName: analysisRes.data.farm.farmerName }));
                }
            } else if (!checkoutDetails.customerName && user?.full_name) {
                setCheckoutDetails(prev => ({ ...prev, customerName: user.full_name }));
            }
            setMedicines(medicinesRes.data);
            setLoading(false);
        } catch (err) {
            console.error("Failed to fetch marketplace data:", err);
            setLoading(false);
        }
    };

    const fetchMyOrders = async () => {
        try {
            const res = await axios.get(`${API_URL}/orders/my-orders`);
            setOrders(res.data);
        } catch (err) {
            console.error("Failed to fetch orders:", err);
        }
    };

    const updateQuantity = (medId, delta) => {
        setCart(prev => {
            const newQty = (prev[medId] || 0) + delta;
            if (newQty <= 0) {
                const { [medId]: _, ...rest } = prev;
                return rest;
            }
            return { ...prev, [medId]: newQty };
        });
    };

    const initiateCheckout = (med) => {
        setSelectedMedForCheckout(med);
        setShowCheckout(true);
    };

    const handleConfirmOrder = async () => {
        const med = selectedMedForCheckout;
        const qty = cart[med.id] || 1;

        const requiredFields = ['customerName', 'phoneNumber', 'address', 'state', 'district', 'pincode'];
        const missingField = requiredFields.find(f => !checkoutDetails[f]?.trim());

        if (missingField) {
            setOrderStatus({ type: 'error', text: `Please fill in all details (missing ${missingField})` });
            return;
        }

        try {
            await axios.post(`${API_URL}/orders/request`, {
                farm_id: farmId,
                user_id: user.id, // Fallback for transition
                medicine_name: med.medicine_name,
                quantity: qty,
                total_price: med.unit_price * qty,
                customer_name: checkoutDetails.customerName,
                phone_number: checkoutDetails.phoneNumber,
                address: checkoutDetails.address,
                state: checkoutDetails.state,
                district: checkoutDetails.district,
                pincode: checkoutDetails.pincode,
                payment_method: checkoutDetails.paymentMethod
            }, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                }
            });

            setOrderStatus({ type: 'success', text: `Order request for ${med.medicine_name} placed successfully!` });
            setShowCheckout(false);
            fetchMyOrders();
            const { [med.id]: _, ...rest } = cart;
            setCart(rest);

            setTimeout(() => setOrderStatus({ type: '', text: '' }), 4000);
        } catch (err) {
            setOrderStatus({ type: 'error', text: 'Failed to place order. Try again.' });
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-20 space-y-4">
            <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-emerald-700 font-bold">Syncing Marketplace...</p>
        </div>
    );

    const getMedTag = (medName) => {
        if (!analysis) return { label: 'Preventive', color: 'bg-gray-100 text-gray-700' };
        if (medName.toLowerCase() === analysis.primary.medicine.toLowerCase()) {
            return { label: 'Recommended', color: 'bg-emerald-500 text-white shadow-emerald-500/20' };
        }
        if (analysis.alternative && medName.toLowerCase() === analysis.alternative.medicine.toLowerCase()) {
            return { label: 'Alternative', color: 'bg-amber-400 text-black shadow-amber-500/10' };
        }
        return { label: 'Preventive', color: 'bg-gray-100 text-gray-700' };
    };

    const displayMedicines = (() => {
        const uniqueMap = new Map();
        medicines.forEach(med => {
            const name = med.medicine_name.toLowerCase();
            if (!uniqueMap.has(name) || (med.available && !uniqueMap.get(name).available)) {
                uniqueMap.set(name, med);
            }
        });
        const uniqueList = Array.from(uniqueMap.values());
        return uniqueList.sort((a, b) => {
            const tagA = getMedTag(a.medicine_name).label;
            const tagB = getMedTag(b.medicine_name).label;
            const priority = { 'Recommended': 1, 'Alternative': 2, 'Preventive': 3 };
            return (priority[tagA] || 4) - (priority[tagB] || 4);
        });
    })();

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-20 animate-in fade-in duration-700">
            {/* 1. Header */}
            <div className="bg-gradient-to-br from-emerald-50 to-white border border-emerald-100 p-8 rounded-[2.5rem] shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-100/30 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-black text-emerald-900 tracking-tight mb-2">Recommended Medicines for Your Field</h1>
                        <p className="text-emerald-700/60 font-medium flex items-center">
                            <ShieldCheck className="w-4 h-4 mr-2" />
                            Based on latest drone & AI analysis
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-4">
                        <div className="bg-white px-5 py-3 rounded-2xl border border-emerald-100 shadow-sm">
                            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500/50 mb-1">Field Name</p>
                            <p className="text-sm font-bold text-emerald-900">{analysis ? analysis.farm.location : 'Loading...'}</p>
                        </div>
                        {analysis && (
                            <div className="bg-emerald-600 px-5 py-3 rounded-2xl shadow-lg shadow-emerald-200 text-white">
                                <p className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-1">Detected Disease</p>
                                <div className="flex items-center">
                                    <span className="text-sm font-black uppercase tracking-tighter">{analysis.disease.name}</span>
                                    <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-md text-[9px] font-bold">{analysis.disease.severity} SEVERITY</span>
                                </div>
                            </div>
                        )}
                        <div className="bg-white px-5 py-3 rounded-2xl border border-emerald-100 shadow-sm">
                            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500/50 mb-1">Last Analysis</p>
                            <p className="text-sm font-bold text-emerald-900 flex items-center">
                                <Calendar className="w-3.5 h-3.5 mr-2 text-emerald-400" />
                                {new Date().toLocaleDateString()}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {orderStatus.text && (
                <div className={`p-4 rounded-2xl text-center font-bold shadow-lg transition-all border ${orderStatus.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'
                    }`}>
                    {orderStatus.text}
                </div>
            )}

            {/* Checkout Modal */}
            <AnimatePresence>
                {showCheckout && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setShowCheckout(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden overflow-y-auto max-h-[90vh]"
                        >
                            <div className="p-8">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-xl font-black text-emerald-900 uppercase tracking-tight">Complete Your Order</h3>
                                    <button onClick={() => setShowCheckout(false)} className="p-2 hover:bg-emerald-50 rounded-full transition-colors text-emerald-400">
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-center">
                                        <p className="text-[10px] font-black uppercase text-emerald-500/60 tracking-widest mb-1">Total Payable</p>
                                        <p className="text-3xl font-black text-emerald-900 tracking-tighter">
                                            ₹{Math.round(selectedMedForCheckout.unit_price * (cart[selectedMedForCheckout.id] || 1))}
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-black text-emerald-500/40 uppercase tracking-widest mb-1 ml-1">Your Name</label>
                                            <input
                                                type="text"
                                                placeholder="Full Name"
                                                className="w-full border-2 border-emerald-50 rounded-xl px-4 py-3 bg-white outline-none focus:border-emerald-500 transition-all text-sm font-bold"
                                                value={checkoutDetails.customerName}
                                                onChange={(e) => setCheckoutDetails({ ...checkoutDetails, customerName: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-emerald-500/40 uppercase tracking-widest mb-1 ml-1">Phone Number</label>
                                            <input
                                                type="text"
                                                placeholder="10-digit Number"
                                                className="w-full border-2 border-emerald-50 rounded-xl px-4 py-3 bg-white outline-none focus:border-emerald-500 transition-all text-sm font-bold"
                                                value={checkoutDetails.phoneNumber}
                                                onChange={(e) => setCheckoutDetails({ ...checkoutDetails, phoneNumber: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black text-emerald-500/40 uppercase tracking-widest mb-1 ml-1">Delivery Address</label>
                                        <textarea
                                            placeholder="House No, Street, Village etc."
                                            className="w-full border-2 border-emerald-50 rounded-xl px-4 py-3 bg-white outline-none focus:border-emerald-500 transition-all text-sm font-bold min-h-[80px] resize-none"
                                            value={checkoutDetails.address}
                                            onChange={(e) => setCheckoutDetails({ ...checkoutDetails, address: e.target.value })}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-black text-emerald-500/40 uppercase tracking-widest mb-1 ml-1">District</label>
                                            <input
                                                type="text"
                                                placeholder="District"
                                                className="w-full border-2 border-emerald-50 rounded-xl px-4 py-3 bg-white outline-none focus:border-emerald-500 transition-all text-sm font-bold"
                                                value={checkoutDetails.district}
                                                onChange={(e) => setCheckoutDetails({ ...checkoutDetails, district: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-emerald-500/40 uppercase tracking-widest mb-1 ml-1">State</label>
                                            <input
                                                type="text"
                                                placeholder="State"
                                                className="w-full border-2 border-emerald-50 rounded-xl px-4 py-3 bg-white outline-none focus:border-emerald-500 transition-all text-sm font-bold"
                                                value={checkoutDetails.state}
                                                onChange={(e) => setCheckoutDetails({ ...checkoutDetails, state: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black text-emerald-500/40 uppercase tracking-widest mb-1 ml-1">Pincode</label>
                                        <input
                                            type="text"
                                            placeholder="6-digit Pincode"
                                            className="w-full border-2 border-emerald-50 rounded-xl px-4 py-3 bg-white outline-none focus:border-emerald-500 transition-all text-sm font-bold"
                                            value={checkoutDetails.pincode}
                                            onChange={(e) => setCheckoutDetails({ ...checkoutDetails, pincode: e.target.value })}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black text-emerald-500/40 uppercase tracking-widest mb-1 ml-1">Payment Mode</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            {['Cash on Delivery', 'UPI Payment'].map(mode => (
                                                <button
                                                    key={mode}
                                                    onClick={() => setCheckoutDetails({ ...checkoutDetails, paymentMethod: mode })}
                                                    className={`px-4 py-3 rounded-xl text-xs font-black uppercase transition-all border-2 flex items-center justify-center space-x-2 ${checkoutDetails.paymentMethod === mode
                                                        ? 'bg-emerald-500 border-emerald-400 text-white shadow-lg'
                                                        : 'bg-white border-emerald-50 text-emerald-800/40'
                                                        }`}
                                                >
                                                    <span>{mode === 'Cash on Delivery' ? 'COD' : 'UPI'}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleConfirmOrder}
                                        className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-black uppercase shadow-xl transition-all"
                                    >
                                        Confirm Request
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-3 space-y-6">
                    <div className="flex items-center justify-between px-4">
                        <h2 className="text-xl font-black text-emerald-900 flex items-center">
                            <Leaf className="w-5 h-5 mr-3 text-emerald-500" />
                            Medicine Catalog
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {displayMedicines.map((med) => (
                            <MedicineCard
                                key={med.id}
                                med={med}
                                tag={getMedTag(med.medicine_name)}
                                qty={cart[med.id] || 1}
                                onUpdateQty={(delta) => updateQuantity(med.id, delta)}
                                onOrder={() => initiateCheckout(med)}
                                diagnosisDosage={
                                    med.medicine_name.toLowerCase() === analysis?.primary.medicine.toLowerCase()
                                        ? analysis?.primary.dosage
                                        : (analysis?.alternative && med.medicine_name.toLowerCase() === analysis?.alternative.medicine.toLowerCase())
                                            ? analysis?.alternative.dosage : null
                                }
                            />
                        ))}
                    </div>
                </div>

                <div className="lg:col-span-1 space-y-6">


                    <div className="bg-white p-6 rounded-[2.5rem] border border-emerald-100 shadow-xl shadow-emerald-500/5">
                        <h3 className="font-black text-emerald-900 uppercase text-xs tracking-widest mb-6">Recent Orders</h3>
                        <div className="space-y-4">
                            {orders.length > 0 ? (
                                orders.slice(0, 4).map((order) => (
                                    <div key={order.order_id} className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                                        <div className="flex justify-between items-start mb-1">
                                            <p className="text-xs font-bold text-gray-800 truncate pr-2">{order.medicine_name}</p>
                                            <span className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase ${order.status === 'Delivered' ? 'bg-emerald-100 text-emerald-700' :
                                                order.status === 'Pending' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                                                }`}>
                                                {order.status}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-xs text-center text-gray-400 italic">No orders yet</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const MedicineCard = ({ med, tag, qty, onUpdateQty, onOrder, diagnosisDosage }) => {
    const isRecommended = tag.label === 'Recommended';
    const isAlternative = tag.label === 'Alternative';

    return (
        <motion.div
            layout className={`bg-white rounded-[2rem] border-2 p-6 transition-all relative group shadow-sm ${isRecommended ? 'border-emerald-500 shadow-emerald-500/10' :
                isAlternative ? 'border-amber-400 shadow-amber-500/5' : 'border-emerald-50/50'
                }`}
        >
            <div className={`absolute -top-3 left-8 px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center shadow-lg ${tag.color}`}>
                {(isRecommended || isAlternative) && <CheckCircle2 className="w-3 h-3 mr-1.5" />} {tag.label}
            </div>
            <div className="flex justify-between items-start mb-4 pt-2">
                <div>
                    <h4 className="text-lg font-black text-emerald-950 uppercase">{med.medicine_name}</h4>
                    <p className="text-xs font-bold text-emerald-500/50 uppercase">{med.brand_name || 'Generic'}</p>
                </div>
                <div className="text-right">
                    <p className="text-xl font-black text-emerald-900">₹{med.unit_price}</p>
                    <p className="text-[10px] text-emerald-400 uppercase font-black">per {med.unit}</p>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-emerald-50/50 p-3 rounded-2xl">
                    <p className="text-[9px] font-bold text-emerald-500/40 uppercase">Dosage</p>
                    <p className="text-[11px] font-black text-emerald-800 uppercase italic truncate">{diagnosisDosage || 'Refer instructions'}</p>
                </div>
                <div className="bg-emerald-50/50 p-3 rounded-2xl">
                    <p className="text-[9px] font-bold text-emerald-500/40 uppercase">Suitability</p>
                    <p className="text-[11px] font-black text-emerald-800 uppercase italic">Paddy Crop</p>
                </div>
            </div>
            <div className="flex justify-between items-center py-6 border-t border-emerald-50/50">
                <div>
                    <p className="text-[10px] font-black text-emerald-500/40 uppercase">Estimation</p>
                    <p className="text-2xl font-black text-emerald-900">₹{Math.round(med.unit_price * qty)}</p>
                </div>
                <div className="flex items-center bg-gray-50 border border-gray-100 p-1 rounded-xl">
                    <button onClick={() => onUpdateQty(-1)} className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-emerald-600 bg-white rounded-lg shadow-sm">
                        <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-12 text-center font-black">{qty}</span>
                    <button onClick={() => onUpdateQty(1)} className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-emerald-600 bg-white rounded-lg shadow-sm">
                        <Plus className="w-4 h-4" />
                    </button>
                </div>
            </div>
            <button onClick={onOrder} className={`w-full py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${isRecommended ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700'
                }`}>
                Place Order Request
            </button>
        </motion.div>
    );
};

const WorkflowStep = ({ icon: Icon, label, completed, active }) => (
    <div className={`flex items-center space-x-4 transition-all ${active ? 'opacity-100' : completed ? 'opacity-60' : 'opacity-20'}`}>
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${active ? 'bg-emerald-500 border-emerald-400 text-black' : completed ? 'bg-emerald-950 text-emerald-400' : 'transparent'
            }`}>
            <Icon className="w-5 h-5" />
        </div>
        <p className={`text-[10px] font-black uppercase ${active ? 'text-white' : 'text-gray-400'}`}>{label}</p>
    </div>
);

export default MedicineMarketplace;
