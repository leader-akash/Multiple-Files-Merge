import axios from 'axios';

const PurchaseButton = () => {

   const handlePurchase = async () => {
    const amount = 10;

    try {
        const response = await axios.post(`http://localhost:5000/api/payment/create-payment-intent`, { amount });

        // Assuming backend sends session URL back in response.data.url
        const sessionUrl = response.data.url;

        // Redirect to Stripe Checkout
        window.location.href = sessionUrl;
    } catch (error) {
        console.error("Purchase failed:", error); 
    }
};

    return (
        <button 
            onClick={() => handlePurchase()}
            className={`w-full py-3 px-4 mt-4 rounded-md font-medium flex items-center justify-center transition-colors text-blue-500 shadow-md`}
            >
            Buy Subscription 
        </button>
    )
}

export default PurchaseButton
