'use client'
import { useEffect } from 'react'

export default function VersionChecker() {
  useEffect(() => {
    let isMounted = true; // 👈 Previene updates en componente desmontado

    const checkVersion = async () => {
      try {
        const res = await fetch('/version.json?nocache=' + Date.now(), {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' } // 👈 Extra seguro
        })

        if (!res.ok) throw new Error('HTTP ' + res.status)

        const data = await res.json()
        const currentVersion = localStorage.getItem('app_version')

        if (!currentVersion) {
          localStorage.setItem('app_version', data.version)
          return
        }

        if (currentVersion !== data.version && isMounted) {
          console.log('🔄 Nueva versión: ' + currentVersion + ' → ' + data.version)
          
          // 👇 Opcional: avisar al usuario antes de recargar
          if ('serviceWorker' in navigator) {
            // Si usás SW, podés saltarWaiting para activar la nueva versión
            const registration = await navigator.serviceWorker.ready
            if (registration.waiting) {
              registration.waiting.postMessage({ type: 'SKIP_WAITING' })
            }
          }
          
          localStorage.setItem('app_version', data.version)
          
          // 👇 Bonus: preservar el carrito al recargar (por si acaso)
          const cartBackup = localStorage.getItem('cart')
          sessionStorage.setItem('cart_backup', cartBackup || '')
          
          window.location.reload()
        }
      } catch (err) {
        // Silencioso: no queremos spamear consola en producción
        if (process.env.NODE_ENV === 'development') {
          console.warn('⚠️ Error verificando versión:', err)
        }
      }
    }

    checkVersion()
    
    // 👇 Verificación inicial más frecuente + luego cada 60s
    const interval = setInterval(checkVersion, 60000)

    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [])

  return null
}