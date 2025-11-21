// Browser stub for Node.js util module
export const promisify = () => {
  throw new Error('util.promisify is not available in browser');
};

export const inspect = () => {
  throw new Error('util.inspect is not available in browser');
};

export const format = () => {
  throw new Error('util.format is not available in browser');
};

export const types = {
  isPromise: () => false
};
