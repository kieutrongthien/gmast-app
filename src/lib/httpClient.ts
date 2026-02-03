import axios from 'axios';
import { appConfig } from '@/config/appConfig';

export const httpClient = axios.create({
  baseURL: appConfig.apiBaseUrl || undefined,
  timeout: 12000
});
