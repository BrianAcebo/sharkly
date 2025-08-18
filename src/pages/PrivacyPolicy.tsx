import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, Lock, Eye, Database, Users, Globe } from 'lucide-react';

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link 
            to="/" 
            className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
          <div className="flex items-center mb-4">
            <Shield className="w-8 h-8 text-blue-600 mr-3" />
            <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
          </div>
          <p className="text-gray-600">Last updated: {new Date().toLocaleDateString()}</p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="prose prose-lg max-w-none">
            <p className="text-gray-700 mb-6">
              Paperboat CRM ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our customer relationship management service.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4 flex items-center">
              <Lock className="w-6 h-6 mr-2 text-blue-600" />
              Information We Collect
            </h2>
            
            <h3 className="text-xl font-medium text-gray-800 mt-6 mb-3">Personal Information</h3>
            <p className="text-gray-700 mb-4">
              We collect information you provide directly to us, such as when you create an account, use our services, or contact us for support:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
              <li>Name, email address, and contact information</li>
              <li>Company and organization details</li>
              <li>Account credentials and profile information</li>
              <li>Communication preferences and settings</li>
            </ul>

            <h3 className="text-xl font-medium text-gray-800 mt-6 mb-3">Business Data</h3>
            <p className="text-gray-700 mb-4">
              As a CRM service, we process business-related information you store in our system:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
              <li>Customer and lead information</li>
              <li>Task and project details</li>
              <li>Communication history and notes</li>
              <li>Business documents and files</li>
            </ul>

            <h3 className="text-xl font-medium text-gray-800 mt-6 mb-3">Usage Information</h3>
            <p className="text-gray-700 mb-4">
              We automatically collect certain information about your use of our services:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
              <li>Log data and device information</li>
              <li>Usage patterns and feature interactions</li>
              <li>Performance and error data</li>
              <li>IP address and browser information</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4 flex items-center">
              <Eye className="w-6 h-6 mr-2 text-blue-600" />
              How We Use Your Information
            </h2>
            <p className="text-gray-700 mb-4">
              We use the information we collect to:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
              <li>Provide, maintain, and improve our CRM services</li>
              <li>Process transactions and manage your account</li>
              <li>Send notifications and important updates</li>
              <li>Respond to your requests and provide support</li>
              <li>Analyze usage patterns to enhance user experience</li>
              <li>Ensure security and prevent fraud</li>
              <li>Comply with legal obligations</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4 flex items-center">
              <Database className="w-6 h-6 mr-2 text-blue-600" />
              Data Storage and Security
            </h2>
            <p className="text-gray-700 mb-4">
              We implement appropriate technical and organizational measures to protect your data:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
              <li>Data encryption in transit and at rest</li>
              <li>Regular security assessments and updates</li>
              <li>Access controls and authentication measures</li>
              <li>Secure data centers and infrastructure</li>
              <li>Regular backups and disaster recovery procedures</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4 flex items-center">
              <Users className="w-6 h-6 mr-2 text-blue-600" />
              Data Sharing and Disclosure
            </h2>
            <p className="text-gray-700 mb-4">
              We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
              <li>With your explicit consent</li>
              <li>To comply with legal requirements</li>
              <li>To protect our rights and safety</li>
              <li>With trusted service providers who assist in operating our service</li>
              <li>In connection with a business transfer or merger</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4 flex items-center">
              <Globe className="w-6 h-6 mr-2 text-blue-600" />
              Data Retention and Your Rights
            </h2>
            <p className="text-gray-700 mb-4">
              We retain your information for as long as necessary to provide our services and comply with legal obligations. You have the right to:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
              <li>Access and review your personal information</li>
              <li>Correct inaccurate or incomplete data</li>
              <li>Request deletion of your personal information</li>
              <li>Export your data in a portable format</li>
              <li>Opt-out of certain communications</li>
              <li>Lodge a complaint with supervisory authorities</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Contact Us</h2>
            <p className="text-gray-700 mb-4">
              If you have any questions about this Privacy Policy or our data practices, please contact us:
            </p>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-gray-700">
                <strong>Email:</strong> privacy@paperboatcrm.com<br />
                <strong>Address:</strong> [Your Company Address]<br />
                <strong>Phone:</strong> [Your Phone Number]
              </p>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                This Privacy Policy is effective as of the date listed above and will remain in effect except with respect to any changes in its provisions in the future, which will be in effect immediately after being posted on this page.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
