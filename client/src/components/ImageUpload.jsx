import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

const ImageUpload = ({ onAnalysisComplete, farmId, defaultMode = 'upload', allowCamera = true }) => {
    const { t } = useTranslation();
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    // Camera states
    const [showCamera, setShowCamera] = useState(defaultMode === 'camera');
    const [cameraError, setCameraError] = useState(null);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);

    // Stop camera stream
    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const tracks = videoRef.current.srcObject.getTracks();
            tracks.forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
        setShowCamera(false);
    };

    // Start camera stream
    const startCamera = async () => {
        setCameraError(null);
        setError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            });
            setShowCamera(true);
            // Need a slight delay or effect to ensure videoRef is mounted, 
            // but react state update will trigger re-render, so we use a callback ref or effect.
            // For simplicity in this structure, we'll set it after a timeout or let the render handle it.
            // Better approach: use useEffect dependent on showCamera
        } catch (err) {
            console.error("Camera error:", err);
            setCameraError(t('camera_unavailable'));
        }
    };

    // Effect to attach stream when showCamera becomes true
    useEffect(() => {
        let stream = null;
        if (showCamera) {
            (async () => {
                try {
                    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                    }
                } catch (err) {
                    console.error("Camera access failed", err);
                    setCameraError(t('camera_unavailable'));
                    setShowCamera(false);
                }
            })();
        }
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [showCamera]);

    const captureImage = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');

            // Set canvas dimensions to match video
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            // Draw current frame
            context.drawImage(video, 0, 0, canvas.width, canvas.height);

            // Convert to blob/file
            canvas.toBlob((blob) => {
                const capturedFile = new File([blob], "camera_capture.jpg", { type: "image/jpeg" });
                setFile(capturedFile);
                setPreview(URL.createObjectURL(capturedFile));
                setResult(null);
                stopCamera(); // Close camera after capture
            }, 'image/jpeg');
        }
    };

    const handleFileSelect = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            setPreview(URL.createObjectURL(selectedFile));
            setResult(null);
            setError(null);
        }
    };

    const handleUpload = async () => {
        if (!file) return;
        if (!farmId) {
            setError(t('farm_id_not_found'));
            return;
        }

        setUploading(true);
        setError(null);

        const formData = new FormData();
        formData.append('image', file);
        formData.append('farm_id', farmId);

        try {
            const res = await axios.post('http://localhost:3000/drone/analysis', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            const analysisResult = res.data.result;
            setResult(analysisResult);
            if (onAnalysisComplete) onAnalysisComplete(analysisResult);
        } catch (err) {
            console.error(err);

            // Check if it's an invalid image error
            if (err.response?.data?.error === "INVALID_IMAGE") {
                setError(err.response.data.message || "❌ Invalid Image: This does not appear to be a paddy crop. Please upload a clear image of paddy leaves or plants.");
                // Clear the preview since it's invalid
                setPreview(null);
                setFile(null);
                const fileInput = document.getElementById('imageInput');
                if (fileInput) fileInput.value = '';
            } else {
                setError(t('analysis_failed') || "Analysis failed. Please try again.");
            }
        } finally {
            setUploading(false);
        }
    };

    const handleReset = () => {
        setFile(null);
        setPreview(null);
        setResult(null);
        setError(null);
        const fileInput = document.getElementById('imageInput');
        if (fileInput) fileInput.value = '';
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-indigo-100 ring-1 ring-indigo-50 mt-6">
            <h3 className="text-lg font-semibold text-indigo-800 mb-4 flex items-center">
                <span className="mr-2">📸</span> {t('manual_disease_check')}
            </h3>

            {/* Split layout: Grid with 2 columns on medium screens and up if camera allowed */}
            <div className={`grid grid-cols-1 ${allowCamera ? 'md:grid-cols-2' : ''} gap-8 relative`}>

                {allowCamera && (
                    <>
                        {/* Vertical Divider for visual separation (hidden on mobile) */}
                        <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-gray-200 transform -translate-x-1/2"></div>
                        <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 text-gray-400 font-medium text-sm z-10">
                            {t('or')}
                        </div>
                    </>
                )}

                {/* Left Side: File Upload */}
                <div className={`space-y-4 ${!allowCamera ? 'max-w-2xl mx-auto w-full' : ''}`}>
                    {!preview ? (
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 transition h-64 flex flex-col justify-center items-center">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileSelect}
                                className="hidden"
                                id="imageInput"
                            />
                            <label htmlFor="imageInput" className="cursor-pointer block w-full">
                                <div className="mx-auto w-12 h-12 text-gray-400 mb-3">
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                    </svg>
                                </div>
                                <p className="text-gray-500 font-medium">{t('click_to_upload')}</p>
                                <p className="text-xs text-gray-400 mt-1">{t('supports_format')}</p>
                            </label>
                        </div>
                    ) : (
                        <div className="relative h-64 flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200">
                            <img src={preview} alt="Preview" className="max-h-full max-w-full object-contain rounded-md" />
                            {!result && (
                                <button
                                    onClick={handleReset}
                                    className="absolute top-2 right-2 bg-gray-800 bg-opacity-50 text-white p-1 rounded-full hover:bg-opacity-70"
                                    title="Remove Image"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Right Side: Camera (Conditional) */}
                {allowCamera && (
                    <div className="space-y-4 flex flex-col">
                        {!showCamera ? (
                            <div
                                onClick={() => setShowCamera(true)}
                                className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 transition cursor-pointer h-64 flex flex-col justify-center items-center group"
                            >
                                <div className="mx-auto w-14 h-14 text-indigo-400 mb-3 group-hover:scale-110 transition-transform">
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path>
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                    </svg>
                                </div>
                                <p className="text-indigo-600 font-bold text-lg">{t('start_camera')}</p>
                                <p className="text-xs text-gray-400 mt-1">Take a real-time photo</p>
                                {cameraError && <p className="text-xs text-red-500 mt-2">{cameraError}</p>}
                            </div>
                        ) : (
                            <div className="relative h-64 bg-black rounded-lg overflow-hidden flex items-center justify-center">
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    className="absolute inset-0 w-full h-full object-cover"
                                />
                                {/* Hidden canvas for capture */}
                                <canvas ref={canvasRef} className="hidden" />

                                <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-4 z-10">
                                    <button
                                        onClick={captureImage}
                                        className="bg-white rounded-full w-12 h-12 flex items-center justify-center border-4 border-gray-300 shadow-lg hover:bg-gray-100 transition"
                                        title={t('capture')}
                                    >
                                        <div className="w-10 h-10 bg-red-500 rounded-full border-2 border-white"></div>
                                    </button>
                                    <button
                                        onClick={stopCamera}
                                        className="bg-gray-800 bg-opacity-70 text-white rounded-full p-2 hover:bg-gray-700 transition"
                                        title={t('stop_camera')}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Analysis Action Section (Full Width below) */}
            <div className="mt-6">
                {file && !result && (
                    <button
                        onClick={handleUpload}
                        disabled={uploading}
                        className={`w-full py-3 px-4 rounded-md font-bold text-white transition shadow-sm
                            ${uploading ? 'bg-indigo-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                    >
                        {uploading ? t('analyzing') + '...' : 'Analyze Image'}
                    </button>
                )}

                {error && (
                    <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-md text-sm border border-red-100 flex justify-between items-center animate-pulse">
                        <span>{error}</span>
                        <button onClick={handleReset} className="text-red-900 font-bold ml-2">✕</button>
                    </div>
                )}

                {result && (
                    <div className="mt-6 space-y-4 animate-in fade-in slide-in-from-bottom-4">
                        <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                            <h4 className="font-bold text-indigo-900 mb-2">{t('analysis_result')}</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-indigo-500 uppercase">{t('disease_type')}</p>
                                    <p className="text-lg font-bold text-slate-800">{result.disease_type}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-indigo-500 uppercase">{t('confidence')}</p>
                                    <p className="text-lg font-bold text-slate-800">{Math.round(result.confidence * 100)}%</p>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleReset}
                            className="w-full py-2 px-4 rounded-md font-bold text-indigo-600 border border-indigo-600 hover:bg-indigo-50 transition"
                        >
                            {t('scan_another')}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ImageUpload;
