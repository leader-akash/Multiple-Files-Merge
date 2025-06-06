// src/pages/PurchasePlans.tsx
import { useNavigate } from 'react-router-dom';
import { IoArrowBack } from 'react-icons/io5';
import PricingPlan from '../components/PricingPlan';
import { usePlans } from '../hooks/usePlans';

export default function PurchasePlans() {
  const navigate = useNavigate();
  const { data: packages, isPending, error } = usePlans();

  return (
    <section id="pricing" className="py-20 ">
      <div className="container mx-auto px-4">
        <button
          className="mb-6 flex items-center px-3 py-2 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
          onClick={() => navigate('/')}
        >
          <IoArrowBack className="mr-2" />
          Back
        </button>
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Simple, <span className="text-purple-600">Transparent Pricing</span>
          </h2>
          <p className="text-xl text-gray-600">Choose the plan that's right for your content needs</p>
        </div>

        {isPending && (
          <div className="text-center text-gray-600">Loading plans...</div>
        )}
        {error && (
          <div className="text-center text-red-600">Error: {error.message}</div>
        )}
        {packages && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {packages.map((plan) => (
              <PricingPlan key={plan._id} data={plan} />
            ))}
          </div>
        )}

        <div className="mt-16 text-center max-w-2xl mx-auto">
          <p className="text-gray-600">All rights reserved.</p>
        </div>
      </div>
    </section>
  );
}