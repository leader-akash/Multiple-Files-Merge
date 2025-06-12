// src/hooks/useSubscriptionStatus.js
import { useQuery } from "@tanstack/react-query";
import { subscriptionStatus } from "../api/subscription";
import { toast } from "react-toastify";

export const useSubscriptionStatus = (userId, token) => {
  return useQuery({
    queryKey: ["subscriptionStatus", userId],
    queryFn: () => subscriptionStatus(userId, token),
    enabled: !!userId && !!token,
    staleTime: 1000 * 60 * 60,
    onError: (error) => {
      toast.error("Failed to fetch subscription status.");
      console.error("Subscription fetch error:", error);
    },
  });
};
