import { useEffect, useState } from 'react';

const STORAGE_KEY = 'response-headers-sort-order';
const CHANGE_EVENT = 'response-headers-sort-order-change';
const orders = ['default', 'alphabetical', 'reverseAlphabetical'];

export const nextHeaderSortOrder = (order) => orders[(Math.max(orders.indexOf(order), 0) + 1) % orders.length];

const readOrder = () => {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return orders.includes(value) ? value : 'default';
  } catch {
    return 'default';
  }
};

export const useHeaderSortOrder = () => {
  const [order, setOrder] = useState(readOrder);
  useEffect(() => {
    const sync = () => setOrder(readOrder());
    window.addEventListener('storage', sync);
    window.addEventListener(CHANGE_EVENT, sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener(CHANGE_EVENT, sync);
    };
  }, []);
  const toggle = () => {
    const next = nextHeaderSortOrder(order);
    try {
      localStorage.setItem(STORAGE_KEY, next);
      window.dispatchEvent(new Event(CHANGE_EVENT));
    } catch {
      setOrder(next);
    }
  };
  return [order, toggle];
};
