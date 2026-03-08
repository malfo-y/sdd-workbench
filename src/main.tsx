import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import {
  notifyAppearanceThemeChanged,
  restoreAppearanceThemeOnRoot,
} from './appearance-theme'
import { WorkspaceProvider } from './workspace/workspace-context'

const restoredAppearanceTheme = restoreAppearanceThemeOnRoot()
notifyAppearanceThemeChanged(restoredAppearanceTheme)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WorkspaceProvider>
      <App />
    </WorkspaceProvider>
  </React.StrictMode>,
)
