import React, { useEffect } from 'react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

const PrivacyPolicy = () => {
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-between">
      <Navbar />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-10 max-w-4xl flex-grow">
        <div className="bg-white p-6 sm:p-10 rounded-xl shadow-sm border border-gray-200">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
          <p className="text-sm text-gray-500 mb-8 pb-4 border-b border-gray-100">
            Last Updated: <span className="font-medium text-gray-700">September 17, 2026</span>
          </p>

          <div className="space-y-8 text-gray-700 text-sm sm:text-base leading-relaxed">
            {/* 1. Introduction */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Introduction</h2>
              <p>
                Welcome to <strong>Job Node AI</strong> ("we", "our", or "us"). Job Node AI is a modern web-based career platform designed to help candidates discover job opportunities, evaluate resumes using AI technology, practice mock interviews, and receive relevant job notifications.
              </p>
              <p className="mt-2">
                We value your privacy and are committed to protecting the personal information you share with us. This Privacy Policy explains how we collect, use, store, and safeguard your data when you use our platform at{' '}
                <a href="https://job-node.vercel.app" className="text-blue-600 hover:underline">
                  https://job-node.vercel.app
                </a>.
              </p>
            </section>

            {/* 2. Information We Collect */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Information We Collect</h2>
              <p className="mb-3">We collect information that you voluntarily provide to us when using Job Node AI:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-600">
                <li>
                  <strong className="text-gray-800">Account Information:</strong> Name, email address, and profile photo provided during account creation or via authentication services (such as Clerk).
                </li>
                <li>
                  <strong className="text-gray-800">Resume & Application Details:</strong> Work experience, education history, skills, uploaded resume files, and job applications submitted through the platform.
                </li>
                <li>
                  <strong className="text-gray-800">Job Preferences:</strong> Preferred job categories, locations, experience levels, and targeted skills configured in your candidate profile.
                </li>
                <li>
                  <strong className="text-gray-800">WhatsApp Notification Data:</strong> Your phone number with country code and your explicit WhatsApp job alert opt-in preference, if you choose to enable WhatsApp alerts.
                </li>
              </ul>
            </section>

            {/* 3. How We Use Information */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">3. How We Use Information</h2>
              <p className="mb-3">We use the collected information for the following purposes:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-600">
                <li>To display relevant job listings and enable candidate job applications.</li>
                <li>To compute job match scores based on candidate skills, preferred locations, and categories.</li>
                <li>To provide interactive AI tools, including resume analysis and AI mock interview feedback.</li>
                <li>To deliver automated job alert notifications via WhatsApp when matched with new job postings.</li>
                <li>To ensure platform security, troubleshoot technical issues, and improve user experience.</li>
              </ul>
            </section>

            {/* 4. WhatsApp Notifications */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">4. WhatsApp Notifications</h2>
              <p className="mb-3">
                Job Node AI offers an optional WhatsApp job alert feature to notify candidates about newly posted job opportunities:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-600">
                <li>
                  <strong className="text-gray-800">Opt-In Required:</strong> Receiving WhatsApp notifications is completely optional. Notifications are only enabled when you explicitly enter your phone number and check the opt-in consent box in your application preferences.
                </li>
                <li>
                  <strong className="text-gray-800">Relevant Matching:</strong> Job alerts are evaluated using a rule-based matching system that compares job requirements against your configured skills, locations, and categories.
                </li>
                <li>
                  <strong className="text-gray-800">Service Provider:</strong> WhatsApp messages are transmitted through Meta’s official WhatsApp Business Cloud API (Meta Platforms, Inc.).
                </li>
                <li>
                  <strong className="text-gray-800">Easy Opt-Out:</strong> You can uncheck the WhatsApp opt-in box or remove your phone number in your profile settings at any time to stop receiving messages.
                </li>
                <li>
                  <strong className="text-gray-800">No Data Selling:</strong> We <strong className="text-gray-900 underline">do not sell, rent, or trade</strong> your phone number or personal data to advertisers or third parties.
                </li>
              </ul>
            </section>

            {/* 5. Data Storage and Security */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Data Storage & Security</h2>
              <p>
                We employ industry-standard security measures, including HTTPS encryption in transit, secure database authentication, and role-based authorization to protect your personal data. API keys and sensitive tokens are kept in secure environment variables and are never exposed to public client interfaces.
              </p>
            </section>

            {/* 6. Third-Party Services */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Third-Party Services</h2>
              <p className="mb-3">Job Node AI integrates with reputable third-party service providers for core functionality:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-600">
                <li><strong className="text-gray-800">Clerk:</strong> For identity management and secure authentication.</li>
                <li><strong className="text-gray-800">Meta Platforms (WhatsApp Cloud API):</strong> For sending job alert template messages.</li>
                <li><strong className="text-gray-800">Google Gemini AI:</strong> For optional resume analysis and mock interview generation.</li>
                <li><strong className="text-gray-800">Cloudinary:</strong> For secure storage of resume files and images.</li>
                <li><strong className="text-gray-800">Vercel:</strong> For web hosting and application deployment.</li>
              </ul>
            </section>

            {/* 7. Cookies & Local Storage */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Cookies & Local Storage</h2>
              <p>
                We use essential browser cookies and local storage tokens strictly to maintain your logged-in session, remember security tokens, and preserve your UI preferences. We do not use cross-site tracking cookies.
              </p>
            </section>

            {/* 8. Data Retention */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Data Retention</h2>
              <p>
                We retain your account information and job preferences for as long as your account remains active on Job Node AI. You can update or delete your profile information at any time directly through your dashboard or profile settings.
              </p>
            </section>

            {/* 9. User Rights and Choices */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">9. User Rights and Choices</h2>
              <p>
                You have the right to access, update, or remove your personal data stored on Job Node AI. You may also modify your communication choices (such as disabling WhatsApp job alerts) whenever you wish without restricting access to other platform features.
              </p>
            </section>

            {/* 10. Children's Privacy */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Children's Privacy</h2>
              <p>
                Job Node AI is intended for general job seekers and students aged 16 and older. We do not knowingly collect or solicit personal information from children under the age of 13.
              </p>
            </section>

            {/* 11. Changes to This Privacy Policy */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">11. Changes to This Privacy Policy</h2>
              <p>
                We may update this Privacy Policy from time to time to reflect platform improvements or legal requirements. Any modifications will be posted directly on this page with a revised "Last Updated" date.
              </p>
            </section>

            {/* 12. Contact Information */}
            <section className="pt-4 border-t border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">12. Contact Us</h2>
              <p className="mb-2">
                If you have any questions, concerns, or requests regarding this Privacy Policy or your data, please contact us at:
              </p>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-sm space-y-1">
                <p><strong>Platform:</strong> Job Node AI</p>
                <p><strong>Email:</strong> support@jobnode.com</p>
                <p><strong>Location:</strong> Mumbai, India</p>
                <p><strong>Website:</strong> <a href="https://job-node.vercel.app" className="text-blue-600 hover:underline">https://job-node.vercel.app</a></p>
              </div>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

export default PrivacyPolicy
