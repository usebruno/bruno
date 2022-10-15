import toast from 'react-hot-toast';

// levels: 'warning, error'
export class BrunoError extends Error {
  constructor(message, level) {
    super(message);
    this.name = "BrunoError";
    this.level = level || "error";
  }
}

export const parseError = (error) => {
  if(error instanceof BrunoError) {
    return error.message;
  }

  return error.message ? error.message : 'An error occured';
};

export const toastError = (error) => {
  if(error instanceof BrunoError) {
    if(error.level === 'warning') {
      return toast(error.message, {
        icon: '⚠️',
        duration: 3000
      });
    }
    return toast.error(error.message, {
      duration: 3000
    });
  }

  return toast.error(error.message || 'An error occured');
};
