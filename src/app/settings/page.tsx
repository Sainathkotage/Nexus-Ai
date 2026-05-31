'use client';

import React, { useEffect, useState } from 'react';
import { useWorkspace } from '@/lib/store';
import { 
  Settings, User, Bell, Palette, Shield, CreditCard, Plug
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const sections = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'account', label: 'Account', icon: User },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security & Privacy', icon: Shield },
  { id: 'integrations', label: 'Integrations', icon: Plug },
  { id: 'billing', label: 'Billing', icon: CreditCard },
];

function Toggle({ enabled, onToggle, disabled = false }: { enabled: boolean; onToggle: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
        disabled && "opacity-40 cursor-not-allowed",
        enabled ? "bg-foreground" : "bg-muted border border-border"
      )}
    >
      <span className={cn(
        "inline-block h-3.5 w-3.5 transform rounded-full transition-transform",
        enabled ? "translate-x-4 bg-background" : "translate-x-1 bg-muted-foreground"
      )} />
    </button>
  );
}

export default function SettingsPage() {
  const { setActivePage, theme, toggleTheme, themeConfig, setThemeConfig } = useWorkspace();
  const [activeSection, setActiveSection] = useState('general');
  const [permissions, setPermissions] = useState({
    readDrive: true,
    readEmails: true,
    autoSend: false,
  });

  useEffect(() => {
    setActivePage('settings');
  }, [setActivePage]);

  return (
    <div className="flex flex-col h-full w-full max-w-4xl mx-auto p-6 md:p-8">
      {/* Header */}
      <div className="flex flex-col gap-1 mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your workspace preferences and AI configuration.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-8">
        
        {/* Sidebar */}
        <nav className="flex flex-col gap-0.5">
          {sections.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={cn(
                "flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm text-left w-full transition-colors",
                activeSection === item.id 
                  ? "bg-accent text-foreground font-medium"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="flex flex-col gap-8">
          
          {activeSection === 'general' && (
            <section className="flex flex-col gap-5">
              <div>
                <h2 className="text-base font-semibold mb-1">Workspace</h2>
                <p className="text-sm text-muted-foreground">Basic workspace settings and preferences.</p>
              </div>
              <div className="h-px bg-border" />
              
              <div className="grid gap-4 max-w-md">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium">Workspace Name</label>
                  <input 
                    type="text" 
                    className="px-3 py-1.5 border border-border rounded-md bg-background text-sm focus:ring-1 focus:ring-ring focus:outline-none"
                    defaultValue="Nexus AI"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium">Workspace URL</label>
                  <div className="flex items-center">
                    <span className="px-3 py-1.5 border border-r-0 border-border rounded-l-md bg-muted text-muted-foreground text-sm">
                      nexus.ai/
                    </span>
                    <input 
                      type="text" 
                      className="flex-1 px-3 py-1.5 border border-border rounded-r-md bg-background text-sm focus:ring-1 focus:ring-ring focus:outline-none"
                      defaultValue="sarah-workspace"
                    />
                  </div>
                </div>
              </div>
              
              <Button className="w-fit bg-foreground text-background hover:opacity-90 h-8 text-sm">Save Changes</Button>
            </section>
          )}

          {activeSection === 'general' && (
            <section className="flex flex-col gap-5">
              <div>
                <h2 className="text-base font-semibold mb-1">AI Permissions</h2>
                <p className="text-sm text-muted-foreground">Control what your AI assistant can access.</p>
              </div>
              <div className="h-px bg-border" />
              
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                  <div className="flex flex-col gap-0.5 pr-4">
                    <span className="text-sm font-medium">Read Documents</span>
                    <span className="text-xs text-muted-foreground">Allow AI to analyze uploaded documents.</span>
                  </div>
                  <Toggle enabled={permissions.readDrive} onToggle={() => setPermissions(p => ({ ...p, readDrive: !p.readDrive }))} />
                </div>

                <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                  <div className="flex flex-col gap-0.5 pr-4">
                    <span className="text-sm font-medium">Read Emails</span>
                    <span className="text-xs text-muted-foreground">Allow AI to read emails for context extraction.</span>
                  </div>
                  <Toggle enabled={permissions.readEmails} onToggle={() => setPermissions(p => ({ ...p, readEmails: !p.readEmails }))} />
                </div>

                <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                  <div className="flex flex-col gap-0.5 pr-4">
                    <span className="text-sm font-medium">Auto-Send Emails</span>
                    <span className="text-xs text-muted-foreground">Allow AI to send emails without approval.</span>
                  </div>
                  <Toggle enabled={permissions.autoSend} onToggle={() => {}} disabled />
                </div>
                <p className="text-[11px] text-muted-foreground ml-1">
                  * Nexus AI requires explicit user approval before sending any communication.
                </p>
              </div>
            </section>
          )}

          {activeSection === 'appearance' && (
            <section className="flex flex-col gap-5">
              <div>
                <h2 className="text-base font-semibold mb-1">Appearance</h2>
                <p className="text-sm text-muted-foreground">Customize how your workspace looks and define custom user themes.</p>
              </div>
              <div className="h-px bg-border" />
              
              <div className="flex items-center justify-between p-3 border border-border rounded-lg max-w-md bg-card">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold">Dark Mode</span>
                  <span className="text-xs text-muted-foreground">Toggle between light and dark themes.</span>
                </div>
                <Button onClick={toggleTheme} variant="outline" size="sm" className="h-7 text-xs border-border">
                  {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                </Button>
              </div>

              {/* Theme Presets Grid */}
              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Workspace Themes</h3>
                  <p className="text-xs text-muted-foreground">Choose from a variety of curated workspace palettes.</p>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-lg">
                  {[
                    { id: 'notion', label: 'Notion Default', colors: ['#ffffff', '#fbfbfa', '#37352f'] },
                    { id: 'apricot', label: 'Warm Apricot', colors: ['#faf6ee', '#f3ede2', '#8e573e'] },
                    { id: 'ocean', label: 'Nordic Ocean', colors: ['#edf3f6', '#e2edf2', '#2c5a70'] },
                    { id: 'cyberpunk', label: 'Cyberpunk Neon', colors: ['#0d0a12', '#100c16', '#ff0055'] },
                    { id: 'forest', label: 'Forest Mint', colors: ['#f2f6f2', '#e5ece5', '#2e6b27'] }
                  ].map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => setThemeConfig({ name: preset.id })}
                      className={cn(
                        "p-3 rounded-lg border text-left flex flex-col gap-2 transition-all hover:bg-accent/40 bg-card",
                        themeConfig.name === preset.id ? "border-primary ring-1 ring-primary" : "border-border"
                      )}
                    >
                      <span className="text-xs font-semibold text-foreground leading-none">{preset.label}</span>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        {preset.colors.map((c, i) => (
                          <span 
                            key={i} 
                            className="w-3.5 h-3.5 rounded-full border border-border/60 shrink-0" 
                            style={{ backgroundColor: c }} 
                          />
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Theme Editor */}
              <div className="space-y-3 pt-2">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Make Custom Theme</h3>
                  <p className="text-xs text-muted-foreground">Build your own branding colors. Updates will apply instantly.</p>
                </div>
                
                <div className="p-4 border border-border rounded-lg max-w-md bg-card flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center justify-between gap-2 p-1.5 border border-border/50 rounded bg-background">
                      <span className="text-xs font-medium text-muted-foreground">Primary Text/Accent</span>
                      <input 
                        type="color" 
                        value={themeConfig.name === 'custom' ? themeConfig.primary || '#37352f' : '#37352f'}
                        onChange={(e) => setThemeConfig({
                          name: 'custom',
                          primary: e.target.value,
                          background: themeConfig.name === 'custom' ? themeConfig.background : undefined,
                          sidebar: themeConfig.name === 'custom' ? themeConfig.sidebar : undefined,
                          accent: themeConfig.name === 'custom' ? themeConfig.accent : undefined,
                        })}
                        className="w-7 h-7 rounded border border-border cursor-pointer bg-transparent"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2 p-1.5 border border-border/50 rounded bg-background">
                      <span className="text-xs font-medium text-muted-foreground">Background Color</span>
                      <input 
                        type="color" 
                        value={themeConfig.name === 'custom' ? themeConfig.background || '#ffffff' : '#ffffff'}
                        onChange={(e) => setThemeConfig({
                          name: 'custom',
                          background: e.target.value,
                          primary: themeConfig.name === 'custom' ? themeConfig.primary : undefined,
                          sidebar: themeConfig.name === 'custom' ? themeConfig.sidebar : undefined,
                          accent: themeConfig.name === 'custom' ? themeConfig.accent : undefined,
                        })}
                        className="w-7 h-7 rounded border border-border cursor-pointer bg-transparent"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2 p-1.5 border border-border/50 rounded bg-background">
                      <span className="text-xs font-medium text-muted-foreground">Sidebar Color</span>
                      <input 
                        type="color" 
                        value={themeConfig.name === 'custom' ? themeConfig.sidebar || '#fbfbfa' : '#fbfbfa'}
                        onChange={(e) => setThemeConfig({
                          name: 'custom',
                          sidebar: e.target.value,
                          primary: themeConfig.name === 'custom' ? themeConfig.primary : undefined,
                          background: themeConfig.name === 'custom' ? themeConfig.background : undefined,
                          accent: themeConfig.name === 'custom' ? themeConfig.accent : undefined,
                        })}
                        className="w-7 h-7 rounded border border-border cursor-pointer bg-transparent"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2 p-1.5 border border-border/50 rounded bg-background">
                      <span className="text-xs font-medium text-muted-foreground">Highlight Hover</span>
                      <input 
                        type="color" 
                        value={themeConfig.name === 'custom' ? themeConfig.accent || '#f1f1ef' : '#f1f1ef'}
                        onChange={(e) => setThemeConfig({
                          name: 'custom',
                          accent: e.target.value,
                          primary: themeConfig.name === 'custom' ? themeConfig.primary : undefined,
                          background: themeConfig.name === 'custom' ? themeConfig.background : undefined,
                          sidebar: themeConfig.name === 'custom' ? themeConfig.sidebar : undefined,
                        })}
                        className="w-7 h-7 rounded border border-border cursor-pointer bg-transparent"
                      />
                    </div>
                  </div>
                  {themeConfig.name === 'custom' && (
                    <Button 
                      onClick={() => setThemeConfig({ name: 'notion' })}
                      variant="outline"
                      size="sm"
                      className="w-full text-xs h-8 border-dashed border-red-500/50 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                    >
                      Reset Custom Theme Colors
                    </Button>
                  )}
                </div>
              </div>
            </section>
          )}

          {(activeSection !== 'general' && activeSection !== 'appearance') && (
            <section className="flex flex-col gap-5">
              <div>
                <h2 className="text-base font-semibold mb-1 capitalize">{sections.find(s => s.id === activeSection)?.label}</h2>
                <p className="text-sm text-muted-foreground">Configure your {activeSection} settings.</p>
              </div>
              <div className="h-px bg-border" />
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center mb-3">
                  {React.createElement(sections.find(s => s.id === activeSection)?.icon || Settings, { className: "w-5 h-5 text-muted-foreground" })}
                </div>
                <p className="text-sm text-muted-foreground">Coming soon</p>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
