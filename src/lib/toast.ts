import { broadcastLiveEvent } from "./realtimeSync";

let toastCounter = 0;

function createToast(message: string, type: 'success' | 'error' | 'info' | 'warning', data?: any) {
  // Broadcast a local notification event for the Layout header to pick up
  broadcastLiveEvent("NOTIFICATION_CREATED", { 
    id: `local_${toastCounter++}`,
    title: type === 'error' ? 'Error' : type === 'success' ? 'Success' : 'Notice',
    message: message,
    type: 'system', 
    isRead: 0,
    createdAt: Date.now()
  });
  return toastCounter;
}

export const toast = Object.assign(
  (message: string, data?: any) => createToast(message, 'info', data),
  {
    success: (message: string, data?: any) => createToast(message, 'success', data),
    error: (message: string, data?: any) => createToast(message, 'error', data),
    info: (message: string, data?: any) => createToast(message, 'info', data),
    warning: (message: string, data?: any) => createToast(message, 'warning', data),
    loading: (message: string, data?: any) => createToast(message, 'info', data),
    dismiss: (id?: string | number) => {},
    promise: <T>(
      promise: Promise<T>,
      data?: { loading?: string; success?: string | ((data: T) => string); error?: string | ((err: any) => string) }
    ) => {
      if (data?.loading) createToast(data.loading, 'info');
      promise
        .then((res) => {
          if (data?.success) {
            createToast(typeof data.success === 'function' ? data.success(res) : data.success, 'success');
          }
        })
        .catch((err) => {
          if (data?.error) {
            createToast(typeof data.error === 'function' ? data.error(err) : data.error, 'error');
          }
        });
      return promise;
    }
  }
);
