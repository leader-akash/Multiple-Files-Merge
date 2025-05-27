import React from 'react'
import Pricing from '../components/PlanCards'
import { useState } from 'react';
import PricingPlan from '../components/PlanCards';
import { IoArrowBack } from "react-icons/io5";
import {useNavigate} from "react-router-dom"

const PurchasePlans = () => {

    const navigate = useNavigate();

    const plans = [
        {
            planId: 1,
            title: "Weekly",
            price: 5,

            buttonName: "Select Plan"
        },
        {
            planId: 2,
            title: "Monthly",
            price: 10,
            isPopular: true,
            buttonName: "Select Plan"
        },
        {
            planId: 3,
            title: "Yearly",
            price: 50,
            buttonName: "Select Plan"
        }
    ];

    const [packages, setPackages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);



    return (
        <section id="pricing" className="py-20">
            <button className='border flex items-center px-2 bg-green-100 ' onClick={() => navigate("/")}>
                <IoArrowBack />
              Back  
            </button>
            <div className="container mx-auto px-4">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                        Simple, <span className="heading-gradient">Transparent Pricing</span>
                    </h2>
                    <p className="text-xl text-gray-600">
                        Choose the plan that's right for your content needs
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                    {plans.map((plan, index) => (
                        <PricingPlan
                            key={index}
                            data={plan}
                        />
                    ))}
                </div>

                <div className="mt-16 text-center max-w-2xl mx-auto">
                    <p className="text-gray-600">
                        All rights reserved.
                    </p>
                </div>
            </div>
        </section>
    )
}

export default PurchasePlans
