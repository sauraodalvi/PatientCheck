import axios from 'axios';

// In production (Netlify), VITE_API_BASE_URL points to the Render backend.
// In local dev, it's empty and Vite's proxy handles /api/* -> localhost:5000.
const baseURL = (import.meta as unknown as { env: Record<string, string> }).env.VITE_API_BASE_URL || '';

const api = axios.create({
    baseURL,
    timeout: 60000,
});

export default api;
