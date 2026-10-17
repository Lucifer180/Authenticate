import axios from "axios";
import { clearAccessToken, getAccessToken, setAccessToken } from "./tokenManager";

const jwtApi = axios.create({
    baseURL: "http://localhost:5000/api",
});

let refreshPromise = null; 

const refreshAccessToken = async () => {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(
        "http://localhost:5000/api/auth/jwt/refresh",
        {},
        {
          withCredentials: true,
        }
      )
      .then((response) => {
        const newAccessToken =
          response.data.accessToken;

        setAccessToken(newAccessToken);

        return newAccessToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
};

jwtApi.interceptors.request.use(
    (config) => {
        const token = getAccessToken();

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        };

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

jwtApi.interceptors.response.use(
    (response) => {
        return response
    },

    async (error) => {
        const originalRequest = error.config;

        if (
            error.response?.status === 401 &&
            !originalRequest._retry &&
            !originalRequest.url.includes("/auth/jwt/refresh")
        ) {
            originalRequest._retry = true;

            try {
               const newAccessToken =
          await refreshAccessToken();
          originalRequest.headers.Authorization =
          `Bearer ${newAccessToken}`;
                return jwtApi(originalRequest);
            } catch (refreshError) {
                clearAccessToken();

                return Promise.reject(refreshError);

            }

        }
        return Promise.reject(error);
    }
)

export default jwtApi;

