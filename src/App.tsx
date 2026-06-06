import { useState, useEffect } from 'react'
import Header from './components/Header/Header'
import BottomNav from './components/BottomNav/BottomNav'
import UpdateBanner from './components/UpdateBanner/UpdateBanner'
import DashboardTab from './components/DashboardTab/DashboardTab'
import CategoriesTab from './components/CategoriesTab/CategoriesTab'
import SavingsTab from './components/SavingsTab/SavingsTab'
import SettingsTab from './components/SettingsTab/SettingsTab'
import { initSync } from './sync/dropbox'
import { initStoragePersistence } from './lib/storagePersistence'
import { useApplyTheme } from './store/themeStore'
import type { TabName } from './types'

export default function App() {
  const [tab, setTab] = useState<TabName>('dashboard')
  useApplyTheme()
  useEffect(() => {
    initSync()
    initStoragePersistence()
  }, [])
  return (
    <div className="app">
      <UpdateBanner />
      <Header />
      <main>
        {tab === 'dashboard' && <DashboardTab />}
        {tab === 'obligatory' && <CategoriesTab />}
        {tab === 'savings' && <SavingsTab />}
        {tab === 'settings' && <SettingsTab />}
      </main>
      <BottomNav active={tab} onChange={setTab} />
    </div>
  )
}
