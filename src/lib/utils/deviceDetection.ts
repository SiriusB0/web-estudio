/**
 * Utilidades para detección de dispositivos móviles
 */

export const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  // Detectar por user agent
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  
  // Patrones comunes de dispositivos móviles
  const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
  
  // También verificar el ancho de pantalla
  const screenWidth = window.innerWidth;
  const isMobileWidth = screenWidth <= 768;
  
  return mobileRegex.test(userAgent) || isMobileWidth;
};

export const isTabletDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  const tabletRegex = /ipad|tablet|kindle|silk|playbook/i;
  
  const screenWidth = window.innerWidth;
  const isTabletWidth = screenWidth > 768 && screenWidth <= 1024;
  
  return tabletRegex.test(userAgent) || isTabletWidth;
};

export const isDesktopDevice = (): boolean => {
  return !isMobileDevice() && !isTabletDevice();
};

export const getDeviceType = (): 'mobile' | 'tablet' | 'desktop' => {
  if (isMobileDevice()) return 'mobile';
  if (isTabletDevice()) return 'tablet';
  return 'desktop';
};
