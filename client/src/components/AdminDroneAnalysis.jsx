import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Wifi,
    Battery,
    Thermometer,
    Activity,
    Zap,
    Video,
    Settings,
    Maximize,
    Crosshair,
    Navigation2,
    CloudSun,
    Layers,
    Wind,
    Droplets,
    LocateFixed,
    CircleStop,
    Cpu,
    Globe,
    Calendar,
    MousePointer2,
    ArrowRight,
    Scan,
    ShieldCheck,
    CheckCircle2,
    Clock
} from 'lucide-react';

const AdminDroneAnalysis = () => {
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [activeTab, setActiveTab] = useState('Controller');
    const [currentTime, setCurrentTime] = useState(new Date());

    // Drone Telemetry State (Mock)
    const [telemetry, setTelemetry] = useState({
        battery: 0,
        temp: 0,
        height: 0,
        speed: 0,
        area: 0,
        altitude: 0,
        signal: 0
    });

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const handleConnect = () => {
        setIsConnecting(true);
        setTimeout(() => {
            setIsConnecting(false);
            setIsConnected(true);
            // Animate telemetry
            setTelemetry({
                battery: 88,
                temp: 34,
                height: 12.5,
                speed: 18.2,
                area: 42.5,
                altitude: 15,
                signal: 4
            });
        }, 2000);
    };

    const handleDisconnect = () => {
        setIsConnected(false);
        setTelemetry({ battery: 0, temp: 0, height: 0, speed: 0, area: 0, altitude: 0, signal: 0 });
    };

    const formatTime = (date) => {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    };

    return (
        <div className="w-full h-[calc(100vh-120px)] bg-[#05110d] rounded-3xl overflow-hidden relative font-sans text-gray-300 selection:bg-emerald-500/30 border border-emerald-900/20 shadow-2xl">

            {/* 1. TOP NAV BAR */}
            <header className="h-16 bg-[#0a1f18]/80 backdrop-blur-md border-b border-emerald-900/40 flex items-center justify-between px-6 z-30 relative">
                <div className="flex items-center space-x-6">
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.4)]">
                                <Zap className="w-5 h-5 text-black" />
                            </div>
                            <span className="text-xl font-black tracking-tighter text-white uppercase italic">Paddy Guard</span>
                        </div>
                        {/* Status Badge */}
                        <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.1em] border ${isConnected ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                            {isConnected ? 'LIVE MONITORING' : 'Standby Mode – Waiting for Drone'}
                        </div>
                    </div>

                    <nav className="flex items-center space-x-1 ml-4">
                        {['Controller', 'Overview', 'Routes', 'Map View'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${activeTab === tab
                                    ? 'bg-emerald-500 text-[#05110d] shadow-lg shadow-emerald-500/20'
                                    : 'text-emerald-500/50 hover:text-emerald-400'
                                    }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="flex items-center space-x-8">
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] font-bold text-emerald-500/50 uppercase tracking-widest">Field Size</span>
                        <span className="text-sm font-mono text-emerald-400">{isConnected ? `${telemetry.area} km²` : '-- km²'}</span>
                    </div>

                    <div className="h-8 w-px bg-emerald-900/30"></div>

                    <div className="flex items-center space-x-3 bg-black/30 px-3 py-1.5 rounded-xl border border-emerald-900/20">
                        <CloudSun className="w-4 h-4 text-emerald-400" />
                        <div className="text-left">
                            <span className="text-[10px] block leading-none font-bold text-emerald-500/40">GUNTUR</span>
                            <span className="text-xs font-mono text-emerald-200">28°C / 65% RH</span>
                        </div>
                    </div>

                    <div className="text-sm font-mono text-emerald-500/70 border-l border-emerald-900/30 pl-6 h-8 flex items-center">
                        {formatTime(currentTime)}
                    </div>
                </div>
            </header>

            {/* 2. MAIN HUB AREA */}
            <div className="relative w-full h-full flex flex-col pt-16">

                {/* Visual Workflow Hint Strip */}
                <div className="absolute top-[72px] left-1/2 -translate-x-1/2 z-20 flex items-center space-x-4 bg-black/40 backdrop-blur-xl px-6 py-2 rounded-full border border-emerald-900/30 text-[10px] font-bold tracking-widest text-emerald-500/60 transition-all duration-500">
                    <span className={isConnected ? 'text-emerald-400' : ''}>LIVE FEED</span>
                    <ArrowRight className="w-3 h-3 opacity-30" />
                    <span>AI ANALYSIS</span>
                    <ArrowRight className="w-3 h-3 opacity-30" />
                    <span>DISEASE DETECTION</span>
                    <ArrowRight className="w-3 h-3 opacity-30" />
                    <span>REPORT GENERATION</span>
                </div>

                {/* Main Content Split */}
                <div className="flex-1 flex overflow-hidden">

                    {/* LEFT OVERLAY CONTROLS */}
                    <aside className={`w-20 z-20 flex flex-col items-center justify-center space-y-4 transition-all duration-700 ${!isConnected ? 'opacity-40 grayscale translate-x-[-20px]' : ''}`}>
                        <NavControl icon={Layers} label="MULTISPECTRAL" />
                        <div className="flex flex-col space-y-2 bg-black/40 p-2 rounded-2xl border border-white/5 backdrop-blur-md">
                            {['R', 'G', 'B', 'Y'].map(c => (
                                <button key={c} className={`w-10 h-10 rounded-xl text-xs font-bold flex items-center justify-center transition-all ${isConnected ? 'hover:bg-emerald-500 hover:text-black border border-emerald-500/30 text-emerald-500' : 'text-gray-600 border border-transparent'}`}>
                                    {c}
                                </button>
                            ))}
                        </div>
                        <NavControl icon={LocateFixed} label="HEIGHT" active={isConnected} />
                        <div className="h-32 w-10 bg-black/40 rounded-xl border border-white/5 backdrop-blur-md relative overflow-hidden flex flex-col items-center justify-end p-1 mt-4">
                            <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: isConnected ? '60%' : 0 }}
                                className="w-full bg-emerald-500 rounded-lg shadow-lg shadow-emerald-500/20"
                            />
                            <span className="absolute bottom-1 text-[8px] font-bold text-black uppercase">ELEV</span>
                        </div>
                    </aside>

                    {/* CENTER PANEL - LIVE FEED / STANDBY */}
                    <div className="flex-1 relative group bg-black">
                        <AnimatePresence mode="wait">
                            {!isConnected ? (
                                <motion.div
                                    key="standby"
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    className="w-full h-full relative flex items-center justify-center overflow-hidden"
                                >
                                    {/* Blurred Aerial Background */}
                                    <div className="absolute inset-0">
                                        <img
                                            src="https://images.unsplash.com/photo-1594291882068-1af1066c0d6e?q=80&w=2000&auto=format&fit=crop"
                                            className="w-full h-full object-cover blur-sm opacity-20 grayscale"
                                            alt="Paddy Field Standby"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-b from-[#05110d]/90 via-transparent to-[#05110d]"></div>
                                    </div>

                                    {/* Animated Grid & Scan Pulse */}
                                    <div className="absolute inset-0 z-0 pointer-events-none opacity-20">
                                        <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.1)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
                                        <motion.div
                                            animate={{ opacity: [0.1, 0.4, 0.1], scale: [1, 1.2, 1] }}
                                            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full border border-emerald-500/20"
                                        />
                                    </div>

                                    <div className="text-center z-10 space-y-12 w-full max-w-4xl px-8">
                                        <div className="space-y-4">
                                            <div className="relative inline-block mb-4">
                                                <div className="absolute inset-0 bg-emerald-500/10 blur-3xl rounded-full"></div>
                                                <div className="w-20 h-20 rounded-3xl bg-emerald-950/50 border border-emerald-500/20 flex items-center justify-center text-4xl mb-4 relative z-10 mx-auto">
                                                    🛸
                                                </div>
                                            </div>
                                            <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic">Drone Not Connected</h3>
                                            <p className="text-emerald-500/60 max-w-sm mx-auto text-sm font-medium">AI Systems Standing By – Secure Uplink Required for Multispectral Analysis</p>
                                        </div>

                                        {/* Inactive Preview Cards */}
                                        <div className="grid grid-cols-4 gap-4">
                                            {[
                                                { icon: Calendar, label: "Last Survey", value: "2 days ago" },
                                                { icon: Activity, label: "Paddy Health Index", value: "Standing By" },
                                                { icon: Globe, label: "Scan Area", value: "0.23 ha" },
                                                { icon: Clock, label: "Est. Time", value: "--:--" }
                                            ].map((card, idx) => (
                                                <div key={idx} className="bg-black/40 backdrop-blur-md border border-emerald-900/30 p-4 rounded-2xl text-left space-y-3 opacity-60">
                                                    <card.icon className="w-5 h-5 text-emerald-500/40" />
                                                    <div>
                                                        <p className="text-[10px] font-bold text-emerald-500/40 uppercase tracking-widest leading-none mb-1">{card.label}</p>
                                                        <p className="text-sm font-mono text-emerald-100/30 uppercase">{card.value}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="flex justify-center pt-8">
                                            <button
                                                onClick={handleConnect}
                                                disabled={isConnecting}
                                                className="relative group px-12 py-5 bg-emerald-500 hover:bg-emerald-400 text-black font-black rounded-2xl transition-all active:scale-95 disabled:opacity-50 overflow-hidden"
                                            >
                                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                                                <span className="relative flex items-center justify-center text-xs tracking-widest uppercase">
                                                    {isConnecting ? (
                                                        <><Loader className="w-4 h-4 mr-3 animate-spin" /> ESTABLISHING LINK...</>
                                                    ) : (
                                                        <><Wifi className="w-4 h-4 mr-3" /> INITIALIZE DRONE CONNECTION</>
                                                    )}
                                                </span>
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="live"
                                    initial={{ opacity: 0, scale: 1.05 }} animate={{ opacity: 1, scale: 1 }}
                                    className="w-full h-full relative"
                                >
                                    <img
                                        src="https://images.unsplash.com/photo-1594291882068-1af1066c0d6e?q=80&w=2000&auto=format&fit=crop"
                                        className="w-full h-full object-cover"
                                        alt="Live Feed"
                                    />

                                    {/* HUD OVERLAYS */}
                                    <div className="absolute inset-0 pointer-events-none">
                                        <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.05)_1px,transparent_1px)] bg-[size:100px_100px]"></div>
                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
                                            <div className="w-64 h-64 border border-emerald-500/20 rounded-full flex items-center justify-center relative">
                                                <div className="w-16 h-16 border border-emerald-400/50 rounded-full"></div>
                                            </div>
                                            <div className="absolute w-12 h-0.5 bg-emerald-500/50"></div>
                                            <div className="absolute h-12 w-0.5 bg-emerald-500/50"></div>
                                            <Crosshair className="absolute w-6 h-6 text-emerald-400 opacity-80" />
                                        </div>

                                        <div className="absolute top-24 left-8 flex items-center space-x-6 text-[10px] font-black tracking-[0.2em] text-emerald-400">
                                            <div className="flex items-center bg-black/60 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                                                <div className="w-1.5 h-1.5 bg-red-500 rounded-full mr-2 animate-pulse"></div>
                                                REC 04:12:08
                                            </div>
                                            <div>4K / 60 FPS</div>
                                            <div>HDR ACTIVE</div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* RIGHT CONTROL PANEL */}
                    <aside className="w-80 flex flex-col p-6 space-y-6 z-20">

                        {/* System Readiness (Informative Section) */}
                        <div className={`bg-black/40 p-6 rounded-[2rem] border transition-all duration-500 backdrop-blur-xl space-y-4 ${isConnected ? 'border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]' : 'border-white/5 opacity-80'}`}>
                            <h3 className="text-[10px] font-bold text-emerald-500/60 uppercase tracking-widest">System Readiness</h3>
                            <div className="space-y-3">
                                <ReadinessItem icon={Cpu} label="AI Model Loaded" status="Ready" active={true} />
                                <ReadinessItem icon={Video} label="Camera Link" status={isConnected ? "Healthy" : "Waiting"} active={isConnected} />
                                <ReadinessItem icon={Navigation2} label="GPS Array" status={isConnected ? "Locked" : "Waiting"} active={isConnected} />
                                <ReadinessItem icon={Layers} label="Multispectral" status={isConnected ? "Linked" : "Waiting"} active={isConnected} />
                            </div>
                        </div>

                        {/* System Diagnostics */}
                        <div className={`bg-black/40 p-6 rounded-[2rem] border transition-all duration-500 backdrop-blur-xl flex-1 space-y-6 overflow-hidden ${isConnected ? 'border-emerald-500/20 opacity-100' : 'border-white/5 opacity-40 grayscale'}`}>
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-[10px] font-bold text-emerald-500/60 uppercase tracking-widest">Drone Hardware</h3>
                                <Settings className="w-3 h-3 text-emerald-500/30" />
                            </div>

                            <div className="flex items-center space-x-4">
                                <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-3xl">🛸</div>
                                <div>
                                    <p className="text-sm font-bold text-white uppercase italic tracking-tighter">AGRAS T40</p>
                                    <p className="text-[10px] text-emerald-500/50 uppercase font-black tracking-widest">Uplink Ready</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <StatBox icon={Battery} label="Power" value={isConnected ? `${telemetry.battery}%` : '0%'} color={telemetry.battery < 20 ? 'text-red-400' : 'text-emerald-400'} />
                                <StatBox icon={Thermometer} label="Core Temp" value={isConnected ? `${telemetry.temp}°C` : '--°C'} />
                            </div>

                            {/* Sliders */}
                            <div className="space-y-4 pt-4 border-t border-emerald-900/20">
                                <DiagnosticSlider label="Altitude Limiter" value={isConnected ? "30m" : "--"} percent={isConnected ? 60 : 0} />
                                <DiagnosticSlider label="Spray Pressure" value={isConnected ? "Balanced" : "--"} percent={isConnected ? 45 : 0} />
                            </div>

                            {/* Imaging Matrix */}
                            <div className="pt-4 space-y-4 border-t border-emerald-900/20">
                                <div className="flex justify-between items-center text-[10px] font-bold text-emerald-500/60 uppercase tracking-widest">
                                    <span>Paddy Health Index (PHX)</span>
                                    <span className="text-emerald-400 font-mono italic">0.82 OPTIMAL</span>
                                </div>
                                <div className="h-1 bg-white/5 rounded-full relative overflow-hidden">
                                    <motion.div animate={{ width: isConnected ? '82%' : 0 }} className="absolute h-full bg-gradient-to-r from-emerald-600 to-lime-400" />
                                </div>
                            </div>
                        </div>

                        {isConnected && (
                            <button
                                onClick={handleDisconnect}
                                className="w-full py-4 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-2xl text-red-500 text-xs font-black uppercase tracking-[0.2em] transition-all"
                            >
                                Emergency Disconnect
                            </button>
                        )}
                    </aside>
                </div>

                {/* BOTTOM TELEMETRY STRIP */}
                <footer className={`h-24 bg-[#0a1f18]/90 backdrop-blur-2xl border-t border-emerald-900/30 flex px-8 space-x-6 items-center z-30 transition-all duration-700 ${!isConnected ? 'opacity-40 grayscale translate-y-[20px]' : ''}`}>
                    {/* Mini Map Preview */}
                    <div className="w-56 h-16 bg-black/60 rounded-xl border border-white/10 p-1 backdrop-blur-md overflow-hidden relative group">
                        <img
                            src="https://images.unsplash.com/photo-1594291882068-1af1066c0d6e?q=80&w=400&auto=format&fit=crop"
                            className="w-full h-full object-cover rounded-lg opacity-40 grayscale group-hover:grayscale-0 transition-all duration-700"
                        />
                        <div className="absolute inset-x-2 inset-y-2 border border-emerald-400/20 rounded-md pointer-events-none flex items-center justify-center">
                            <Navigation2 className="w-4 h-4 text-emerald-400 -rotate-45" />
                        </div>
                    </div>

                    <div className="flex-1 flex justify-between px-10">
                        <TelemetryItem label="Horizontal Vel." value={isConnected ? `${telemetry.speed} km/h` : '0.0'} />
                        <div className="w-px h-10 bg-emerald-950/50"></div>
                        <TelemetryItem label="Altitude MSL" value={isConnected ? `${telemetry.height} m` : '0.0'} />
                        <div className="w-px h-10 bg-emerald-950/50"></div>
                        <TelemetryItem label="Mission Clock" value={isConnected ? '12:45' : '--:--'} />
                        <div className="w-px h-10 bg-emerald-950/50"></div>
                        <TelemetryItem label="Uplink Strength" value={isConnected ? 'OPTIMAL' : 'OFFLINE'} color={isConnected ? 'text-emerald-400' : 'text-emerald-900'} />
                    </div>

                    {/* Controls Pad Mock */}
                    <div className="w-48 flex items-center justify-center space-x-4">
                        <div className="w-10 h-10 rounded-full bg-emerald-950/50 border border-emerald-500/10 flex items-center justify-center">
                            <div className="w-6 h-6 rounded-full border border-emerald-500/30"></div>
                        </div>
                        <CircleStop className={`w-8 h-8 ${isConnected ? 'text-red-500 hover:scale-110 cursor-pointer' : 'text-emerald-950'} transition-all`} />
                    </div>
                </footer>
            </div>

            {/* AI Scan Sweep */}
            {isConnected && (
                <motion.div
                    initial={{ top: '0%' }}
                    animate={{ top: '100%' }}
                    transition={{ repeat: Infinity, duration: 4, ease: 'linear' }}
                    className="absolute left-0 w-full h-[2px] bg-emerald-400 shadow-[0_0_20px_rgba(52,211,153,1)] z-40 pointer-events-none"
                />
            )}
        </div>
    );
};

