import axios from 'axios';
import {Link} from "react-router-dom"

const PurchaseButton = () => {
    return (
        <Link to="/purchase-plans">
            <button
                // onClick={() => handlePurchase()}
                className={`w-full py-3 px-4 mt-4 rounded-md font-medium flex items-center justify-center transition-colors text-blue-500 shadow-md`}
            >
                Buy Subscription
            </button>
        </Link>
    )
}

export default PurchaseButton
