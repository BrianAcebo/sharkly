import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router';
import MyNumberBadge from '../../components/sms/MyNumberBadge';

const NumberSettingsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <Link
              to="/settings"
              className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Settings
            </Link>
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Business Phone Number
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 mt-2">
            Manage your dedicated business phone number for SMS communications
          </p>
        </div>

        {/* Content */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Your Business Number
            </h3>
            <MyNumberBadge />
          </div>
          
          {/* Information Section */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-6">
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
              How It Works
            </h3>
            <div className="space-y-3 text-blue-800 dark:text-blue-200">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-200 dark:bg-blue-800 rounded-full flex items-center justify-center text-blue-800 dark:text-blue-200 text-sm font-semibold flex-shrink-0 mt-0.5">
                  1
                </div>
                <p>
                  Your business phone number is automatically provisioned when your seat is created
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-200 dark:bg-blue-800 rounded-full flex items-center justify-center text-blue-800 dark:text-blue-200 text-sm font-semibold flex-shrink-0 mt-0.5">
                  2
                </div>
                <p>
                  Send SMS messages to leads from your business number
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-200 dark:bg-blue-800 rounded-full flex items-center justify-center text-blue-800 dark:text-blue-200 text-sm font-semibold flex-shrink-0 mt-0.5">
                  3
                </div>
                <p>
                  Receive and respond to incoming SMS messages from leads
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-200 dark:bg-blue-800 rounded-full flex items-center justify-center text-blue-800 dark:text-blue-200 text-sm font-semibold flex-shrink-0 mt-0.5">
                  4
                </div>
                <p>
                  All conversations are automatically logged and synced in real-time
                </p>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Features
              </h3>
              <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                <li>• Auto-provisioned business phone number</li>
                <li>• Send SMS to any lead</li>
                <li>• Receive inbound SMS messages</li>
                <li>• Real-time message synchronization</li>
                <li>• Message delivery status tracking</li>
                <li>• Threaded conversation view</li>
                <li>• Automatic number management</li>
              </ul>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Pricing
              </h3>
              <div className="space-y-3 text-gray-600 dark:text-gray-400">
                <div className="flex justify-between">
                  <span>Phone Number</span>
                  <span className="font-medium">$1/month</span>
                </div>
                <div className="flex justify-between">
                  <span>Outbound SMS</span>
                  <span className="font-medium">$0.0079/message</span>
                </div>
                <div className="flex justify-between">
                  <span>Inbound SMS</span>
                  <span className="font-medium">$0.0079/message</span>
                </div>
                <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
                  <div className="flex justify-between font-medium">
                    <span>Estimated monthly</span>
                    <span>~$5-15</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NumberSettingsPage;
