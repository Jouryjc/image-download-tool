/**
 * 导航组件
 * 应用主导航栏
 */

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, Download, Settings, Box } from 'lucide-react';
import { useActiveDownloads } from '../store';

export const Navigation: React.FC = () => {
  const location = useLocation();
  const activeDownloads = useActiveDownloads();

  const navItems = [
    { path: '/', label: '首页', icon: Box },
    { path: '/search', label: '搜索', icon: Search },
    { path: '/download', label: '下载', icon: Download, badge: activeDownloads },
    { path: '/settings', label: '设置', icon: Settings },
  ];

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <Box className="h-8 w-8 text-black" />
            <span className="text-xl font-semibold text-black">
              容器镜像下载器
            </span>
          </div>

          {/* 导航菜单 */}
          <div className="flex items-center space-x-8">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`
                    flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium
                    transition-colors duration-200
                    ${
                      isActive(item.path)
                        ? 'bg-black text-white'
                        : 'text-gray-600 hover:text-black hover:bg-gray-100'
                    }
                  `}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                  {item.badge && item.badge > 0 && (
                    <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
};
