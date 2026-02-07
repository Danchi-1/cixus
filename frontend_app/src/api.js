import axios from 'axios';

const instance = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "https://cixus.onrender.com",
    headers: {
        "Content-Type": "application/json",
    },
});

console.log("API Configured URL:", instance.defaults.baseURL);

instance.interceptors.response.use(
    response => response,
    error => {
        console.error("API Error:", error.message);
        if (error.response) {
            console.error("Status:", error.response.status);
            console.error("Data:", error.response.data);
        } else if (error.request) {
            console.error("No response received from:", instance.defaults.baseURL);
        }
        return Promise.reject(error);
    }
);

export default instance;
