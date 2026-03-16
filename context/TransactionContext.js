import React, { createContext, useContext, useState, useCallback } from 'react';

const TransactionContext = createContext(null);

export const TransactionProvider = ({ children }) => {
  const [transactions, setTransactions] = useState([]);

  const addTransaction = useCallback((tx) => {
    setTransactions(prev => [
      {
        id: Date.now().toString(),
        time: 'Just now',
        ...tx
      },
      ...prev
    ]);
  }, []);

  return (
    <TransactionContext.Provider value={{ transactions, addTransaction }}>
      {children}
    </TransactionContext.Provider>
  );
};

export const useTransactions = () => {
  const context = useContext(TransactionContext);
  if (!context) throw new Error('useTransactions must be used within a TransactionProvider');
  return context;
};
