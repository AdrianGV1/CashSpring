import { api } from "./api";

export const dashboardApi = {
  getSummary: async () => {
    const res = await api.get("/api/dashboard/summary");
    return res.data;
  },
};