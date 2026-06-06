export type View = 'home' | 'chats' | 'persona' | 'memory' | 'pause' | 'images' | 'settings';
export type WaState = 'qr' | 'open' | 'close' | null;
export type ToastType = 'success' | 'error' | 'info';
export type Toast = { id: number; message: string; type: ToastType };
export type AddToast = (message: string, type: ToastType) => void;
