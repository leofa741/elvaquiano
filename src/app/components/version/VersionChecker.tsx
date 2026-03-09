'use client'
import { useEffect } from 'react'

export default function VersionChecker() {

  useEffect(() => {

    const checkVersion = async () => {
      try {

        const res = await fetch('/version.json?nocache=' + Date.now(), {
          cache: 'no-store'
        })

        const data = await res.json()

        console.log('Versión actual:', data.version)

        const currentVersion = localStorage.getItem('app_version')

        if (!currentVersion) {
          localStorage.setItem('app_version', data.version)
          return
        }

        if (currentVersion !== data.version) {

          console.log('Nueva versión detectada')

          localStorage.setItem('app_version', data.version)

          // recarga automática
          window.location.reload()

        }

      } catch (err) {
        console.log('Error verificando versión')
      }
    }

    checkVersion()

    const interval = setInterval(checkVersion, 60000) // cada 60s

    return () => clearInterval(interval)

  }, [])

  return null
}