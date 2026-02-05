'use client';

import React from 'react';
import { LandingPage as SharedLandingPage } from '../components/LandingPage';
import { useRouter } from 'next/navigation';

export default function LandingPageRoute() {
    const router = useRouter();

    const handleGetStarted = () => {
        router.push('/?action=signup');
    };

    const handleLogin = () => {
        router.push('/login');
    };

    return (
        <SharedLandingPage
            onGetStarted={handleGetStarted}
            onLogin={handleLogin}
        />
    );
}
