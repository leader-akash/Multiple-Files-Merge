// src/components/PricingPlan.tsx
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../hooks/useAuth';
import { useCreateSubscription } from '../hooks/useCreateSubscription';


export default function PricingPlan({ data }) {
  const { data: auth, isPending: isAuthPending } = useAuth();
  const { mutate: createSubscription, isPending } = useCreateSubscription();
  const navigate = useNavigate();

  const handlePurchase = () => {
    if (isAuthPending) {
      toast.info('Checking authentication status...');
      return;
    }
    if (!auth) {
      toast.error('Please log in to purchase a plan');
      navigate('/login');
      return;
    }

    createSubscription({
      planId: data._id,
      token: auth.token,
    });
  };

  return (
    <div
      className={`bg-white rounded-2xl shadow-lg border ${
        data?.isPopular ? 'border-purple-300' : 'border-gray-200'
      } overflow-hidden transform transition-all duration-300 hover:-translate-y-1 hover:shadow-xl`}
    >
      
      <div className="p-8">
        <h3 className="text-xl font-bold mb-2">{data?.title}</h3>
        <div className="mb-5">
          <span className="text-4xl font-bold">${data?.price}</span>
          <span className="text-gray-500">/{data?.title.toLowerCase()}</span>
        </div>
        <button
          onClick={handlePurchase}
          disabled={isPending || isAuthPending}
          className={`w-full py-3 px-4 rounded-md text-blue-500 font-medium transition-colors ${
            data?.isPopular
              ? 'bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300'
              : 'bg-gray-800 hover:bg-gray-900 disabled:bg-gray-400'
          }`}
        >
          {isPending ? 'Processing...' : 'Select Plan'}
        </button>
      </div>
    </div>
  );
}