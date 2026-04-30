/* Capacitor / native helpers for the offline build. */

export function isNative() {
  if (typeof window === 'undefined') return false
  const cap = window.Capacitor
  if (!cap) return false
  if (typeof cap.isNativePlatform === 'function') return cap.isNativePlatform()
  return Boolean(cap.platform && cap.platform !== 'web')
}
