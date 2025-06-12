// src/hooks/useSignup.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { signup } from "../api/authApi";
import { toast } from "react-toastify";

export const useSignup = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: signup,
    onSuccess: (data) => {
      localStorage.setItem("auth", JSON.stringify(data));
      queryClient.setQueryData(["auth"], data);
      toast.success("Signed up successfully! Please log in.");
      navigate("/");
    },
    onError: (error) => {
      console.error("Signup error:", error);
    },
  });
};
