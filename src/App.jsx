import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { isSupabaseConfigured } from './lib/supabase'
import HomeScreen from './components/HomeScreen.jsx'
import RoomView from './components/RoomView.jsx'
import SetupNotice from './components/SetupNotice.jsx'

export default function App() {
  // اگر تنظیمات Supabase وارد نشده باشد، راهنمای راه‌اندازی نمایش داده می‌شود
  if (!isSupabaseConfigured) return <SetupNotice />

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/room/:code" element={<RoomView />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}
