import { useState } from 'react';
import { AuthForm } from '@/components/auth/AuthForm';
import { Sprout, Truck, Store, Leaf, Shield, Brain } from 'lucide-react';

const SPLINE_EMBED_URL =
  'https://my.spline.design/nexbotbyaximoriscopycopy-UM9H9JTgyCAde3Y2lbv8De3h/';

export function AuthPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Spline 3D Background - fullscreen, centered, interactive */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-background/80 via-background/60 to-background/80 z-10 pointer-events-none" />
        <iframe
          title="Beyond the Farm 3D Background"
          src={SPLINE_EMBED_URL}
          className="h-full w-full border-0"
          allow="autoplay; fullscreen"
          loading="eager"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>

      {/* Content overlay */}
      <div className="relative z-20 min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[calc(100vh-4rem)]">
            {/* Left side - Branding */}
            <div className="space-y-8 text-center lg:text-left">
              <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-primary/20 backdrop-blur-sm text-primary border border-primary/20">
                <Sprout className="h-5 w-5" />
                <span className="font-medium">Beyond the Farm</span>
              </div>

              <div className="space-y-4">
                <h1 className="text-4xl md:text-5xl font-bold leading-tight drop-shadow-lg">
                  Track Your Crop Quality{' '}
                  <span className="text-gradient-primary">From Farm to Market</span>
                </h1>
                <p className="text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 drop-shadow-sm">
                  A complete post-harvest quality tracking system powered by AI. Connect farmers,
                  transporters, and vendors in one seamless platform.
                </p>
              </div>

              {/* Role cards */}
              <div className="grid sm:grid-cols-3 gap-4 max-w-xl mx-auto lg:mx-0">
                <div className="p-4 rounded-xl bg-farmer/20 backdrop-blur-sm border border-farmer/30">
                  <Sprout className="h-8 w-8 text-farmer mb-2" />
                  <h3 className="font-semibold text-farmer">Farmers</h3>
                  <p className="text-sm text-muted-foreground">Create batches & track quality</p>
                </div>
                <div className="p-4 rounded-xl bg-transporter/20 backdrop-blur-sm border border-transporter/30">
                  <Truck className="h-8 w-8 text-transporter mb-2" />
                  <h3 className="font-semibold text-transporter">Transporters</h3>
                  <p className="text-sm text-muted-foreground">Safe pickup & delivery</p>
                </div>
                <div className="p-4 rounded-xl bg-vendor/20 backdrop-blur-sm border border-vendor/30">
                  <Store className="h-8 w-8 text-vendor mb-2" />
                  <h3 className="font-semibold text-vendor">Vendors</h3>
                  <p className="text-sm text-muted-foreground">Receive & grade shipments</p>
                </div>
              </div>

              {/* Features */}
              <div className="flex flex-wrap justify-center lg:justify-start gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2 bg-background/50 backdrop-blur-sm px-3 py-1.5 rounded-full">
                  <Leaf className="h-4 w-4 text-primary" />
                  <span>Environmental Tracking</span>
                </div>
                <div className="flex items-center gap-2 bg-background/50 backdrop-blur-sm px-3 py-1.5 rounded-full">
                  <Brain className="h-4 w-4 text-primary" />
                  <span>AI Analysis</span>
                </div>
                <div className="flex items-center gap-2 bg-background/50 backdrop-blur-sm px-3 py-1.5 rounded-full">
                  <Shield className="h-4 w-4 text-primary" />
                  <span>GPS Verified</span>
                </div>
              </div>
            </div>

            {/* Right side - Auth Form */}
            <div className="flex justify-center">
              <div className="backdrop-blur-md bg-card/80 rounded-2xl p-1 shadow-2xl border border-border/50">
                <AuthForm mode={mode} onModeChange={setMode} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
