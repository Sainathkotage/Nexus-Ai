'use client';

import React, { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function InvitePage() {
  const router = useRouter();
  const params = useParams();
  const code = params.code as string;

  useEffect(() => {
    if (code) {
      router.push(`/?inviteCode=${code}`);
    }
  }, [code, router]);

  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <div className="flex flex-col items-center gap-3">
        <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-xs text-muted-foreground">Redirecting to your team workspace invite...</p>
      </div>
    </main>
  );
}
