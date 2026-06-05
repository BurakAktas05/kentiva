const required = (key: string): string => {
  const value = import.meta.env[key];
  if (!value) throw new Error(`Missing required env variable: ${key}`);
  return value;
};

const getEnvWithFallback = (key1: string, key2: string): string => {
  const v1 = import.meta.env[key1];
  if (v1) return v1;
  const v2 = import.meta.env[key2];
  if (v2) return v2;
  throw new Error(`Missing required env variables: ${key1} or ${key2}`);
};

export const API_BASE = getEnvWithFallback('VITE_API_BASE', 'VITE_API_BASE_URL');
