import toast from 'react-hot-toast';

// levels: 'warning, error'
export class BrunoError extends Error {
  constructor(message, level) {
    super(message);
    this.name = 'BrunoError';
    this.level = level || 'error';
  }
}

export const parseError = (error, defaultErrorMsg = 'An error occurred') => {
  if (error instanceof BrunoError) {
    return error.message;
  }

  return error.message ? error.message : defaultErrorMsg;
};

export const toastError = (error, defaultErrorMsg = 'An error occurred') => {
  let errorMsg = parseError(error, defaultErrorMsg);

  if (error instanceof BrunoError) {
    if (error.level === 'warning') {
      return toast(errorMsg, {
        icon: '⚠️',
        duration: 3000
      });
    }
    return toast.error(errorMsg, {
      duration: 3000
    });
  }

  return toast.error(errorMsg);
};
