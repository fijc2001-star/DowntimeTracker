import React from 'react';
import { useAppStore } from '@/lib/store';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, ShieldCheck, HardHat } from 'lucide-react';

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { login } = useAppStore();
  const [email, setEmail] = React.useState('');

  const handleLogin = (role: 'admin' | 'operator', isGoogle = false) => {
    const loginEmail = isGoogle ? (email || 'user@gmail.com') : (email || `${role}@factory.com`);
    
    // Small delay for effect
    setTimeout(() => {
      login(loginEmail, role);
      setLocation('/');
    }, 500);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background relative overflow-hidden">
      {/* Abstract Background Elements */}
      <div className="absolute inset-0 z-0 opacity-10 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,var(--primary)_0%,transparent_50%)] blur-[100px]" />
        <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-[radial-gradient(ellipse_at_center,var(--secondary)_0%,transparent_60%)] blur-[80px]" />
      </div>

      <div className="relative z-10 w-full max-w-md p-4">
        <div className="mb-8 text-center space-y-2">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary shadow-2xl shadow-primary/20 mb-4 border border-white/10">
            <Activity className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-4xl font-display font-bold tracking-tight text-foreground">DOWNTIME<span className="text-primary">.OS</span></h1>
          <p className="text-muted-foreground">Manufacturing Intelligence System</p>
        </div>

        <Card className="border-sidebar-border bg-card/50 backdrop-blur-xl shadow-2xl">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Select your role to access the system.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            <Button 
              variant="outline" 
              className="w-full mb-6 relative h-12 border-primary/20 hover:bg-primary/5 hover:text-primary transition-colors"
              onClick={() => handleLogin('operator', true)}
            >
              <svg className="mr-2 h-5 w-5" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
              </svg>
              Sign in with Google
            </Button>

            <Tabs defaultValue="operator" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="operator">Operator</TabsTrigger>
                <TabsTrigger value="admin">Admin</TabsTrigger>
              </TabsList>
              
              <TabsContent value="operator" className="space-y-4">
                <div className="p-4 rounded-lg bg-secondary/10 border border-secondary/20 flex gap-3 items-start">
                  <HardHat className="h-5 w-5 text-primary mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-foreground">Operator Access</p>
                    <p className="text-muted-foreground mt-1">Start/Stop downtime events and log reasons for assigned stations.</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Badge ID / Email</Label>
                  <Input 
                    placeholder="operator@factory.com" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    className="font-mono"
                  />
                </div>
                <Button 
                  className="w-full text-lg h-12" 
                  onClick={() => handleLogin('operator')}
                >
                  Login as Operator
                </Button>
              </TabsContent>
              
              <TabsContent value="admin" className="space-y-4">
                <div className="p-4 rounded-lg bg-secondary/10 border border-secondary/20 flex gap-3 items-start">
                  <ShieldCheck className="h-5 w-5 text-primary mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-foreground">Administrator Access</p>
                    <p className="text-muted-foreground mt-1">Full system configuration, analytics dashboards, and user management.</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Admin Credentials</Label>
                  <Input 
                    placeholder="admin@factory.com" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    className="font-mono"
                  />
                </div>
                <Button 
                  className="w-full text-lg h-12" 
                  onClick={() => handleLogin('admin')}
                >
                  Login as Admin
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        
        <p className="text-center text-xs text-muted-foreground mt-8 font-mono opacity-50">
          V1.0.4 BUILD 2024.05 // AUTH_SECURE
        </p>
      </div>
    </div>
  );
}
