'use client';

import React from 'react';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function PrivacyPolicyPage() {
    return (
        <div className="min-h-screen bg-[#050505] text-white font-outfit">
            <div className="max-w-3xl mx-auto px-6 py-16">
                {/* Back */}
                <Link href="/" className="inline-flex items-center gap-2 text-white/40 hover:text-white text-sm mb-10 transition-colors">
                    <ArrowLeft size={16} />
                    Back to Home
                </Link>

                <h1 className="text-4xl font-bold mb-2 tracking-tight">Privacy Policy</h1>
                <p className="text-white/40 text-sm mb-12">Last updated: February 2026</p>

                <div className="space-y-10 text-white/60 leading-relaxed">
                    <section>
                        <h2 className="text-xl font-bold text-white mb-4">1. Introduction</h2>
                        <p>
                            VisioCorp (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) operates the Visio AI platform. This Privacy Policy explains
                            how we collect, use, disclose, and safeguard your information when you use our service.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-4">2. Information We Collect</h2>
                        <p className="mb-3">We collect the following types of information:</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li><strong className="text-white/80">Account Information:</strong> Name, email address, and password when you create an account.</li>
                            <li><strong className="text-white/80">Profile Information:</strong> Artist or label details you provide, including genre, social media links, and career goals.</li>
                            <li><strong className="text-white/80">Usage Data:</strong> Chat sessions, search queries, and interactions with the AI assistant.</li>
                            <li><strong className="text-white/80">Payment Information:</strong> Billing details processed securely through Yoco, our payment provider. We do not store full card numbers.</li>
                            <li><strong className="text-white/80">Device Data:</strong> Browser type, IP address, and device identifiers for security and analytics.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-4">3. How We Use Your Information</h2>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>To provide, operate, and improve the Visio AI service.</li>
                            <li>To personalize AI recommendations based on your profile and goals.</li>
                            <li>To process transactions and manage your subscription.</li>
                            <li>To communicate with you about updates, support, and promotional offers.</li>
                            <li>To detect and prevent fraud, abuse, and security incidents.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-4">4. Data Sharing</h2>
                        <p>
                            We do not sell your personal information. We may share data with trusted third-party services:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 mt-3">
                            <li><strong className="text-white/80">Supabase:</strong> Database and authentication services.</li>
                            <li><strong className="text-white/80">Google Gemini:</strong> AI model processing for chat and search features.</li>
                            <li><strong className="text-white/80">Yoco:</strong> Payment processing.</li>
                            <li><strong className="text-white/80">Vercel:</strong> Hosting and deployment infrastructure.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-4">5. Data Security</h2>
                        <p>
                            We use industry-standard encryption (TLS/SSL), secure authentication, and access controls to protect your data.
                            However, no method of electronic transmission is 100% secure, and we cannot guarantee absolute security.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-4">6. Your Rights</h2>
                        <p className="mb-3">You have the right to:</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Access, correct, or delete your personal data.</li>
                            <li>Export your data in a portable format.</li>
                            <li>Opt out of marketing communications.</li>
                            <li>Request account deletion by contacting support.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-4">7. Cookies</h2>
                        <p>
                            We use essential cookies for authentication and session management. We do not use third-party tracking cookies
                            without your consent.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-4">8. Changes to This Policy</h2>
                        <p>
                            We may update this policy from time to time. We will notify you of significant changes by posting
                            a notice on our platform or sending you an email.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-4">9. Contact Us</h2>
                        <p>
                            If you have questions about this Privacy Policy, please contact us at{' '}
                            <a href="mailto:admin@visiocorp.co" className="text-visio-teal hover:underline">admin@visiocorp.co</a>.
                        </p>
                    </section>
                </div>

                <div className="mt-16 pt-8 border-t border-white/10 text-center text-xs text-white/20">
                    © 2026 VisioCorp & Touchline Agency. All rights reserved.
                </div>
            </div>
        </div>
    );
}
