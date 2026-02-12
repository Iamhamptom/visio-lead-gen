'use client';

import React from 'react';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function TermsOfServicePage() {
    return (
        <div className="min-h-screen bg-[#050505] text-white font-outfit">
            <div className="max-w-3xl mx-auto px-6 py-16">
                {/* Back */}
                <Link href="/" className="inline-flex items-center gap-2 text-white/40 hover:text-white text-sm mb-10 transition-colors">
                    <ArrowLeft size={16} />
                    Back to Home
                </Link>

                <h1 className="text-4xl font-bold mb-2 tracking-tight">Terms of Service</h1>
                <p className="text-white/40 text-sm mb-12">Last updated: February 2026</p>

                <div className="space-y-10 text-white/60 leading-relaxed">
                    <section>
                        <h2 className="text-xl font-bold text-white mb-4">1. Acceptance of Terms</h2>
                        <p>
                            By accessing or using the Visio AI platform (&quot;Service&quot;), you agree to be bound by these Terms of Service.
                            If you do not agree to these terms, please do not use the Service. The Service is operated by
                            VisioCorp (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;).
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-4">2. Description of Service</h2>
                        <p>
                            Visio AI is an AI-powered public relations assistant for the music and entertainment industry.
                            It helps users discover media contacts, draft pitches, manage leads, and plan PR campaigns.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-4">3. Account Registration</h2>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>You must provide accurate and complete information when creating an account.</li>
                            <li>You are responsible for maintaining the security of your account credentials.</li>
                            <li>You must be at least 18 years old to use the Service.</li>
                            <li>Accounts are subject to manual approval before full access is granted.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-4">4. Subscription & Payments</h2>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Some features require a paid subscription. Prices are listed on our Billing page.</li>
                            <li>Payments are processed securely through Yoco. All amounts are in South African Rand (ZAR) unless stated otherwise.</li>
                            <li>Subscriptions renew automatically unless cancelled before the renewal date.</li>
                            <li>Refunds are handled on a case-by-case basis. Contact support to request a refund.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-4">5. Acceptable Use</h2>
                        <p className="mb-3">When using the Service, you agree not to:</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Use the Service for spam, harassment, or any unlawful purpose.</li>
                            <li>Attempt to reverse-engineer or exploit the Service&apos;s AI capabilities.</li>
                            <li>Share your account credentials with unauthorized users.</li>
                            <li>Scrape, harvest, or bulk-export data from the Service without authorization.</li>
                            <li>Use the Service to generate misleading or fraudulent content.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-4">6. AI-Generated Content</h2>
                        <p>
                            The Service uses artificial intelligence to provide suggestions, search results, and generated content.
                            While we strive for accuracy, AI outputs may contain errors. You are responsible for verifying
                            any information before acting on it. We do not guarantee the accuracy, completeness, or reliability
                            of AI-generated content.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-4">7. Intellectual Property</h2>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>The Service, its design, and underlying technology are owned by VisioCorp.</li>
                            <li>Content you create through the Service (e.g., saved leads, drafts) remains yours.</li>
                            <li>You grant us a limited license to use your content for providing and improving the Service.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-4">8. Limitation of Liability</h2>
                        <p>
                            To the maximum extent permitted by law, VisioCorp shall not be liable for any indirect,
                            incidental, consequential, or punitive damages arising from your use of the Service.
                            Our total liability shall not exceed the amount you paid for the Service in the 12 months
                            preceding the claim.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-4">9. Termination</h2>
                        <p>
                            We reserve the right to suspend or terminate your account at any time for violations of
                            these Terms. You may delete your account at any time by contacting support. Upon termination,
                            your right to access the Service ceases immediately.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-4">10. Changes to Terms</h2>
                        <p>
                            We may modify these Terms at any time. Continued use of the Service after changes
                            constitutes acceptance of the updated Terms. We will notify you of material changes
                            via email or in-app notification.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-4">11. Governing Law</h2>
                        <p>
                            These Terms are governed by and construed in accordance with the laws of South Africa.
                            Any disputes shall be resolved in the courts of South Africa.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-white mb-4">12. Contact Us</h2>
                        <p>
                            For any questions about these Terms of Service, please contact us at{' '}
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
