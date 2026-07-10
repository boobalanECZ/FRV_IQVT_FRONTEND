import axios from "axios";
import Swal from "sweetalert2";

const API = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
});

API.interceptors.request.use((config) => {
    const user = JSON.parse(sessionStorage.getItem("user"));
    if (user?.sessionId) {
        config.headers["SessionId"] = user.sessionId;
    }
    return config;
});

API.interceptors.response.use(
    (response) => response,
    async (error) => {
        console.log("401 URL:", error.config?.url);
        console.log("Status:", error.response?.status);
        console.log("Response:", error.response?.data);
        if (error.response?.status === 401) {
            sessionStorage.clear();
            await Swal.fire({
                icon: "warning",
                title: "Session Expired",
                text: "Your session has expired",
            });
            window.location.href = "/#/login";
        }
        return Promise.reject(error);
    }
);

export default API;