// Sub-components
const ReadinessItem = ({ icon: Icon, label, status, active }) => (
    <div className="flex items-center justify-between text-[10px] font-bold">
        <div className="flex items-center space-x-3">
            <Icon className={`w-3.5 h-3.5 ${active ? 'text-emerald-400' : 'text-emerald-950'}`} />
            <span className={active ? 'text-emerald-100' : 'text-emerald-900'}>{label}</span>
        </div>
        <span className={active ? 'text-emerald-400 uppercase italic' : 'text-amber-500/40'}>{status}</span>
    </div>
);

const DiagnosticSlider = ({ label, value, percent }) => (
    <div className="space-y-2">
        <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-emerald-500/50">
            <span>{label}</span>
            <span className="text-white font-mono">{value}</span>
        </div>
        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
            <motion.div animate={{ width: `${percent}%` }} className="h-full bg-emerald-500/40" />
        </div>
    </div>
);

const NavControl = ({ icon: Icon, label, active }) => (
    <div className="group relative">
        <button className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${active ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' : 'bg-black/40 text-emerald-500/30 border border-white/5'}`}>
            <Icon className="w-5 h-5" />
        </button>
        <span className="absolute left-16 top-1/2 -translate-y-1/2 px-3 py-1 bg-emerald-950/90 text-emerald-400 text-[8px] font-black tracking-widest opacity-0 group-hover:opacity-100 transition-all rounded-lg pointer-events-none uppercase whitespace-nowrap z-50">
            {label}
        </span>
    </div>
);

const StatBox = ({ icon: Icon, label, value, color = 'text-white' }) => (
    <div className="bg-white/5 p-3 rounded-2xl border border-white/5 flex flex-col items-center">
        <Icon className="w-4 h-4 text-emerald-500/50 mb-1" />
        <span className="text-[8px] font-bold text-emerald-500/30 uppercase tracking-tighter mb-1 text-center leading-none">{label}</span>
        <span className={`text-xs font-mono font-bold ${color}`}>{value}</span>
    </div>
);

const TelemetryItem = ({ label, value, color = 'text-white' }) => (
    <div className="text-center">
        <span className="text-[9px] font-black text-emerald-500/20 uppercase block tracking-widest mb-1">{label}</span>
        <span className={`text-base font-mono font-bold tracking-widest italic ${color}`}>{value}</span>
    </div>
);

const Loader = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

export default AdminDroneAnalysis;
