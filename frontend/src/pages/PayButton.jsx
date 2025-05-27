import React from 'react';
import { useCheckout } from '@stripe/react-stripe-js';

const PayButton = () => {
  const { confirm } = useCheckout();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  const handleClick = async () => {
    setLoading(true);
    try {
      const result = await confirm();
      if (result.type === 'error') {
        setError(result.error);
      }
    } catch (err) {
      setError({ message: 'An unexpected error occurred.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button disabled={loading} onClick={handleClick}>
        {loading ? 'Processing...' : 'Pay'}
      </button>
      {error && <div style={{ color: 'red' }}>{error.message}</div>}
    </div>
  );
};

export default PayButton;