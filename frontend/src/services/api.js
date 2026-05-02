import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

if (!API_URL) {
  throw new Error("VITE_API_URL is not defined");
}

axios.defaults.withCredentials = true;
axios.defaults.timeout = 120000; // 120 seconds

export const api = {
  checkAuth: async () => {
    const res = await axios.get(`${API_URL}/auth/github/check`);
    return res.data;
  },
  logout: async () => {
    const res = await axios.get(`${API_URL}/auth/github/logout`);
    return res.data;
  },
  runTests: async (code) => {
    console.log("Sending request...");
    try {
      const res = await axios.post(`${API_URL}/run-tests`, { code });
      console.log("Response:", res.data);
      return res.data;
    } catch (error) {
      console.error("API Error (/run-tests):", error);
      throw error;
    }
  },
  runAgent: async (code, signal) => {
    console.log("Sending request...");
    try {
      const res = await axios.post(`${API_URL}/agent-run`, { code }, { signal });
      console.log("Response:", res.data);
      return res.data;
    } catch (error) {
      if (axios.isCancel(error)) {
        console.log("Request canceled by user");
        throw new Error("Canceled");
      }
      console.error("API Error (/agent-run):", error);
      throw error;
    }
  },
  uploadProject: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await axios.post(`${API_URL}/upload-project`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  },
  loadRepo: async (url) => {
    const res = await axios.post(`${API_URL}/load-repo`, { url });
    return res.data;
  },
  createPR: async (repo_url, file_path, new_code) => {
    const res = await axios.post(`${API_URL}/github/create-pr`, { repo_url, file_path, new_code });
    return res.data;
  },
  analyzeRepo: async () => {
    const res = await axios.post(`${API_URL}/analyze-repo`);
    return res.data;
  },
  getPrompts: async () => {
    const res = await axios.get(`${API_URL}/prompts`);
    return res.data;
  },
  updatePrompts: async (prompts) => {
    const res = await axios.post(`${API_URL}/prompts`, prompts);
    return res.data;
  }
};
