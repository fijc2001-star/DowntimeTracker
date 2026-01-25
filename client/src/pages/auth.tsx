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

  const handleLogin = (role: 'admin' | 'operator') => {
    if (!email) {
      setEmail(`${role}@factory.com`);
    }
    // Small delay for effect
    setTimeout(() => {
      login(email || `${role}@factory.com`, role);
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
