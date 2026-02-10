export function successResp(message: string, data?: any) {
  return {
    success: true,
    message,
    data: data === undefined ? null : data
  };
}

export function errorResp(message: string, error?: any) {
  return {
    success: false,
    message,
    error: error instanceof Error ? error.message : error
  };
}
