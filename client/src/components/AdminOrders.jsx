import { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Clock,
    CheckCircle2,
    Truck,
    Package,
    Search,
    Filter,
    MoreVertical,
    MapPin,
    User,
    Calendar,
    ShoppingBag,
    CreditCard
} from 'lucide-react';

const AdminOrders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('All');

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        try {
            const res = await axios.get('http://localhost:3000/orders/all');
            setOrders(res.data);
            setLoading(false);
        } catch (err) {
            console.error("Failed to fetch orders:", err);
            setLoading(false);
        }
    };

    const updateStatus = async (orderId, newStatus) => {
        try {
            await axios.put(`http://localhost:3000/orders/status/${orderId}`, { status: newStatus });
            fetchOrders();
        } catch (err) {
            console.error("Failed to update status:", err);
        }
    };

    const filteredOrders = filter === 'All' ? orders : orders.filter(o => o.status === filter);

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-20">
            <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[2rem] shadow-sm border border-emerald-100">
                <div>
                    <h2 className="text-2xl font-black text-emerald-900">Order Management</h2>
                    <p className="text-sm text-emerald-600/60 font-medium">Manage medicine purchase requests from farmers</p>
                </div>

                <div className="flex items-center space-x-2 bg-emerald-50 p-1 rounded-xl border border-emerald-100">
                    {['All', 'Pending', 'Approved', 'Shipped', 'Delivered'].map(s => (
                        <button
                            key={s}
                            onClick={() => setFilter(s)}
                            className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${filter === s
                                ? 'bg-white text-emerald-700 shadow-sm border border-emerald-100'
                                : 'text-emerald-700/50 hover:text-emerald-700'
                                }`}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredOrders.length > 0 ? (
                    filteredOrders.map((order) => (
                        <div key={order.order_id} className="bg-white rounded-[2rem] border border-emerald-100 shadow-sm overflow-hidden flex flex-col group hover:shadow-xl hover:shadow-emerald-500/5 transition-all">
                            <div className="p-6 flex-1 space-y-4">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center space-x-3 text-emerald-500">
                                        <div className="bg-emerald-50 p-2 rounded-xl border border-emerald-100">
                                            <ShoppingBag className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500/40">Medicine Order</p>
                                            <p className="font-black text-emerald-900 uppercase">#ORD-{order.order_id}</p>
                                        </div>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${order.status === 'Pending' ? 'bg-amber-100 text-amber-700' :
                                        order.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                                            order.status === 'Shipped' ? 'bg-blue-100 text-blue-700' :
                                                'bg-gray-100 text-gray-700'
                                        }`}>
                                        {order.status}
                                    </span>
                                </div>

                                <div className="space-y-3 pt-2">
                                    <div className="flex items-center space-x-3">
                                        <User className="w-4 h-4 text-emerald-300" />
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase">Customer Name</p>
                                            <p className="text-sm font-bold text-gray-800">{order.customer_name || order.farmer_name}</p>
                                        </div>
                                    </div>
                                    {order.phone_number && (
                                        <div className="flex items-center space-x-3">
                                            <div className="w-4 h-4 text-emerald-300 flex items-center justify-center">
                                                <span className="text-[10px]">📞</span>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase">Phone Number</p>
                                                <p className="text-sm font-bold text-gray-800">{order.phone_number}</p>
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex items-start space-x-3">
                                        <MapPin className="w-4 h-4 text-emerald-300 mt-1" />
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase">Shipping Address</p>
                                            <p className="text-xs font-bold text-gray-600 leading-relaxed italic line-clamp-3">
                                                {order.address}{order.district ? `, ${order.district}` : ''}{order.state ? `, ${order.state}` : ''}{order.pincode ? ` - ${order.pincode}` : ''}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <Package className="w-4 h-4 text-emerald-300" />
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase">Medicine & Quantity</p>
                                            <p className="text-sm font-bold text-gray-800">{order.medicine_name} ({order.quantity} Units)</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <CreditCard className="w-4 h-4 text-amber-400" />
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase">Payment Mode</p>
                                            <p className="text-[11px] font-black text-amber-600 uppercase tracking-tight">{order.payment_method}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-emerald-50/50 rounded-2xl p-4 flex justify-between items-center border border-emerald-100/50">
                                    <span className="text-xs font-black text-emerald-800 uppercase tracking-widest">Total Price</span>
                                    <span className="text-xl font-black text-emerald-900">₹{order.total_price}</span>
                                </div>
                            </div>

                            <div className="bg-gray-50 p-4 border-t border-gray-100 flex gap-2">
                                {order.status === 'Pending' && (
                                    <button onClick={() => updateStatus(order.order_id, 'Approved')} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Approve</button>
                                )}
                                {order.status === 'Approved' && (
                                    <button onClick={() => updateStatus(order.order_id, 'Shipped')} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Ship Item</button>
                                )}
                                {order.status === 'Shipped' && (
                                    <button onClick={() => updateStatus(order.order_id, 'Delivered')} className="flex-1 bg-gray-800 hover:bg-black text-white py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Deliver</button>
                                )}
                                <button className="p-2 border border-gray-200 rounded-xl hover:bg-white text-gray-400 hover:text-red-500 transition-all">
                                    <MoreVertical className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full py-20 bg-emerald-50/20 border-2 border-dashed border-emerald-100 rounded-[3rem] text-center">
                        <Clock className="w-12 h-12 mx-auto text-emerald-200 mb-4" />
                        <h3 className="text-xl font-black text-emerald-900">No Orders in {filter}</h3>
                        <p className="text-emerald-600/60 font-medium">When farmers place order requests, they will appear here.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminOrders;
