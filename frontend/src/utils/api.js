import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const BASE_URL = 'http://localhost:5000/api';
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

export default api;