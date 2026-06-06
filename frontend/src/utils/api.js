import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const BASE_URL = 'https://ltfi-backend.onrender.com/api';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use(async (config) => {
  let token;
  if (Platform.OS === 'web') {
    token = localStorage.getItem('token');
  } else {
    token = await AsyncStorage.getItem('token');
  }
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const getCached = async (key, fetcher) => {
  try {
    const cached = await AsyncStorage.getItem(`cache:${key}`);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_TTL) return data;
    }
  } catch {}

  const data = await fetcher();
  try {
    await AsyncStorage.setItem(`cache:${key}`, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {}
  return data;
};

export const clearCache = async (key) => {
  try {
    await AsyncStorage.removeItem(`cache:${key}`);
  } catch {}
};

export default api;