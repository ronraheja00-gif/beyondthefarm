import { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sprout, Truck, Store, LogOut, User, Menu } from 'lucide-react';
import { AppRole } from '@/types/database';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: ReactNode;
}

const roleConfig = {
  farmer: {
    icon: Sprout,
    label: 'Farmer',
    gradient: 'gradient-farmer',
    color: 'text-farmer',
  },
  transporter: {
    icon: Truck,
    label: 'Transporter',
    gradient: 'gradient-transporter',
    color: 'text-transporter',
  },
  vendor: {
    icon: Store,
    label: 'Vendor',
    gradient: 'gradient-vendor',
    color: 'text-vendor',
  },
};

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { profile, signOut } = useAuth();

  if (!profile) return null;

  const config = roleConfig[profile.role as AppRole];
  const RoleIcon = config.icon;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-sm">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', config.gradient)}>
              <Sprout className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-none">Beyond the Farm</h1>
              <p className="text-xs text-muted-foreground">Crop Quality Tracking</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className={cn('hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary')}>
              <RoleIcon className={cn('h-4 w-4', config.color)} />
              <span className="text-sm font-medium">{config.label}</span>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className={cn(config.gradient, 'text-white')}>
                      {profile.full_name?.[0]?.toUpperCase() || profile.email[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {profile.full_name || 'User'}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {profile.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="flex items-center gap-2">
                  <RoleIcon className="h-4 w-4" />
                  <span>{config.label} Account</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="flex items-center gap-2 text-destructive">
                  <LogOut className="h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container px-4 py-6">
        {children}
      </main>
    </div>
  );
}
