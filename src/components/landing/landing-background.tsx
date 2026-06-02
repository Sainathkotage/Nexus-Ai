'use client';

export function LandingBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 120% 80% at 50% -20%, rgba(88, 28, 135, 0.45) 0%, transparent 55%), radial-gradient(ellipse 80% 60% at 100% 50%, rgba(59, 7, 100, 0.35) 0%, transparent 50%), linear-gradient(165deg, #06060f 0%, #0f0a1a 35%, #12082a 70%, #08060f 100%)',
        }}
      />
      <div
        className="absolute -top-32 -left-32 w-[520px] h-[520px] rounded-full opacity-40 blur-[100px]"
        style={{ background: 'radial-gradient(circle, rgba(251, 191, 36, 0.35) 0%, transparent 70%)' }}
      />
      <div
        className="absolute top-1/3 right-0 w-[400px] h-[400px] rounded-full opacity-30 blur-[90px]"
        style={{ background: 'radial-gradient(circle, rgba(168, 85, 247, 0.4) 0%, transparent 70%)' }}
      />
      <div
        className="absolute bottom-0 left-1/3 w-[500px] h-[300px] rounded-full opacity-25 blur-[80px]"
        style={{ background: 'radial-gradient(circle, rgba(236, 72, 153, 0.25) 0%, transparent 70%)' }}
      />
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />
    </div>
  );
}
