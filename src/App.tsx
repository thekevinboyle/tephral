import { useSyncExternalStore } from 'react'
import { PerformanceLayout } from './components/performance'
import { PhoneLayout } from './components/phone/PhoneLayout'
import { DeviceTest } from './components/devicetest/DeviceTest'

/** ?devicetest opens the iOS go/no-go test panel over the app. */
const DEVICE_TEST = typeof location !== 'undefined' && new URLSearchParams(location.search).has('devicetest')

/** Phones (and windows narrower than 700 px) get the phone layout; ?layout=desktop|phone overrides it. */
const PHONE_QUERY = '(max-width: 699.98px)'
const forced = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('layout') : null
const subscribe = (cb: () => void) => {
  const mq = window.matchMedia(PHONE_QUERY)
  mq.addEventListener('change', cb)
  return () => mq.removeEventListener('change', cb)
}
const isPhone = () => (forced === 'phone' ? true : forced === 'desktop' ? false : window.matchMedia(PHONE_QUERY).matches)

function App() {
  const phone = useSyncExternalStore(subscribe, isPhone)
  return (
    <>
      {phone ? <PhoneLayout /> : <PerformanceLayout />}
      {DEVICE_TEST && <DeviceTest />}
    </>
  )
}

export default App
