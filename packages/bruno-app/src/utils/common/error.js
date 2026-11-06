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
  if (!error) {
    return defaultErrorMsg;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error instanceof BrunoError || error instanceof Error) {
    return error.message || defaultErrorMsg;
  }

  if (typeof error === 'object') {
    if (typeof error.message === 'string' && error.message) {
      return error.message;
    }
    if (typeof error.error_description === 'string' && error.error_description) {
      return typeof error.error === 'string'
        ? `${error.error}: ${error.error_description}`
        : error.error_description;
    }
    if (typeof error.error === 'string' && error.error) {
      return error.error;
    }
    try {
      return JSON.stringify(error, null, 2);
    } catch {
      return defaultErrorMsg;
    }
  }

  return String(error);
};

export const toastError = (error, defaultErrorMsg = 'An error occurred') => {
  const errorMsg = parseError(error, defaultErrorMsg);

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

export function formatIpcError(error) {
  if (!error) return '';

  let errorStr;
  if (typeof error === 'string') {
    errorStr = error;
  } else if (error instanceof Error) {
    errorStr = error.message || '';
  } else if (typeof error === 'object') {
    if (typeof error.message === 'string' && error.message) {
      errorStr = error.message;
    } else if (typeof error.error_description === 'string' && error.error_description) {
      errorStr = typeof error.error === 'string'
        ? `${error.error}: ${error.error_description}`
        : error.error_description;
    } else if (typeof error.error === 'string' && error.error) {
      errorStr = error.error;
    } else {
      try {
        errorStr = JSON.stringify(error, null, 2);
      } catch {
        errorStr = String(error);
      }
    }
  } else {
    errorStr = String(error);
  }

  // https://github.com/electron/electron/blob/659e79fc08c6ffc2f7506dd1358918d97d240147/lib/renderer/api/ipc-renderer.ts#L24-L30
  // There is no other way to get rid of this error prefix as of now.
  return errorStr.replace(/^Error invoking remote method '.+?': (Error: )?/, '');
}

export function formatOauth2Error(result, defaultErrorMsg = 'No access token received from authorization server') {
  if (!result) return defaultErrorMsg;
  if (typeof result === 'string') return result;

  if (result.error_description && typeof result.error_description === 'string') {
    return typeof result.error === 'string'
      ? `${result.error}: ${result.error_description}`
      : result.error_description;
  }

  if (result.error) {
    if (typeof result.error === 'string') return result.error;
    if (typeof result.error === 'object') {
      if (typeof result.error.message === 'string' && result.error.message) {
        return result.error.message;
      }
      if (typeof result.error.error_description === 'string' && result.error.error_description) {
        return result.error.error_description;
      }
      try {
        return JSON.stringify(result.error, null, 2);
      } catch {
        return String(result.error);
      }
    }
  }

  if (typeof result.message === 'string' && result.message) {
    return result.message;
  }

  if (typeof result === 'object' && Object.keys(result).length > 0) {
    try {
      return JSON.stringify(result, null, 2);
    } catch {
      return defaultErrorMsg;
    }
  }

  return defaultErrorMsg;
}
