let RAW_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
if (RAW_URL !== 'http://localhost:3000' && !RAW_URL.startsWith('http')) {
    RAW_URL = 'https://' + RAW_URL;
}
const API_URL = RAW_URL.endsWith('/') ? RAW_URL.slice(0, -1) : RAW_URL;

export default API_URL;
