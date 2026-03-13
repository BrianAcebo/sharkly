import React from 'react';
import { Monitor, Smartphone, Tablet } from 'lucide-react';

const ScreenSizeWarning: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-gray-900 flex items-center justify-center p-6 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-md mx-auto text-center shadow-2xl">
        <div className="flex justify-center mb-6">
          <div className="relative">
            <Monitor className="h-16 w-16 text-red-500" />
            <Smartphone className="h-8 w-8 text-gray-400 absolute -bottom-2 -right-2" />
            <Tablet className="h-6 w-6 text-gray-400 absolute -top-2 -right-2" />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Screen Too Small
        </h1>
        
        <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
          This application is designed for desktop and laptop screens to provide the best user experience. 
          Mobile and tablet devices are not supported.
        </p>
        
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-2">
            Minimum Requirements:
          </h2>
          <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
            <li>• Screen width: <span className="font-mono font-semibold">1024px</span> minimum</li>
            <li>• Device type: Desktop or laptop computer</li>
            <li>• Browser: Modern web browser (Chrome, Firefox, Safari, Edge)</li>
          </ul>
        </div>
        
        <div className="text-sm text-gray-500 dark:text-gray-400">
          <p>Please use a larger screen to access this application.</p>
          <p className="mt-1">Current screen width: <span className="font-mono font-semibold">{window.innerWidth}px</span></p>
        </div>
      </div>
    </div>
  );
};

export default ScreenSizeWarning;
