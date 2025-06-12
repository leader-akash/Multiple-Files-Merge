import axios from "axios";
const baseUrl = import.meta.env.VITE_APP_BACKEND_API_URL;

export const mergeFiles = async (formData, token) => {
  if (!baseUrl) throw new Error("Backend Url not found");
  const res = await axios.post(`${baseUrl}/api/merge`, formData, {
    headers: {
      Authorization: `Bearer ${token || ""}`,
    },
    responseType: "blob",
  });
  if (res.data.type !== "application/pdf") {
    throw new Error("The merged file is not a valid PDF");
  }
  return res.data;
};
