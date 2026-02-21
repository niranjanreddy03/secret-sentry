'use client'

import { useState, useEffect } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'
import { Button, Card, Input, Select, Badge } from '@/components/ui'
import { useToast } from '@/contexts/ToastContext'
import { useAuth } from '@/contexts/AuthContext'
import {
  Settings,
  User,
  Bell,
  Shield,
  Key,
  Palette,
  Globe,
  Database,
  Mail,
  Slack,
  Github,
  Save,
  RefreshCw,
  Eye,
  EyeOff,
  Copy,
  Trash2,
  Plus,
  Check,
  X,
} from 'lucide-react'

type TabId = 'profile' | 'notifications' | 'security' | 'integrations' | 'api' | 'advanced'

interface Tab {
  id: TabId
  label: string
  icon: React.ReactNode
}

const tabs: Tab[] = [
  { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
  { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
  { id: 'security', label: 'Security', icon: <Shield className="w-4 h-4" /> },
  { id: 'integrations', label: 'Integrations', icon: <Globe className="w-4 h-4" /> },
  { id: 'api', label: 'API Keys', icon: <Key className="w-4 h-4" /> },
  { id: 'advanced', label: 'Advanced', icon: <Settings className="w-4 h-4" /> },
]

export default function SettingsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeTab, setActiveTab] = useState<TabId>('profile')
  const [saving, setSaving] = useState(false)
  const toast = useToast()
  const { user, supabaseUser } = useAuth()

  // Profile state
  const [profile, setProfile] = useState({
    fullName: '',
    email: '',
    username: '',
    company: '',
    role: '',
    timezone: 'America/New_York',
  })

  useEffect(() => {
    // Use supabaseUser as fallback when user profile doesn't exist in DB
    const email = user?.email || supabaseUser?.email || ''
    const fullName = user?.full_name || supabaseUser?.user_metadata?.full_name || ''
    const role = user?.role || 'user'
    
    setProfile(prev => ({
      ...prev,
      fullName,
      email,
      username: email?.split('@')[0] || '',
      role,
    }))
  }, [user, supabaseUser])

  // Notification settings
  const [notifications, setNotifications] = useState({
    emailOnCritical: true,
    emailOnHigh: true,
    emailOnScanComplete: false,
    emailWeeklyReport: true,
    slackOnCritical: true,
    slackOnHigh: false,
    browserNotifications: true,
  })

  // Security settings
  const [security, setSecurity] = useState({
    twoFactorEnabled: false,
    sessionTimeout: '30',
    ipWhitelist: '',
  })

  // Integration settings
  const [integrations, setIntegrations] = useState({
    githubConnected: false,
    githubUsername: '',
    gitlabConnected: false,
    slackConnected: false,
    slackWorkspace: '',
    awsConnected: false,
  })

  // API keys
  const [apiKeys, setApiKeys] = useState<{ id: number; name: string; key: string; created: string; lastUsed: string }[]>([])
  const [showApiKey, setShowApiKey] = useState<number | null>(null)

  const handleSave = async () => {
    setSaving(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setSaving(false)
    toast.success('Settings saved', 'Your changes have been saved successfully')
  }

  const handleGenerateApiKey = () => {
    const newKey = {
      id: Date.now(),
      name: 'New API Key',
      key: 'demo_key_' + Math.random().toString(36).substring(2, 38),
      created: new Date().toISOString().split('T')[0],
      lastUsed: 'Never',
    }
    setApiKeys([...apiKeys, newKey])
    toast.success('API Key generated', 'New API key has been created')
  }

  const handleDeleteApiKey = (id: number) => {
    setApiKeys(apiKeys.filter((k) => k.id !== id))
    toast.info('API Key deleted', 'The API key has been revoked')
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.info('Copied', 'Copied to clipboard')
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header alertCount={0} onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

        <main className="flex-1 overflow-y-auto p-6 bg-[var(--bg-primary)]">
          <div className="max-w-5xl mx-auto space-y-6">
            {/* Page Header */}
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">Settings</h1>
              <p className="text-[var(--text-muted)] mt-1">Manage your account and preferences</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
              {/* Sidebar Tabs */}
              <div className="w-full lg:w-64 flex-shrink-0">
                <Card className="p-2">
                  <nav className="space-y-1">
                    {tabs.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-md transition-colors ${
                          activeTab === tab.id
                            ? 'bg-[var(--accent)]/10 text-[var(--accent)]'
                            : 'text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {tab.icon}
                        <span>{tab.label}</span>
                      </button>
                    ))}
                  </nav>
                </Card>
              </div>

              {/* Settings Content */}
              <div className="flex-1">
                <Card className="p-6">
                  {/* Profile Settings */}
                  {activeTab === 'profile' && (
                    <div className="space-y-6">
                      <h2 className="text-lg font-semibold text-[var(--text-primary)]">Profile Settings</h2>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm text-[var(--text-muted)] mb-2">Full Name</label>
                          <Input
                            value={profile.fullName}
                            onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                            placeholder="Your full name"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-[var(--text-muted)] mb-2">Username</label>
                          <Input
                            value={profile.username}
                            onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                            placeholder="Username"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-[var(--text-muted)] mb-2">Email Address</label>
                          <Input
                            type="email"
                            value={profile.email}
                            onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                            placeholder="email@example.com"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-[var(--text-muted)] mb-2">Company</label>
                          <Input
                            value={profile.company}
                            onChange={(e) => setProfile({ ...profile, company: e.target.value })}
                            placeholder="Company name"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-[var(--text-muted)] mb-2">Role</label>
                          <Select
                            value={profile.role}
                            onChange={(value) => setProfile({ ...profile, role: value })}
                            options={[
                              { value: 'admin', label: 'Admin' },
                              { value: 'developer', label: 'Developer' },
                            ]}
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-[var(--text-muted)] mb-2">Timezone</label>
                          <Select
                            value={profile.timezone}
                            onChange={(value) => setProfile({ ...profile, timezone: value })}
                            options={[
                              { value: 'America/New_York', label: 'Eastern Time (ET)' },
                              { value: 'America/Chicago', label: 'Central Time (CT)' },
                              { value: 'America/Denver', label: 'Mountain Time (MT)' },
                              { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
                              { value: 'Europe/London', label: 'London (GMT)' },
                              { value: 'Europe/Paris', label: 'Paris (CET)' },
                              { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
                            ]}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Notification Settings */}
                  {activeTab === 'notifications' && (
                    <div className="space-y-6">
                      <h2 className="text-lg font-semibold text-[var(--text-primary)]">Notification Preferences</h2>

                      <div className="space-y-6">
                        <div>
                          <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-4 flex items-center gap-2">
                            <Mail className="w-4 h-4" />
                            Email Notifications
                          </h3>
                          <div className="space-y-4">
                            {[
                              { key: 'emailOnCritical', label: 'Critical severity findings', desc: 'Immediate notification' },
                              { key: 'emailOnHigh', label: 'High severity findings', desc: 'Immediate notification' },
                              { key: 'emailOnScanComplete', label: 'Scan completion', desc: 'When a scan finishes' },
                              { key: 'emailWeeklyReport', label: 'Weekly summary report', desc: 'Every Monday' },
                            ].map((item) => (
                              <label key={item.key} className="flex items-center justify-between p-4 bg-[var(--bg-secondary)] rounded-lg cursor-pointer">
                                <div>
                                  <p className="text-[var(--text-primary)]">{item.label}</p>
                                  <p className="text-[var(--text-muted)] text-sm">{item.desc}</p>
                                </div>
                                <div
                                  className={`w-12 h-6 rounded-full transition-colors ${
                                    notifications[item.key as keyof typeof notifications] ? 'bg-[var(--accent)]' : 'bg-[var(--bg-tertiary)]'
                                  } relative cursor-pointer`}
                                  onClick={() =>
                                    setNotifications({
                                      ...notifications,
                                      [item.key]: !notifications[item.key as keyof typeof notifications],
                                    })
                                  }
                                >
                                  <div
                                    className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                                      notifications[item.key as keyof typeof notifications] ? 'translate-x-7' : 'translate-x-1'
                                    }`}
                                  />
                                </div>
                              </label>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-4 flex items-center gap-2">
                            <Slack className="w-4 h-4" />
                            Slack Notifications
                          </h3>
                          <div className="space-y-4">
                            {[
                              { key: 'slackOnCritical', label: 'Critical severity findings' },
                              { key: 'slackOnHigh', label: 'High severity findings' },
                            ].map((item) => (
                              <label key={item.key} className="flex items-center justify-between p-4 bg-[var(--bg-secondary)] rounded-lg cursor-pointer">
                                <p className="text-[var(--text-primary)]">{item.label}</p>
                                <div
                                  className={`w-12 h-6 rounded-full transition-colors ${
                                    notifications[item.key as keyof typeof notifications] ? 'bg-[var(--accent)]' : 'bg-[var(--bg-tertiary)]'
                                  } relative cursor-pointer`}
                                  onClick={() =>
                                    setNotifications({
                                      ...notifications,
                                      [item.key]: !notifications[item.key as keyof typeof notifications],
                                    })
                                  }
                                >
                                  <div
                                    className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                                      notifications[item.key as keyof typeof notifications] ? 'translate-x-7' : 'translate-x-1'
                                    }`}
                                  />
                                </div>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Security Settings */}
                  {activeTab === 'security' && (
                    <div className="space-y-6">
                      <h2 className="text-lg font-semibold text-[var(--text-primary)]">Security Settings</h2>

                      <div className="space-y-6">
                        <div className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <p className="text-[var(--text-primary)] font-medium">Two-Factor Authentication</p>
                              <p className="text-[var(--text-muted)] text-sm">Add an extra layer of security to your account</p>
                            </div>
                            <Badge variant={security.twoFactorEnabled ? 'success' : 'warning'}>
                              {security.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                            </Badge>
                          </div>
                          <Button variant={security.twoFactorEnabled ? 'secondary' : 'primary'}>
                            {security.twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA'}
                          </Button>
                        </div>

                        <div>
                          <label className="block text-sm text-[var(--text-muted)] mb-2">Session Timeout (minutes)</label>
                          <Select
                            value={security.sessionTimeout}
                            onChange={(value) => setSecurity({ ...security, sessionTimeout: value })}
                            options={[
                              { value: '15', label: '15 minutes' },
                              { value: '30', label: '30 minutes' },
                              { value: '60', label: '1 hour' },
                              { value: '120', label: '2 hours' },
                              { value: '480', label: '8 hours' },
                            ]}
                          />
                        </div>

                        <div>
                          <label className="block text-sm text-[var(--text-muted)] mb-2">Change Password</label>
                          <div className="space-y-3">
                            <Input type="password" placeholder="Current password" />
                            <Input type="password" placeholder="New password" />
                            <Input type="password" placeholder="Confirm new password" />
                          </div>
                          <Button className="mt-4">Update Password</Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Integrations */}
                  {activeTab === 'integrations' && (
                    <div className="space-y-6">
                      <h2 className="text-lg font-semibold text-[var(--text-primary)]">Integrations</h2>

                      <div className="space-y-4">
                        {/* GitHub */}
                        <div className="p-4 bg-[var(--bg-secondary)] rounded-lg flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-[var(--bg-tertiary)] rounded-lg">
                              <Github className="w-6 h-6 text-[var(--text-primary)]" />
                            </div>
                            <div>
                              <p className="text-[var(--text-primary)] font-medium">GitHub</p>
                              <p className="text-[var(--text-muted)] text-sm">
                                {integrations.githubConnected
                                  ? `Connected as @${integrations.githubUsername}`
                                  : 'Not connected'}
                              </p>
                            </div>
                          </div>
                          <Button variant={integrations.githubConnected ? 'secondary' : 'primary'}>
                            {integrations.githubConnected ? 'Disconnect' : 'Connect'}
                          </Button>
                        </div>

                        {/* GitLab */}
                        <div className="p-4 bg-[var(--bg-secondary)] rounded-lg flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-orange-500 rounded-lg">
                              <Globe className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <p className="text-[var(--text-primary)] font-medium">GitLab</p>
                              <p className="text-[var(--text-muted)] text-sm">
                                {integrations.gitlabConnected ? 'Connected' : 'Not connected'}
                              </p>
                            </div>
                          </div>
                          <Button variant={integrations.gitlabConnected ? 'secondary' : 'primary'}>
                            {integrations.gitlabConnected ? 'Disconnect' : 'Connect'}
                          </Button>
                        </div>

                        {/* Slack */}
                        <div className="p-4 bg-[var(--bg-secondary)] rounded-lg flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-purple-500 rounded-lg">
                              <Slack className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <p className="text-[var(--text-primary)] font-medium">Slack</p>
                              <p className="text-[var(--text-muted)] text-sm">
                                {integrations.slackConnected
                                  ? `Connected to ${integrations.slackWorkspace}`
                                  : 'Not connected'}
                              </p>
                            </div>
                          </div>
                          <Button variant={integrations.slackConnected ? 'secondary' : 'primary'}>
                            {integrations.slackConnected ? 'Disconnect' : 'Connect'}
                          </Button>
                        </div>

                        {/* AWS */}
                        <div className="p-4 bg-[var(--bg-secondary)] rounded-lg flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-yellow-500 rounded-lg">
                              <Database className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <p className="text-[var(--text-primary)] font-medium">AWS S3</p>
                              <p className="text-[var(--text-muted)] text-sm">
                                {integrations.awsConnected ? 'Connected' : 'Not connected'}
                              </p>
                            </div>
                          </div>
                          <Button variant={integrations.awsConnected ? 'secondary' : 'primary'}>
                            {integrations.awsConnected ? 'Disconnect' : 'Configure'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* API Keys */}
                  {activeTab === 'api' && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-[var(--text-primary)]">API Keys</h2>
                        <Button onClick={handleGenerateApiKey}>
                          <Plus className="w-4 h-4 mr-2" />
                          Generate New Key
                        </Button>
                      </div>

                      <p className="text-[var(--text-muted)] text-sm">
                        Use API keys to authenticate with the Vault Sentry API. Keep your keys secure and never share them publicly.
                      </p>

                      <div className="space-y-4">
                        {apiKeys.map((apiKey) => (
                          <div key={apiKey.id} className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <p className="text-[var(--text-primary)] font-medium">{apiKey.name}</p>
                                <p className="text-[var(--text-muted)] text-xs">Created {apiKey.created} • Last used {apiKey.lastUsed}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setShowApiKey(showApiKey === apiKey.id ? null : apiKey.id)}
                                  className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
                                >
                                  {showApiKey === apiKey.id ? (
                                    <EyeOff className="w-4 h-4 text-[var(--text-muted)]" />
                                  ) : (
                                    <Eye className="w-4 h-4 text-[var(--text-muted)]" />
                                  )}
                                </button>
                                <button
                                  onClick={() => copyToClipboard(apiKey.key)}
                                  className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
                                >
                                  <Copy className="w-4 h-4 text-[var(--text-muted)]" />
                                </button>
                                <button
                                  onClick={() => handleDeleteApiKey(apiKey.id)}
                                  className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
                                >
                                  <Trash2 className="w-4 h-4 text-red-400" />
                                </button>
                              </div>
                            </div>
                            <code className="text-sm text-[var(--text-secondary)] bg-[var(--bg-tertiary)] px-3 py-2 rounded block font-mono">
                              {showApiKey === apiKey.id ? apiKey.key : apiKey.key.replace(/./g, '•')}
                            </code>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Advanced Settings */}
                  {activeTab === 'advanced' && (
                    <div className="space-y-6">
                      <h2 className="text-lg font-semibold text-[var(--text-primary)]">Advanced Settings</h2>

                      <div className="space-y-6">
                        <div>
                          <label className="block text-sm text-[var(--text-muted)] mb-2">Default Scan Severity Threshold</label>
                          <Select
                            options={[
                              { value: 'critical', label: 'Critical only' },
                              { value: 'high', label: 'High and above' },
                              { value: 'medium', label: 'Medium and above' },
                              { value: 'low', label: 'All severities' },
                            ]}
                          />
                        </div>

                        <div>
                          <label className="block text-sm text-[var(--text-muted)] mb-2">Maximum File Size (MB)</label>
                          <Input type="number" defaultValue="10" min="1" max="100" />
                        </div>

                        <div>
                          <label className="block text-sm text-[var(--text-muted)] mb-2">Custom Ignore Patterns (one per line)</label>
                          <textarea
                            className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] resize-y min-h-[120px] font-mono text-sm"
                            placeholder={`node_modules/\n.git/\n*.min.js\ncoverage/`}
                          />
                        </div>

                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                          <h3 className="text-red-400 font-medium mb-2">Danger Zone</h3>
                          <p className="text-[var(--text-muted)] text-sm mb-4">
                            These actions are irreversible. Please proceed with caution.
                          </p>
                          <div className="flex gap-3">
                            <Button variant="danger">Delete All Scan History</Button>
                            <Button variant="danger">Delete Account</Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Save Button */}
                  <div className="flex justify-end pt-6 border-t border-[var(--border-color)] mt-6">
                    <Button onClick={handleSave} disabled={saving}>
                      {saving ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
