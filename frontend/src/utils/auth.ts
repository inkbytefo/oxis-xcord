import axios from 'axios';

export const refreshAuthToken = async () => {
  try {
    const response = await axios.post('/api/auth/refresh-token', {}, {
      withCredentials: true
    });
    localStorage.setItem('token', response.data.token);
    return response.data.token;
  } catch (error) {
    localStorage.removeItem('token');
    window.location.href = '/login';
    throw error;
  }
};

export const setupAxiosInterceptors = () => {
  axios.interceptors.request.use(async (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  axios.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;
      if (error.response.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
        const newToken = await refreshAuthToken();
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return axios(originalRequest);
      }
      return Promise.reject(error);
    }
  );
};