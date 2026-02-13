import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    const commit =
        process.env.VERCEL_GIT_COMMIT_SHA ||
        process.env.GITHUB_SHA ||
        null;

    const branch =
        process.env.VERCEL_GIT_COMMIT_REF ||
        process.env.GITHUB_REF_NAME ||
        null;

    const repo =
        process.env.VERCEL_GIT_REPO_SLUG ||
        process.env.GITHUB_REPOSITORY ||
        null;

    const vercelEnv = process.env.VERCEL_ENV || null;

    return NextResponse.json({
        commit,
        branch,
        repo,
        vercelEnv,
        nodeEnv: process.env.NODE_ENV
    });
}

