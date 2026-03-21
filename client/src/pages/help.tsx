import React, { useState, useEffect, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  LogIn, Layers, ShieldCheck, Activity, Settings, BarChart3, Trash2,
  ChevronRight, AlertCircle, CheckCircle2, Info, Crown, UserCog, User,
  PlayCircle, StopCircle, Clock, Filter, BookOpen
} from 'lucide-react';

const SECTIONS = [
  { id: 'getting-started', label: 'Getting Started', icon: LogIn },
  { id: 'data-structure', label: 'Data Structure', icon: Layers },
  { id: 'roles-permissions', label: 'Roles & Permissions', icon: ShieldCheck },
  { id: 'operations', label: 'Day-to-Day Operations', icon: Activity },
  { id: 'administration', label: 'Administration', icon: Settings },
  { id: 'analytics', label: 'Analytics Dashboard', icon: BarChart3 },
  { id: 'data-lifecycle', label: 'Data & Deletion Rules', icon: Trash2 },
];

function SectionHeading({ id, icon: Icon, title, subtitle }: { id: string; icon: any; title: string; subtitle: string }) {
  return (
    <div id={id} className="scroll-mt-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <Separator className="mt-4 mb-6" />
    </div>
  );
}

function Callout({ type, children }: { type: 'info' | 'warning' | 'success'; children: React.ReactNode }) {
  const styles = {
    info: { bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-200 dark:border-blue-800', icon: Info, iconColor: 'text-blue-500' },
    warning: { bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-800', icon: AlertCircle, iconColor: 'text-amber-500' },
    success: { bg: 'bg-green-50 dark:bg-green-950/30', border: 'border-green-200 dark:border-green-800', icon: CheckCircle2, iconColor: 'text-green-500' },
  };
  const s = styles[type];
  const Icon = s.icon;
  return (
    <div className={`flex gap-3 rounded-lg border p-4 mb-4 ${s.bg} ${s.border}`}>
      <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${s.iconColor}`} />
      <div className="text-sm text-foreground leading-relaxed">{children}</div>
    </div>
  );
}

function RoleBadge({ role }: { role: 'owner' | 'admin' | 'operator' }) {
  const styles = {
    owner: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200 dark:border-purple-700',
    admin: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-700',
    operator: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-600',
  };
  const icons = { owner: Crown, admin: UserCog, operator: User };
  const Icon = icons[role];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles[role]}`}>
      <Icon className="h-3 w-3" />
      {role.charAt(0).toUpperCase() + role.slice(1)}
    </span>
  );
}

function PermissionTable() {
  const rows = [
    { action: 'View assigned processes & nodes', owner: true, admin: true, operator: true },
    { action: 'Log downtime events (start / stop)', owner: true, admin: true, operator: true },
    { action: 'View Analytics Dashboard', owner: true, admin: true, operator: false },
    { action: 'Create and edit processes', owner: true, admin: true, operator: false },
    { action: 'Create and edit nodes', owner: true, admin: true, operator: false },
    { action: 'Manage downtime reasons', owner: true, admin: true, operator: false },
    { action: 'Grant / revoke permissions to others', owner: true, admin: false, operator: false },
    { action: 'Delete a process permanently', owner: true, admin: false, operator: false },
  ];

  return (
    <div className="rounded-lg border overflow-hidden mb-6">
      <table className="w-full text-sm" data-testid="table-permissions">
        <thead>
          <tr className="bg-muted/50 border-b">
            <th className="text-left px-4 py-3 font-semibold text-foreground/80">Action</th>
            <th className="text-center px-4 py-3 font-semibold"><RoleBadge role="owner" /></th>
            <th className="text-center px-4 py-3 font-semibold"><RoleBadge role="admin" /></th>
            <th className="text-center px-4 py-3 font-semibold"><RoleBadge role="operator" /></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={`border-b last:border-0 ${i % 2 === 0 ? '' : 'bg-muted/20'}`}>
              <td className="px-4 py-3 text-foreground/80">{row.action}</td>
              <td className="px-4 py-3 text-center">
                {row.owner ? <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /> : <span className="text-muted-foreground/40">—</span>}
              </td>
              <td className="px-4 py-3 text-center">
                {row.admin ? <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /> : <span className="text-muted-foreground/40">—</span>}
              </td>
              <td className="px-4 py-3 text-center">
                {row.operator ? <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /> : <span className="text-muted-foreground/40">—</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4 mb-5">
      <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
        {number}
      </div>
      <div>
        <p className="font-semibold text-foreground mb-1">{title}</p>
        <div className="text-sm text-muted-foreground leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="text-base font-semibold text-foreground mb-3 mt-6">{children}</h3>;
}

export default function HelpPage() {
  const [activeSection, setActiveSection] = useState('getting-started');
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: '-20% 0px -70% 0px', threshold: 0 }
    );

    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="space-y-2">
      {/* Page Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
          <BookOpen className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground" data-testid="text-help-title">Help & Documentation</h1>
          <p className="text-sm text-muted-foreground">Everything you need to know about using Downtime.OS</p>
        </div>
      </div>

      <div className="flex gap-8 items-start">
        {/* Sticky Table of Contents */}
        <aside className="hidden lg:block w-56 shrink-0 sticky top-6">
          <Card>
            <CardContent className="p-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2">Contents</p>
              <nav className="space-y-0.5" data-testid="nav-help-toc">
                {SECTIONS.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => scrollTo(id)}
                    data-testid={`nav-help-${id}`}
                    className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-md text-sm transition-colors text-left
                      ${activeSection === id
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="leading-tight">{label}</span>
                    {activeSection === id && <ChevronRight className="h-3 w-3 ml-auto shrink-0" />}
                  </button>
                ))}
              </nav>
            </CardContent>
          </Card>
        </aside>

        {/* Main Content */}
        <div ref={contentRef} className="flex-1 min-w-0 space-y-12">

          {/* ── Getting Started ── */}
          <section>
            <SectionHeading id="getting-started" icon={LogIn} title="Getting Started" subtitle="Creating your account and signing in" />

            <SubHeading>How to Sign In</SubHeading>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              Downtime.OS supports two ways to access your account. Both options are available on the login screen.
            </p>

            <div className="grid sm:grid-cols-2 gap-4 mb-6">
              <Card className="border-2">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <LogIn className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-sm">Email & Password</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Register with any email address and choose a password. Your account is activated immediately after registration.
                  </p>
                </CardContent>
              </Card>
              <Card className="border-2">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                    <span className="font-semibold text-sm">Google Sign-In</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Use your existing Google account for one-click sign-in. No separate password required.
                  </p>
                </CardContent>
              </Card>
            </div>

            <Callout type="info">
              Sessions remain active for <strong>one week</strong>. After that period you will be automatically logged out and need to sign in again.
            </Callout>

            <SubHeading>First-Time Setup</SubHeading>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              When you first log in, the system is empty — you won't see any processes or nodes until you create them or are assigned to existing ones by another user.
            </p>
            <Step number={1} title="Create your first Process">
              Go to the <strong>Administration</strong> page and open the Administration section. Click <strong>New Process</strong>, give it a name (e.g. "Assembly Line A"), and save it. You automatically become the Owner.
            </Step>
            <Step number={2} title="Add Nodes to the Process">
              Expand your process and click <strong>Add Node</strong> to add each individual machine or piece of equipment that belongs to this production line.
            </Step>
            <Step number={3} title="Create Downtime Reasons">
              Open the <strong>Downtime Reasons</strong> section and define the failure categories your operators will choose from (e.g. "Mechanical failure", "Planned maintenance", "Material shortage").
            </Step>
            <Step number={4} title="Invite your team">
              Open the <strong>Authorization</strong> section to grant other registered users access to your processes and nodes with their appropriate roles.
            </Step>
          </section>

          {/* ── Data Structure ── */}
          <section>
            <SectionHeading id="data-structure" icon={Layers} title="Data Structure" subtitle="How information is organised in the system" />

            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              All data in Downtime.OS follows a strict three-level hierarchy. Understanding this structure helps you set up and navigate the system correctly.
            </p>

            <div className="relative pl-6 border-l-2 border-primary/30 space-y-6 mb-6">
              <div>
                <div className="absolute -left-3 h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-xs font-bold text-primary-foreground">1</span>
                </div>
                <div className="mb-1 flex items-center gap-2">
                  <span className="font-semibold text-foreground">Process</span>
                  <Badge variant="outline" className="text-xs">Top Level</Badge>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Represents a production line, workflow, or department. Each process has its own downtime reasons, its own set of nodes, and its own permission rules. Example: <em>"Assembly Line A"</em>, <em>"Packaging Department"</em>.
                </p>
              </div>

              <div>
                <div className="absolute -left-3 h-6 w-6 rounded-full bg-primary/70 flex items-center justify-center" style={{ top: 'auto' }}>
                  <span className="text-xs font-bold text-primary-foreground">2</span>
                </div>
                <div className="mb-1 flex items-center gap-2">
                  <span className="font-semibold text-foreground">Node</span>
                  <Badge variant="outline" className="text-xs">Machine / Equipment</Badge>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  An individual machine or piece of equipment within a process. Each node has a live status — either <span className="font-medium text-green-600 dark:text-green-400">Running</span> or <span className="font-medium text-red-500">Down</span>. Example: <em>"Robot Arm #3"</em>, <em>"Conveyor Belt B"</em>.
                </p>
              </div>

              <div>
                <div className="absolute -left-3 h-6 w-6 rounded-full bg-primary/40 flex items-center justify-center">
                  <span className="text-xs font-bold text-primary-foreground">3</span>
                </div>
                <div className="mb-1 flex items-center gap-2">
                  <span className="font-semibold text-foreground">Downtime Event</span>
                  <Badge variant="outline" className="text-xs">Time-stamped Record</Badge>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  A logged record of a period when a node was not operational. Every event has a start time, an end time (once resolved), and a reason. Historical events are preserved indefinitely for analytics purposes.
                </p>
              </div>
            </div>

            <SubHeading>Downtime Reasons</SubHeading>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              Each process has its own customisable list of reasons that operators select when starting a downtime event. Reasons are managed by admins and owners in the Administration page. Inactive reasons are hidden from operators but the historical data using those reasons is kept intact.
            </p>

            <Callout type="info">
              A node can only have <strong>one active downtime event at a time</strong>. You must stop the current downtime before starting a new one on the same node.
            </Callout>
          </section>

          {/* ── Roles & Permissions ── */}
          <section>
            <SectionHeading id="roles-permissions" icon={ShieldCheck} title="Roles & Permissions" subtitle="Who can do what, and how access is granted" />

            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              Every user has a role for each process or node they have access to. Roles are independent — a user can be an admin on one process and an operator on another.
            </p>

            <SubHeading>Role Descriptions</SubHeading>
            <div className="grid gap-3 mb-6">
              {[
                {
                  role: 'owner' as const,
                  title: 'Owner',
                  desc: 'Automatically assigned to the user who created the process. Has full control over everything, including permanently deleting the process and all its data. Owners are the only ones who can grant or revoke permissions.',
                },
                {
                  role: 'admin' as const,
                  title: 'Admin',
                  desc: 'Can manage the process structure — add and edit nodes, manage downtime reasons, and see the analytics dashboard. Cannot delete the process itself or manage permissions.',
                },
                {
                  role: 'operator' as const,
                  title: 'Operator',
                  desc: 'The day-to-day user. Can view their assigned processes and nodes, and log downtime events (start and stop them). Cannot access settings, reasons, permissions, or analytics.',
                },
              ].map(({ role, title, desc }) => (
                <Card key={role} className="border">
                  <CardContent className="p-4 flex gap-3">
                    <div className="pt-0.5"><RoleBadge role={role} /></div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <SubHeading>Permissions at a Glance</SubHeading>
            <PermissionTable />

            <SubHeading>How Permissions Are Assigned</SubHeading>
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              Only the <strong>Owner</strong> of a process can grant or revoke permissions. This is done in the <strong>Authorization</strong> section of the Administration page.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              When you assign a user at the <strong>process level</strong>, they gain access to all nodes currently in that process. Nodes added later will need separate assignments if the user is to access them individually.
            </p>

            <Callout type="warning">
              Operators <strong>cannot remove themselves</strong> from an assignment. Only the process owner can revoke access. If you need to leave a process, contact your owner.
            </Callout>
          </section>

          {/* ── Day-to-Day Operations ── */}
          <section>
            <SectionHeading id="operations" icon={Activity} title="Day-to-Day Operations" subtitle="Logging and resolving downtime events" />

            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              The <strong>Operations</strong> page (accessible from the sidebar) is where all users manage their daily work. It shows every process and node you have access to, with their live status.
            </p>

            <SubHeading>Node Status Indicators</SubHeading>
            <div className="grid sm:grid-cols-2 gap-3 mb-6">
              <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
                <CardContent className="p-4 flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                  <div>
                    <p className="font-semibold text-sm text-green-700 dark:text-green-400">Running</p>
                    <p className="text-xs text-muted-foreground">Node is operational. No active downtime event.</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20">
                <CardContent className="p-4 flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
                  <div>
                    <p className="font-semibold text-sm text-red-700 dark:text-red-400">Down</p>
                    <p className="text-xs text-muted-foreground">Active downtime event in progress. Elapsed time shown.</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <SubHeading>Starting a Downtime Event</SubHeading>
            <Step number={1} title="Locate the node">
              Find the machine in your Operations page. It will show as <span className="font-medium text-green-600 dark:text-green-400">Running</span>.
            </Step>
            <Step number={2} title="Report the downtime">
              Click the downtime button on the node card to open the reporting dialog.
            </Step>
            <Step number={3} title="Select a reason">
              Choose the appropriate failure category from the list configured for that process by your admin.
            </Step>
            <Step number={4} title="Confirm">
              Submit the form. The node immediately changes to <span className="font-medium text-red-500">Down</span> status and a live elapsed timer begins.
            </Step>

            <SubHeading>Stopping (Resolving) a Downtime Event</SubHeading>
            <Step number={1} title="Locate the down node">
              Find the node showing as <span className="font-medium text-red-500">Down</span>. You can see how long it has been down and the reason.
            </Step>
            <Step number={2} title="Mark as resolved">
              Click the resolve button on the node card.
            </Step>
            <Step number={3} title="Confirm">
              The event is closed with the current timestamp as the end time. The node immediately switches back to <span className="font-medium text-green-600 dark:text-green-400">Running</span>.
            </Step>

            <Callout type="success">
              Both the start and stop times are recorded automatically by the server — not the user's device — so the timestamps are always accurate regardless of which device is used.
            </Callout>
          </section>

          {/* ── Administration ── */}
          <section>
            <SectionHeading id="administration" icon={Settings} title="Administration" subtitle="Managing processes, nodes, reasons, and team access" />

            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              The <strong>Administration</strong> page is your control centre for setting up and maintaining the system. It has four collapsible sections, each focused on a different area.
            </p>

            {[
              {
                icon: Settings,
                title: 'Administration — Process & Node Management',
                roles: ['owner', 'admin'] as const[],
                items: [
                  'Create a new process with a name and optional description.',
                  'Expand any process to view and manage its nodes.',
                  'Add nodes to represent individual machines or equipment.',
                  'Edit the name of any process or node.',
                  'Toggle a process or node between Active and Inactive. Inactive items are hidden from operators.',
                  'Delete a node (removes all its downtime history).',
                  'Delete a process — owners only. This permanently removes the process and everything under it.',
                ],
              },
              {
                icon: Activity,
                title: 'Downtime Reasons',
                roles: ['owner', 'admin'] as const[],
                items: [
                  'Each process has its own separate list of reasons.',
                  'Create new reasons with a custom label (e.g. "Power failure", "Scheduled maintenance").',
                  'Toggle reasons Active or Inactive. Inactive reasons are hidden from operators but past events are preserved.',
                  'Delete a reason permanently. Past events that used it will lose the reason label but remain in history.',
                ],
              },
              {
                icon: ShieldCheck,
                title: 'Authorization',
                roles: ['owner'] as const[],
                items: [
                  'Only visible to process owners.',
                  'Assign any registered user to a process or a specific node.',
                  'Choose their role: Admin (manage settings) or Operator (log events).',
                  'View the complete list of who has access to each of your processes.',
                  'Revoke a user\'s access at any time.',
                  'Process-level assignments include access to all existing nodes in that process.',
                ],
              },
              {
                icon: User,
                title: 'My Assignments',
                roles: ['owner', 'admin', 'operator'] as const[],
                items: [
                  'Visible to every logged-in user.',
                  'Shows all processes and nodes you have been given access to, along with your role on each.',
                  'Operators cannot remove themselves — only the process owner can revoke access.',
                ],
              },
            ].map(({ icon: Icon, title, roles, items }) => (
              <div key={title} className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="h-4 w-4 text-primary" />
                  <h3 className="text-base font-semibold text-foreground">{title}</h3>
                  <div className="flex gap-1 ml-1">
                    {roles.map(r => <RoleBadge key={r} role={r} />)}
                  </div>
                </div>
                <Card>
                  <CardContent className="p-4">
                    <ul className="space-y-2">
                      {items.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <ChevronRight className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                          <span className="leading-relaxed">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            ))}
          </section>

          {/* ── Analytics Dashboard ── */}
          <section>
            <SectionHeading id="analytics" icon={BarChart3} title="Analytics Dashboard" subtitle="Understanding where production time is being lost" />

            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              The <strong>Dashboard</strong> is only visible to users who are admins or owners of at least one process or node. It provides a visual breakdown of accumulated downtime to help you identify patterns and prioritise improvements.
            </p>

            <Callout type="info">
              The dashboard only shows processes and nodes where you have <strong>admin or owner</strong> access. Operator-only assignments are not included in the analytics view.
            </Callout>

            <SubHeading>Choosing What to Analyse</SubHeading>
            <div className="grid sm:grid-cols-2 gap-3 mb-6">
              <Card className="border">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Layers className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-sm">Process Level</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Analyse total downtime across an entire production line. You can then break it down by reason (why things failed) or by node (which machine caused the most downtime).
                  </p>
                </CardContent>
              </Card>
              <Card className="border">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-sm">Node Level</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Zoom into a single machine to see exactly what types of failures it has experienced and for how long.
                  </p>
                </CardContent>
              </Card>
            </div>

            <SubHeading>Breakdown Types</SubHeading>
            <div className="grid sm:grid-cols-2 gap-3 mb-6">
              <div className="rounded-lg border p-4">
                <p className="font-semibold text-sm mb-1">By Reason</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Shows a pie chart where each slice represents a failure category. Instantly see which type of failure is consuming the most production time.
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="font-semibold text-sm mb-1">By Node</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Available at the process level. Each slice represents a machine. Immediately identifies the worst-performing equipment in a production line.
                </p>
              </div>
            </div>

            <SubHeading>Date Range Filter</SubHeading>
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              By default the dashboard shows all historical data. You can narrow the analysis to a specific period using the date range filter:
            </p>
            <div className="flex items-center gap-3 rounded-lg border p-4 mb-4">
              <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
              <p className="text-sm text-muted-foreground">
                Set a <strong>Start Date</strong>, an <strong>End Date</strong>, or both. Use the reset button to clear all filters and return to the full history view.
              </p>
            </div>

            <SubHeading>Reading the Chart</SubHeading>
            <ul className="space-y-2 mb-4">
              {[
                'Each pie slice is labelled with its reason or node name.',
                'The legend below the chart shows each item, its total duration in human-readable format (e.g. "2h 30m"), and its percentage of total downtime.',
                'A summary card shows the combined total downtime across all events in the selected scope and date range.',
                'Hovering over a slice shows a tooltip with exact duration and percentage.',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <ChevronRight className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* ── Data & Deletion Rules ── */}
          <section>
            <SectionHeading id="data-lifecycle" icon={Trash2} title="Data & Deletion Rules" subtitle="What happens when records are removed" />

            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              Downtime.OS uses <strong>cascading deletion</strong> — removing a parent record automatically removes all its child records. This keeps the database consistent but means deletions are permanent.
            </p>

            <Callout type="warning">
              There is no trash or undo feature. Once a process, node, or reason is deleted, all associated data is permanently removed and cannot be recovered.
            </Callout>

            <SubHeading>Cascade Effects</SubHeading>
            <div className="space-y-3 mb-6">
              {[
                {
                  action: 'Delete a Process',
                  role: 'owner' as const,
                  removes: ['All nodes in the process', 'All downtime events across all nodes', 'All downtime reasons', 'All permission records for the process and its nodes'],
                },
                {
                  action: 'Delete a Node',
                  role: 'admin' as const,
                  removes: ['All downtime events logged for that node', 'Node-level permission records'],
                },
                {
                  action: 'Delete a Downtime Reason',
                  role: 'admin' as const,
                  removes: ['The reason label is removed from past events, but the events themselves are preserved — the duration and timestamps remain in the history, just without a reason label.'],
                },
              ].map(({ action, role, removes }) => (
                <Card key={action} className="border">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Trash2 className="h-4 w-4 text-destructive" />
                      <span className="font-semibold text-sm">{action}</span>
                      <RoleBadge role={role} />
                    </div>
                    <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Also removes:</p>
                    <ul className="space-y-1">
                      {removes.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <ChevronRight className="h-3.5 w-3.5 text-destructive/60 mt-0.5 shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>

            <SubHeading>Active vs. Inactive</SubHeading>
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              Instead of deleting, you can toggle processes, nodes, and reasons between <strong>Active</strong> and <strong>Inactive</strong>. This is a safe alternative:
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="flex items-start gap-3 rounded-lg border p-4">
                <PlayCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-sm mb-1">Active</p>
                  <p className="text-xs text-muted-foreground">Fully visible and operational. Operators can see and interact with it.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg border p-4">
                <StopCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-sm mb-1">Inactive</p>
                  <p className="text-xs text-muted-foreground">Hidden from operators. Historical data is fully preserved. Can be reactivated at any time.</p>
                </div>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
