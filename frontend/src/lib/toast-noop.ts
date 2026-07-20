// No-op toast implementation to disable all notifications
export const toast = {
  success: () => {},
  error: () => {},
  info: () => {},
  warning: () => {},
  loading: () => {},
  promise: () => Promise.resolve(),
  custom: () => {},
  dismiss: () => {},
}
