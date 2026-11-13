export const ENV_MODE = import.meta.env.MODE;
export const ENV_BASE_URL = (
  import.meta.env.VITE_BASE_URL || "https://api.focess.top"
).replace(/\/+$/, "");
export const ENV_DEBUG = import.meta.env.DEV;
