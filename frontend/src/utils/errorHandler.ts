// errorHandler.ts - Network error handling utilities
export interface NetworkError {
  type: 'network';
  message: string;
  statusCode?: number;
  retryable: boolean;
}

export const handleNetworkError = (error: unknown): NetworkError => {
  if (error instanceof Response) {
    return {
      type: 'network',
      message: `Request failed with status ${error.status}`,
      statusCode: error.status,
      retryable: error.status >= 500,
    };
  }
  
  if (error instanceof Error) {
    return {
      type: 'network',
      message: error.message || 'Network request failed. Please check your connection.',
      retryable: true,
    };
  }
  
  return {
    type: 'network',
    message: 'Network request failed. Please check your connection.',
    retryable: true,
  };
};
