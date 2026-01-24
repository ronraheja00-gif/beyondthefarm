import { useState } from 'react';
import { AuthForm } from '@/components/auth/AuthForm';
import { Sprout, Truck, Store, ArrowRight, Leaf, Shield, Brain } from 'lucide-react';

export function AuthPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background">
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[calc(100vh-4rem)]">
          {/* Left side - Branding */}
          <div className="space-y-8 text-center lg:text-left">
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-primary/10 text-primary">
              <Sprout className="h-5 w-5" />
              <span className="font-medium">Beyond the Farm</span>
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl font-bold leading-tight">
                Track Your Crop Quality{' '}
                <span className="text-gradient-primary">From Farm to Market</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0">
                A complete post-harvest quality tracking system powered by AI. Connect farmers,
                transporters, and vendors in one seamless platform.
              </p>
            </div>

            {/* Role cards */}
            <div className="grid sm:grid-cols-3 gap-4 max-w-xl mx-auto lg:mx-0">
              <div className="p-4 rounded-xl bg-farmer/10 border border-farmer/20">
                <Sprout className="h-8 w-8 text-farmer mb-2" />
                <h3 className="font-semibold text-farmer">Farmers</h3>
                <p className="text-sm text-muted-foreground">Create batches & track quality</p>
              </div>
              <div className="p-4 rounded-xl bg-transporter/10 border border-transporter/20">
                <Truck className="h-8 w-8 text-transporter mb-2" />
                <h3 className="font-semibold text-transporter">Transporters</h3>
                <p className="text-sm text-muted-foreground">Safe pickup & delivery</p>
              </div>
              <div className="p-4 rounded-xl bg-vendor/10 border border-vendor/20">
                <Store className="h-8 w-8 text-vendor mb-2" />
                <h3 className="font-semibold text-vendor">Vendors</h3>
                <p className="text-sm text-muted-foreground">Receive & grade shipments</p>
              </div>
            </div>

            {/* Features */}
            <div className="flex flex-wrap justify-center lg:justify-start gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Leaf className="h-4 w-4 text-primary" />
                <span>Environmental Tracking</span>
              </div>
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" />
                <span>AI Analysis</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <span>GPS Verified</span>
              </div>
            </div>
          </div>

          {/* Right side - Auth Form */}
          <div className="flex justify-center">
            <AuthForm mode={mode} onModeChange={setMode} />
          </div>
        </div>
      </div>
    </div>
  );
}
