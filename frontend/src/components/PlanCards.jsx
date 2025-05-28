
import axios from 'axios';
import React, { useEffect } from 'react';
import { useState } from "react";

import { Link } from 'react-router-dom';

const PricingPlan = ({
  data
}) => {


     const handlePurchase = async (planId, price, userId) => {
        const amount = price;

        const user =  {
          userId :"6836bb6c9fca50c55ca90ffe"}

        try {
            const response = await axios.post(`http://localhost:5000/api/subscription`, { planId, user });

            // Assuming backend sends session URL back in response.data.url
            const sessionUrl = response.data.url;

            // Redirect to Stripe Checkout
            window.location.href = sessionUrl;
        } catch (error) {
            console.error("Purchase failed:", error);
        }
    };

  return (
    <div className={`bg-white rounded-2xl shadow-lg border ${data?.isPopular ? 'border-purple-300' : 'border-gray-200'} overflow-hidden transform transition-all duration-300 hover:-translate-y-1 hover:shadow-xl`}>
      {/* {data?.isPopular && (
        <div className="bg-purple-600 text-white py-2 px-4 text-center text-sm font-medium">
          MOST POPULAR
        </div>
      )} */}

      <div className="p-8">
        <h3 className="text-xl font-bold mb-2">{data?.title}</h3>

        <div className="mb-5">
          <span className="text-4xl font-bold">${data?.price}</span>
          {data?.price !== 'Custom' && <span className="text-gray-500">/ {data?.title}</span>}
        </div>

          <button onClick={() => handlePurchase(data?._id, data?.price)}
            className={`w-full py-6 {isPopular ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-800 hover:bg-gray-900'}`}
          >
            Select Plan
          </button>

      </div>
    </div>
  )
};

export default PricingPlan;
