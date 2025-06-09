import axios from "axios";

const baseUrl = import.meta.env.VITE_APP_BACKEND_API_URL;

export const subscriptionStatus = async (userId, token) => {
  if (!baseUrl) throw new Error("Backend Url not found");

  const res = await axios.get(`${baseUrl}/api/subscription/${userId}/status`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  return res.data;
};
