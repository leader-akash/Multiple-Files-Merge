import React, { memo } from 'react';

const Message = ({ message }) => {
  if (!message.text) return null;

  return (
    <div
      className={`mt-4 p-3 rounded text-sm ${
        message.type === 'error'
          ? 'bg-red-100 text-red-700'
          : message.type === 'success'
          ? 'bg-green-100 text-green-700'
          : 'bg-blue-100 text-blue-700'
      }`}
    >
      {message.text}
    </div>
  );
};

export default memo(Message);