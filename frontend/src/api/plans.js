

const baseUrl = import.meta.env.VITE_APP_BACKEND_API_URL;

export const fetchPlans = async () => {
  const response = await fetch(`${baseUrl}/api/plans`);
  if (!response.ok) {
    throw new Error('Failed to fetch plans');
  }
  return response.json();
};

export const createSubscription = async (planId, token) => {
  const response = await fetch(`${baseUrl}/api/subscription`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ planId }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create subscription');
  }
  return response.json();
};