/**
 * 主应用组件
 * 容器镜像下载器的主入口
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { SearchPage } from './pages/SearchPage';
import DownloadPage from './pages/DownloadPage';
import { HistoryPage } from './pages/HistoryPage';
import SettingsPage from './pages/SettingsPage';
import { Navigation } from './components/Navigation';
import { WebSocketProvider } from './providers/WebSocketProvider';
import './styles/custom.css';

function App() {
  return (
    <WebSocketProvider>
      <Router>
        <div className="min-h-screen bg-gray-50 text-gray-900">
          <Navigation />
          <main className="container mx-auto px-4 py-8 max-w-7xl">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/download" element={<DownloadPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </main>
        </div>
      </Router>
    </WebSocketProvider>
  );
}

export default App;
