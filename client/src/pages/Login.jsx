import { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Leaf,
    Droplets,
    Scan,
    FileText,
    ShieldCheck,
    Phone,
    Mail,
    MapPin,
    ChevronRight,
    User,
    Lock,
    ArrowRight,
    Cpu,
    Microscope,
    CheckCircle2,
    AlertTriangle
} from 'lucide-react';
import bgImage from '../assets/paddy_login_bg.png';
import LanguageSelector from '../components/LanguageSelector';
import API_URL from '@/api/config';

const Login = () => {
    const [formData, setFormData] = useState({ username: '', password: '' });
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Logic to bypass authentication for demo purposes if backend fails, 
            // or use real backend if available.
            // For now, keeping original logic structure but adding a fallback for demo feeling if needed.

            const res = await axios.post(`${API_URL}/auth/login`, {
                ...formData
            });

            const user = res.data.user;
            const token = res.data.token;
            localStorage.setItem('user', JSON.stringify(user));
            localStorage.setItem('token', token);

            if (user.role === 'admin') {
                navigate('/dashboard?role=admin');
            } else {
                navigate('/dashboard');
            }

        } catch (err) {
            // Check if it's a "Bypass" scenario requested by user previously, 
            // but for now strictly following error handling.
            setError(err.response?.data?.error || 'Login failed. Please verify credentials.');
        } finally {
            setLoading(false);
        }
    };

    // Animation Variants
    const fadeInUp = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    };

    return (
        <div className="min-h-screen font-sans text-gray-800 bg-white overflow-x-hidden">

            {/* HER HERO SECTION */}
            <div className="relative w-full min-h-screen flex flex-col justify-center items-center lg:items-start p-6 lg:p-20">

                {/* Background Image with Overlay */}
                <div className="absolute inset-0 z-0">
                    <img
                        src={bgImage}
                        alt="Paddy Field"
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/90 to-emerald-800/40 mix-blend-multiply"></div>
                    <div className="absolute inset-0 bg-black/20"></div>
                </div>

                {/* Navbar / Top Right */}
                <div className="absolute top-6 right-6 z-20">
                    <LanguageSelector />
                </div>

                <div className="container mx-auto z-10 grid lg:grid-cols-2 gap-12 items-center">

                    {/* Left Side: Brand & Value (About Paddy Guard) */}
                    <div className="text-white space-y-8 max-w-2xl">
                        <motion.div
                            initial="hidden"
                            animate="visible"
                            variants={fadeInUp}
                            transition={{ duration: 0.6 }}
                        >
                            <div className="flex items-center space-x-3 mb-4">
                                <div className="p-2 bg-emerald-500 rounded-lg">
                                    <Leaf className="w-8 h-8 text-white" />
                                </div>
                                <span className="text-xl font-bold tracking-wider uppercase text-emerald-300">Paddy Guard</span>
                            </div>
                            <h1 className="text-5xl lg:text-7xl font-bold leading-tight">
                                Advanced AI for <br />
                                <span className="text-emerald-400">Rice Cultivation</span>
                            </h1>
                        </motion.div>

                        <motion.div
                            initial="hidden"
                            animate="visible"
                            variants={fadeInUp}
                            transition={{ duration: 0.6, delay: 0.2 }}
                            className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/10"
                        >
                            <h3 className="text-2xl font-semibold mb-3 text-emerald-100">About Paddy Guard</h3>
                            <p className="text-lg text-emerald-50 leading-relaxed">
                                Paddy Guard is an AI-powered drone monitoring platform designed exclusively for paddy fields.
                                It helps farmers detect crop diseases early, reduce losses, and improve yield through smart analysis and detailed reports.
                            </p>
                        </motion.div>

                        <motion.div
                            initial="hidden"
                            animate="visible"
                            variants={fadeInUp}
                            transition={{ duration: 0.6, delay: 0.4 }}
                            className="flex space-x-6"
                        >
                            <div className="flex items-center space-x-2">
                                <ShieldCheck className="w-6 h-6 text-emerald-400" />
                                <span className="font-medium">Secure Data</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Scan className="w-6 h-6 text-emerald-400" />
                                <span className="font-medium">Drone Precision</span>
                            </div>
                        </motion.div>
                    </div>

                    {/* Right Side: Login Card */}
                    <motion.div
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8 }}
                        className="w-full max-w-md mx-auto"
                    >
                        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                            {/* Glass Reflection */}
                            <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-400/20 rounded-full blur-3xl"></div>

                            <h2 className="text-3xl font-bold text-white mb-2">Welcome Back</h2>
                            <p className="text-emerald-100 mb-8">Access your field reports</p>

                            {error && (
                                <div className="mb-6 p-3 bg-red-500/80 backdrop-blur-sm text-white rounded-lg text-sm flex items-center">
                                    <span className="mr-2">⚠️</span> {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div className="relative group">
                                    <User className="absolute left-4 top-3.5 w-5 h-5 text-emerald-200 group-focus-within:text-emerald-400 transition-colors" />
                                    <input
                                        name="username"
                                        type="text"
                                        placeholder="Username / Phone"
                                        className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder-emerald-200/50 focus:outline-none focus:bg-black/40 focus:border-emerald-500/50 transition-all"
                                        value={formData.username}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>

                                <div className="relative group">
                                    <Lock className="absolute left-4 top-3.5 w-5 h-5 text-emerald-200 group-focus-within:text-emerald-400 transition-colors" />
                                    <input
                                        name="password"
                                        type="password"
                                        placeholder="Password"
                                        className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder-emerald-200/50 focus:outline-none focus:bg-black/40 focus:border-emerald-500/50 transition-all"
                                        value={formData.password}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>

                                <div className="flex justify-end">
                                    <Link to="#" className="text-sm text-emerald-300 hover:text-emerald-200 transition-colors">Forgot password?</Link>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-emerald-900/20 transform transition active:scale-95 flex justify-center items-center"
                                >
                                    {loading ? 'Accessing...' : 'Login to Dashboard'}
                                    {!loading && <ChevronRight className="w-5 h-5 ml-2" />}
                                </button>
                            </form>

                            <div className="mt-8 pt-6 border-t border-white/10 text-center">
                                <p className="text-emerald-100 text-sm">
                                    New Farmer? {' '}
                                    <Link to="/signup" className="text-white font-bold hover:text-emerald-300 transition-colors underline decoration-emerald-400 decoration-2 underline-offset-4">
                                        Register Field Account
                                    </Link>
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Scroll Indicator */}
                <motion.div
                    animate={{ y: [0, 10, 0] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-white/50 flex flex-col items-center"
                >
                    <span className="text-xs uppercase tracking-widest mb-2">Explore Platform</span>
                    <div className="w-0.5 h-12 bg-gradient-to-b from-white to-transparent"></div>
                </motion.div>
            </div>

            {/* SECTIONS Container */}
            <div className="relative bg-[#f8fffa]">

                {/* TRUST INDICATORS - Credibility Layer */}
                <section className="bg-emerald-950 py-10 border-b border-emerald-900">
                    <div className="container mx-auto px-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                            {[
                                { icon: Cpu, label: "AI-Powered Detection" },
                                { icon: Scan, label: "Drone-Based Survey" },
                                { icon: ShieldCheck, label: "Secure Data Handling" },
                                { icon: Microscope, label: "Research-Backed" }
                            ].map((item, idx) => (
                                <div key={idx} className="flex flex-col items-center text-center space-y-3 group hover:transform hover:scale-105 transition-transform duration-300">
                                    <div className="p-3 bg-emerald-900/50 rounded-full text-emerald-400 border border-emerald-800 group-hover:border-emerald-500 transition-colors">
                                        <item.icon className="w-5 h-5" />
                                    </div>
                                    <span className="text-emerald-50/90 font-medium text-sm">{item.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* 1. PLATFORM ACCESS CLARITY */}
                {/* 1. PLATFORM ACCESS CLARITY */}
                <section className="py-24 px-6 container mx-auto bg-gradient-to-b from-white to-emerald-50/50">
                    <div className="text-center mb-16">
                        <span className="text-emerald-600 font-bold tracking-wider uppercase text-sm mb-2 block">For Everyone</span>
                        <h2 className="text-4xl lg:text-5xl font-bold text-emerald-950 mb-4">Dedicated Paddy Solutions</h2>
                        <p className="text-gray-500 max-w-2xl mx-auto text-lg">Tailored access levels designed to streamline the workflow from field to report.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                        {/* Farmers */}
                        <div className="bg-white p-8 rounded-3xl shadow-[0_20px_50px_rgba(8,_112,_184,_0.07)] border border-emerald-100/50 hover:-translate-y-2 transition-transform duration-300 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-100 rounded-bl-full opacity-50 group-hover:scale-110 transition-transform"></div>
                            <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mb-6 text-emerald-600 shadow-sm relative z-10">
                                <User className="w-8 h-8" />
                            </div>
                            <h3 className="text-2xl font-bold text-emerald-950 mb-3 playfair relative z-10">Farmers</h3>
                            <p className="text-gray-500 mb-8 leading-relaxed relative z-10">
                                Directly register and log in to view analysis, receive treatment plans, and monitor crop health costs.
                            </p>
                            <ul className="space-y-3 mb-8 relative z-10">
                                <li className="flex items-center text-gray-600 font-medium"><Leaf className="w-5 h-5 mr-3 text-emerald-500" /> View Reports</li>
                                <li className="flex items-center text-gray-600 font-medium"><Leaf className="w-5 h-5 mr-3 text-emerald-500" /> Get Treatments</li>
                            </ul>
                            <Link to="/signup" className="inline-flex items-center text-white bg-emerald-500 hover:bg-emerald-600 px-6 py-3 rounded-xl font-semibold transition-all shadow-lg shadow-emerald-200">
                                Register Now <ArrowRight className="w-4 h-4 ml-2" />
                            </Link>
                        </div>

                        {/* Drone Service */}
                        <div className="bg-gradient-to-br from-emerald-900 to-emerald-800 p-8 rounded-3xl shadow-2xl hover:-translate-y-2 transition-transform duration-300 text-white relative overflow-hidden ring-4 ring-emerald-50">
                            {/* Decorative circles */}
                            <div className="absolute -right-10 -top-10 w-40 h-40 bg-emerald-500/20 rounded-full blur-2xl"></div>
                            <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-teal-500/20 rounded-full blur-2xl"></div>

                            <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6 text-emerald-300 relative z-10 border border-white/10">
                                <Scan className="w-8 h-8" />
                            </div>
                            <h3 className="text-2xl font-bold mb-3 relative z-10">Drone Analysis</h3>
                            <p className="text-emerald-100/80 mb-8 leading-relaxed relative z-10">
                                Professional aerial surveying service. We scan your large-scale paddy fields and deliver insights directly to your dashboard.
                            </p>
                            <div className="relative z-10 mt-auto">
                                <button className="w-full py-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl font-medium hover:bg-white/20 transition-colors flex items-center justify-center">
                                    <span className="mr-2">Global Service</span>
                                    <Scan className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Admin */}
                        <div className="bg-white p-8 rounded-3xl shadow-[0_20px_50px_rgba(8,_112,_184,_0.07)] border border-gray-100 hover:-translate-y-2 transition-transform duration-300 group">
                            <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-6 text-gray-400 group-hover:bg-gray-100 transition-colors">
                                <ShieldCheck className="w-8 h-8" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-3">Admin Access</h3>
                            <p className="text-gray-500 mb-8 leading-relaxed">
                                Restricted internal access for managing drone surveys, verifying AI reports, and pushing data to farmers.
                            </p>
                            <div className="flex items-center text-xs font-semibold text-gray-400 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <Lock className="w-4 h-4 mr-2" /> Internal Network Only
                            </div>
                        </div>
                    </div>
                </section>

                {/* 2. HOW IT WORKS (Visual Story) */}
                {/* 3. WHY DRONE & SAMPLE REPORT (Value & Proof) */}
                <section className="py-24 bg-white relative overflow-hidden border-t border-gray-100">
                    <div className="container mx-auto px-6 relative z-10">
                        <div className="grid lg:grid-cols-2 gap-16 items-center">
                            {/* Left: Why Drone */}
                            <div>
                                <span className="text-emerald-600 font-bold tracking-wider uppercase text-sm mb-2 block">Value Proposition</span>
                                <h2 className="text-4xl font-bold text-gray-900 mb-6">Why Drone Analysis?</h2>
                                <div className="space-y-5">
                                    {[
                                        "Covers large paddy fields (30–50+ acres) in minutes",
                                        "Detects early-stage diseases invisible to the naked eye",
                                        "Reduces unnecessary chemical usage & saves cost",
                                        "Provides precise yield estimation and protection"
                                    ].map((point, idx) => (
                                        <div key={idx} className="flex items-start group">
                                            <div className="mt-1 mr-4 bg-emerald-100 p-1 rounded-full group-hover:bg-emerald-200 transition-colors">
                                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                            </div>
                                            <p className="text-gray-700 text-lg leading-relaxed">{point}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Right: Sample Report Card */}
                            <div className="relative">
                                {/* Decorative elements */}
                                <div className="absolute inset-0 bg-emerald-900/5 rounded-[40px] transform rotate-3 scale-105"></div>
                                <div className="absolute -top-10 -right-10 w-32 h-32 bg-yellow-400/10 rounded-full blur-2xl"></div>

                                <div className="relative bg-white border border-gray-100 rounded-[30px] p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)]">
                                    <div className="border-b border-gray-100 pb-5 mb-6 flex justify-between items-center">
                                        <div>
                                            <h3 className="font-bold text-gray-900 text-lg">Sample Analysis Report</h3>
                                            <p className="text-gray-400 text-xs mt-1">Field ID: #284-F • Guntur Region</p>
                                        </div>
                                        <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full uppercase tracking-wide">Processed</span>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex items-start space-x-4">
                                            <div className="bg-red-100 p-2 rounded-lg text-red-600">
                                                <AlertTriangle className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500 font-semibold uppercase">Disease Detected</p>
                                                <p className="text-gray-900 font-bold text-lg">Rice Blast (Magnaporthe)</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-4 bg-gray-50 rounded-xl">
                                                <p className="text-xs text-gray-500 mb-1">Severity Level</p>
                                                <div className="flex items-center space-x-2">
                                                    <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                                                        <div className="h-full bg-red-500 w-[75%] rounded-full"></div>
                                                    </div>
                                                    <span className="text-xs font-bold text-red-600">High</span>
                                                </div>
                                            </div>
                                            <div className="p-4 bg-gray-50 rounded-xl">
                                                <p className="text-xs text-gray-500 mb-1">Trigger Action</p>
                                                <p className="text-sm font-bold text-gray-900">Treatment Plan A</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between pt-2">
                                            <div>
                                                <p className="text-xs text-gray-500">Est. Treatment Cost</p>
                                                <p className="text-gray-900 font-bold text-xl">₹4,200 <span className="text-gray-400 text-sm font-normal">/ Acre</span></p>
                                            </div>
                                            <button className="px-6 py-3 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-black transition shadow-lg flex items-center">
                                                <FileText className="w-4 h-4 mr-2" /> View Report
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 4. PADDY DISEASES WE DETECT */}
                <section className="py-20 bg-emerald-50/30 border-t border-emerald-100">
                    <div className="container mx-auto px-6 text-center">
                        <span className="text-emerald-600 font-bold tracking-wider uppercase text-sm mb-2 block">Our Capabilities</span>
                        <h2 className="text-3xl font-bold text-emerald-950 mb-10">Paddy Diseases We Detect</h2>

                        <div className="flex flex-wrap justify-center gap-4 max-w-4xl mx-auto">
                            {[
                                { name: "Blast", sev: "High" },
                                { name: "Brown Spot", sev: "Medium" },
                                { name: "Hispa", sev: "Medium" },
                                { name: "Tungro", sev: "High" },
                                { name: "Leaf Streak", sev: "Low" },
                                { name: "Sheath Blight", sev: "High" },
                                { name: "False Smut", sev: "Medium" }
                            ].map((d, idx) => (
                                <div key={idx} className="bg-white pl-4 pr-6 py-3 rounded-full shadow-sm border border-emerald-100 flex items-center space-x-3 hover:shadow-md transition-shadow cursor-default">
                                    <div className={`w-3 h-3 rounded-full ${d.sev === 'High' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]' : d.sev === 'Medium' ? 'bg-amber-400' : 'bg-emerald-500'}`}></div>
                                    <span className="font-semibold text-gray-700">{d.name}</span>
                                </div>
                            ))}
                        </div>
                        <p className="mt-8 text-sm text-gray-500">
                            <span className="inline-flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500"></div> High Severity</span>
                            <span className="inline-flex items-center gap-2 ml-4"><div className="w-2 h-2 rounded-full bg-amber-400"></div> Moderate</span>
                            <span className="inline-flex items-center gap-2 ml-4"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Monitor</span>
                        </p>
                    </div>
                </section>

                {/* 2. HOW IT WORKS (Visual Story) */}
                <section className="py-24 bg-gradient-to-b from-emerald-50/50 to-white relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-emerald-200 to-transparent"></div>

                    <div className="container mx-auto px-6 relative z-10">
                        <div className="text-center mb-20">
                            <span className="text-emerald-600 font-bold tracking-wider uppercase text-sm mb-2 block">Workflow</span>
                            <h2 className="text-4xl lg:text-5xl font-bold text-emerald-950">How Paddy Guard Works</h2>
                        </div>

                        <div className="flex flex-col md:flex-row justify-center items-start relative max-w-5xl mx-auto">
                            {/* Connecting Line */}
                            <div className="hidden md:block absolute top-10 left-16 right-16 h-1 bg-gradient-to-r from-emerald-100 via-emerald-200 to-emerald-100 rounded-full -z-10"></div>

                            {[
                                { icon: Scan, title: "Drone Scan", desc: "Aerial field survey captures high-res imagery", color: "bg-blue-500" },
                                { icon: Droplets, title: "AI Analysis", desc: "Deep learning model detects diseases & moisture", color: "bg-emerald-500" },
                                { icon: FileText, title: "Report Gen", desc: "Detailed insights & treatment plans generated", color: "bg-amber-500" },
                                { icon: Leaf, title: "Farmer Action", desc: "Apply targeted treatment to improve yield", color: "bg-green-600" }
                            ].map((step, idx) => (
                                <div key={idx} className="flex-1 flex flex-col items-center text-center px-4 group">
                                    <div className={`w-20 h-20 bg-white border-4 border-white shadow-xl shadow-emerald-100 rounded-2xl flex items-center justify-center mb-8 z-10 transform group-hover:-translate-y-2 transition-transform duration-300 ring-4 ring-emerald-50`}>
                                        <step.icon className="w-8 h-8 text-emerald-600" />
                                    </div>
                                    <h4 className="text-xl font-bold text-emerald-950 mb-3">{step.title}</h4>
                                    <p className="text-gray-500 text-sm leading-relaxed max-w-[200px]">{step.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* 3. CONTACT & ACTION */}
                <section className="py-20 bg-emerald-900 text-white relative overflow-hidden">
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>

                    <div className="container mx-auto px-6 relative z-10">
                        <div className="grid md:grid-cols-2 gap-16 items-center">
                            <div>
                                <h2 className="text-3xl lg:text-4xl font-bold mb-6">Expert Support for Your Fields</h2>
                                <p className="text-emerald-200 mb-8 text-lg">
                                    Our team of agricultural technologists is ready to assist you.
                                    Whether you need to schedule a drone survey or need help utilizing the dashboard.
                                </p>
                                <div className="space-y-4">
                                    <div className="flex items-center space-x-4">
                                        <Mail className="w-6 h-6 text-emerald-400" />
                                        <span>support@paddyguard.ai</span>
                                    </div>
                                    <div className="flex items-center space-x-4">
                                        <Phone className="w-6 h-6 text-emerald-400" />
                                        <span>+91 98765 43210 (Available on request)</span>
                                    </div>
                                    <div className="flex items-center space-x-4">
                                        <MapPin className="w-6 h-6 text-emerald-400" />
                                        <span>Andhra Pradesh & Telangana Paddy Regions</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-emerald-800 p-8 rounded-2xl border border-emerald-700">
                                <h3 className="text-2xl font-bold mb-6">Get Started Today</h3>
                                <div className="space-y-4">
                                    <div className="p-4 bg-emerald-900/50 rounded-lg flex justify-between items-center group cursor-pointer hover:bg-emerald-900 transition">
                                        <div>
                                            <p className="font-semibold text-emerald-100">New Farmer?</p>
                                            <p className="text-xs text-emerald-400">Register your field now</p>
                                        </div>
                                        <Link to="/signup" className="text-white group-hover:translate-x-1 transition-transform">
                                            <ArrowRight className="w-5 h-5" />
                                        </Link>
                                    </div>
                                    <div className="p-4 bg-emerald-900/50 rounded-lg flex justify-between items-center group cursor-pointer hover:bg-emerald-900 transition">
                                        <div>
                                            <p className="font-semibold text-emerald-100">Need a Survey?</p>
                                            <p className="text-xs text-emerald-400">Contact Sales Team</p>
                                        </div>
                                        <span className="text-white group-hover:translate-x-1 transition-transform">
                                            <ArrowRight className="w-5 h-5" />
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* FOOTER */}
                <footer className="bg-gray-900 text-gray-400 py-12 border-t border-gray-800">
                    <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center">
                        <div className="flex items-center space-x-2 mb-4 md:mb-0">
                            <Leaf className="w-6 h-6 text-emerald-600" />
                            <span className="text-lg font-bold text-gray-200">Paddy Guard</span>
                        </div>
                        <div className="flex space-x-6 text-sm">
                            <span className="hover:text-white cursor-pointer">Privacy Policy</span>
                            <span className="hover:text-white cursor-pointer">Terms of Use</span>
                            <span>© 2026 Paddy Guard</span>
                        </div>
                    </div>
                </footer>

            </div>
        </div>
    );
};

export default Login;
