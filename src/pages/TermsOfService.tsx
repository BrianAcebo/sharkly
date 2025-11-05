import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileText, Scale, AlertTriangle, CheckCircle, Shield } from 'lucide-react';

const TermsOfService: React.FC = () => {
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
            <FileText className="w-8 h-8 text-blue-600 mr-3" />
            <h1 className="text-3xl font-bold text-gray-900">Terms of Service</h1>
          </div>
          <p className="text-gray-600">Last updated: {new Date().toLocaleDateString()}</p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="prose prose-lg max-w-none">
            <p className="text-gray-700 mb-6">
              These Terms of Service ("Terms") govern your use of True Sight ("Service") operated by True Sight ("we," "our," or "us"). By accessing or using our Service, you agree to be bound by these Terms.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4 flex items-center">
              <CheckCircle className="w-6 h-6 mr-2 text-blue-600" />
              Acceptance of Terms
            </h2>
            <p className="text-gray-700 mb-4">
              By using our Service, you confirm that you have read, understood, and agree to be bound by these Terms. If you do not agree to these Terms, you must not use our Service.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4 flex items-center">
              <Scale className="w-6 h-6 mr-2 text-blue-600" />
              Description of Service
            </h2>
            <p className="text-gray-700 mb-4">
              True Sight is a customer relationship management platform that provides:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
              <li>Lead and customer management tools</li>
              <li>Task and project tracking</li>
              <li>Communication and notification systems</li>
              <li>Data analytics and reporting</li>
              <li>Team collaboration features</li>
              <li>Integration capabilities with third-party services</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4 flex items-center">
              <Shield className="w-6 h-6 mr-2 text-blue-600" />
              User Accounts and Registration
            </h2>
            <p className="text-gray-700 mb-4">
              To access certain features of our Service, you must create an account. You agree to:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
              <li>Provide accurate, current, and complete information</li>
              <li>Maintain and update your account information</li>
              <li>Keep your account credentials secure and confidential</li>
              <li>Accept responsibility for all activities under your account</li>
              <li>Notify us immediately of any unauthorized use</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4 flex items-center">
              <AlertTriangle className="w-6 h-6 mr-2 text-blue-600" />
              Acceptable Use
            </h2>
            <p className="text-gray-700 mb-4">
              You agree to use our Service only for lawful purposes and in accordance with these Terms. You must not:
            </p>
            <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
              <li>Use the Service for any illegal or unauthorized purpose</li>
              <li>Violate any applicable laws or regulations</li>
              <li>Infringe on intellectual property rights</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Interfere with or disrupt the Service</li>
              <li>Upload malicious code or content</li>
              <li>Use the Service to send spam or unsolicited communications</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Data and Privacy</h2>
            <p className="text-gray-700 mb-4">
              Your privacy is important to us. Our collection and use of personal information is governed by our Privacy Policy, which is incorporated into these Terms by reference.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Intellectual Property</h2>
            <p className="text-gray-700 mb-4">
              The Service and its original content, features, and functionality are owned by True Sight and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">User Content</h2>
            <p className="text-gray-700 mb-4">
              You retain ownership of any content you submit to our Service. By submitting content, you grant us a worldwide, non-exclusive, royalty-free license to use, reproduce, modify, and distribute your content solely for the purpose of providing our Service.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Service Availability</h2>
            <p className="text-gray-700 mb-4">
              We strive to maintain high availability of our Service, but we do not guarantee uninterrupted access. We may temporarily suspend or restrict access to the Service for maintenance, updates, or other operational reasons.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Limitation of Liability</h2>
            <p className="text-gray-700 mb-4">
              To the maximum extent permitted by law, True Sight shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, or use, arising out of or relating to your use of the Service.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Disclaimer of Warranties</h2>
            <p className="text-gray-700 mb-4">
              The Service is provided "as is" and "as available" without any warranties of any kind, either express or implied. We disclaim all warranties, including but not limited to implied warranties of merchantability, fitness for a particular purpose, and non-infringement.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Indemnification</h2>
            <p className="text-gray-700 mb-4">
              You agree to indemnify and hold harmless True Sight from any claims, damages, losses, or expenses arising out of or relating to your use of the Service or violation of these Terms.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Termination</h2>
            <p className="text-gray-700 mb-4">
              We may terminate or suspend your account and access to the Service at any time, with or without cause, with or without notice. Upon termination, your right to use the Service will cease immediately.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Governing Law</h2>
            <p className="text-gray-700 mb-4">
              These Terms shall be governed by and construed in accordance with the laws of [Your Jurisdiction], without regard to its conflict of law provisions.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Changes to Terms</h2>
            <p className="text-gray-700 mb-4">
              We reserve the right to modify these Terms at any time. We will notify users of any material changes by posting the new Terms on this page. Your continued use of the Service after such modifications constitutes acceptance of the updated Terms.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Contact Information</h2>
            <p className="text-gray-700 mb-4">
              If you have any questions about these Terms of Service, please contact us:
            </p>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-gray-700">
                <strong>Email:</strong> legal@paperboatcrm.com<br />
                <strong>Address:</strong> [Your Company Address]<br />
                <strong>Phone:</strong> [Your Phone Number]
              </p>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                These Terms of Service are effective as of the date listed above and will remain in effect except with respect to any changes in their provisions in the future, which will be in effect immediately after being posted on this page.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
