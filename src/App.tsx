import { PerformanceLayout } from './components/performance'
import { DeviceTest } from './components/devicetest/DeviceTest'

/** ?devicetest opens the iOS go/no-go test panel over the app. */
const DEVICE_TEST = typeof location !== 'undefined' && new URLSearchParams(location.search).has('devicetest')

function App() {
  return (
    <>
      <PerformanceLayout />
      {DEVICE_TEST && <DeviceTest />}
    </>
  )
}

export default App
