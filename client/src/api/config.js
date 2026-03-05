const RAW_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const API_URL = RAW_URL.endsWith('/') ? RAW_URL.slice(0, -1) : RAW_URL;

export default API_URL;
