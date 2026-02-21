'use client'

import Header from '@/components/layout/Header'
import Sidebar from '@/components/layout/Sidebar'
import { Badge, Button, Card, Modal, Skeleton } from '@/components/ui'
import { useToast } from '@/contexts/ToastContext'
import {
    Check,
    Crown,
    Mail,
    MoreVertical,
    Plus,
    Search,
    Shield,
    Trash2,
    UserPlus,
    Users
} from 'lucide-react'
import { useEffect, useState } from 'react'

interface TeamMember {
  id: number
  name: string
  email: string
  role: 'owner' | 'admin' | 'member' | 'viewer'
  status: 'active' | 'pending' | 'inactive'
  avatar?: string
  last_active: string
  repositories_access: number
  joined_at: string
}

interface Team {
  id: number
  name: string
  description: string
  members_count: number
  repositories_count: number
  created_at: string
}

const DEMO_MEMBERS: TeamMember[] = [
  {
    id: 1,
    name: 'Demo User',
    email: 'demo@VaultSentry.io',
    role: 'owner',
    status: 'active',
    last_active: new Date().toISOString(),
    repositories_access: 5,
    joined_at: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 2,
    name: 'Admin User',
    email: 'admin@acme.com',
    role: 'admin',
    status: 'active',
    last_active: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    repositories_access: 5,
    joined_at: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 3,
    name: 'Developer One',
    email: 'dev1@acme.com',
    role: 'member',
    status: 'active',
    last_active: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    repositories_access: 3,
    joined_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 4,
    name: 'Developer Two',
    email: 'dev2@acme.com',
    role: 'member',
    status: 'active',
    last_active: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    repositories_access: 2,
    joined_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 5,
    name: '',
    email: 'newdev@acme.com',
    role: 'member',
    status: 'pending',
    last_active: '',
    repositories_access: 0,
    joined_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 6,
    name: 'Security Auditor',
    email: 'auditor@external.com',
    role: 'viewer',
    status: 'active',
    last_active: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    repositories_access: 5,
    joined_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
]

const DEMO_TEAMS: Team[] = [
  {
    id: 1,
    name: 'Engineering',
    description: 'Core development team',
    members_count: 4,
    repositories_count: 3,
    created_at: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 2,
    name: 'Security',
    description: 'Security and compliance team',
    members_count: 2,
    repositories_count: 5,
    created_at: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 3,
    name: 'DevOps',
    description: 'Infrastructure and operations',
    members_count: 2,
    repositories_count: 2,
    created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
  },
]

const roleConfig = {
  owner: { color: 'text-yellow-400', bg: 'bg-yellow-500/20', icon: Crown, label: 'Owner' },
  admin: { color: 'text-purple-400', bg: 'bg-purple-500/20', icon: Shield, label: 'Admin' },
  member: { color: 'text-blue-400', bg: 'bg-blue-500/20', icon: Users, label: 'Member' },
  viewer: { color: 'text-gray-400', bg: 'bg-gray-500/20', icon: Users, label: 'Viewer' },
}

export default function TeamsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'member' | 'viewer'>('member')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'members' | 'teams'>('members')
  const toast = useToast()

  useEffect(() => {
    setMembers(DEMO_MEMBERS)
    setTeams(DEMO_TEAMS)
    setLoading(false)
  }, [])

  const filteredMembers = members.filter(member =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleInvite = () => {
    if (!inviteEmail) return
    
    const newMember: TeamMember = {
      id: Date.now(),
      name: '',
      email: inviteEmail,
      role: inviteRole,
      status: 'pending',
      last_active: '',
      repositories_access: 0,
      joined_at: new Date().toISOString(),
    }
    
    setMembers([...members, newMember])
    setShowInviteModal(false)
    setInviteEmail('')
    toast.success('Invitation sent!', `Invited ${inviteEmail} as ${inviteRole}`)
  }

  const handleRemoveMember = (memberId: number) => {
    const member = members.find(m => m.id === memberId)
    if (member?.role === 'owner') {
      toast.error('Cannot remove owner')
      return
    }
    setMembers(members.filter(m => m.id !== memberId))
    toast.success('Member removed')
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Never'
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    if (diff < 3600000) return 'Just now'
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    if (diff < 7 * 86400000) return `${Math.floor(diff / 86400000)}d ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      
      <div className="flex-1 flex flex-col min-w-0">
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} alertCount={0} />
        
        <main className="flex-1 overflow-y-auto overflow-x-hidden" style={{ background: 'var(--bg-primary)' }}>
          <div className="max-w-[1400px] mx-auto px-6 py-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
                  <Users className="w-7 h-7 text-blue-400" />
                  Team Management
                </h1>
                <p className="text-[var(--text-muted)] mt-1">Manage team members and permissions</p>
              </div>
              <Button 
                variant="primary" 
                leftIcon={<UserPlus className="w-4 h-4" />}
                onClick={() => setShowInviteModal(true)}
              >
                Invite Member
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[var(--text-primary)]">{members.length}</p>
                    <p className="text-xs text-[var(--text-muted)]">Total Members</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                    <Check className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[var(--text-primary)]">{members.filter(m => m.status === 'active').length}</p>
                    <p className="text-xs text-[var(--text-muted)]">Active</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[var(--text-primary)]">{members.filter(m => m.status === 'pending').length}</p>
                    <p className="text-xs text-[var(--text-muted)]">Pending</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[var(--text-primary)]">{teams.length}</p>
                    <p className="text-xs text-[var(--text-muted)]">Teams</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-[var(--border-color)]">
              <button
                onClick={() => setActiveTab('members')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'members'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                Members
              </button>
              <button
                onClick={() => setActiveTab('teams')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'teams'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                Teams
              </button>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Search members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>

            {activeTab === 'members' ? (
              /* Members List */
              <Card>
                {loading ? (
                  <div className="p-6"><Skeleton.Table rows={6} columns={5} /></div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-[var(--bg-secondary)]">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">Member</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">Role</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">Last Active</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase">Repos</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-[var(--text-muted)] uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-color)]">
                        {filteredMembers.map(member => {
                          const config = roleConfig[member.role]
                          const RoleIcon = config.icon
                          return (
                            <tr key={member.id} className="hover:bg-[var(--bg-secondary)]/50">
                              <td className="px-4 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-primary)] font-medium">
                                    {member.name ? member.name.split(' ').map(n => n[0]).join('').toUpperCase() : member.email[0].toUpperCase()}
                                  </div>
                                  <div>
                                    <p className="font-medium text-[var(--text-primary)]">{member.name || 'Pending...'}</p>
                                    <p className="text-sm text-[var(--text-muted)]">{member.email}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-4">
                                <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium ${config.bg} ${config.color}`}>
                                  <RoleIcon className="w-3 h-3" />
                                  {config.label}
                                </span>
                              </td>
                              <td className="px-4 py-4">
                                <Badge 
                                  variant={member.status === 'active' ? 'success' : member.status === 'pending' ? 'warning' : 'default'}
                                  size="sm"
                                >
                                  {member.status}
                                </Badge>
                              </td>
                              <td className="px-4 py-4 text-sm text-[var(--text-muted)]">
                                {formatDate(member.last_active)}
                              </td>
                              <td className="px-4 py-4 text-sm text-[var(--text-secondary)]">
                                {member.repositories_access}
                              </td>
                              <td className="px-4 py-4 text-center">
                                {member.role !== 'owner' && (
                                  <button
                                    onClick={() => handleRemoveMember(member.id)}
                                    className="p-2 rounded-lg hover:bg-red-500/20 text-[var(--text-muted)] hover:text-red-400 transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            ) : (
              /* Teams List */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {teams.map(team => (
                  <Card key={team.id} className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                        <Users className="w-6 h-6 text-blue-400" />
                      </div>
                      <button className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)]">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                    <h3 className="text-lg font-semibold text-[var(--text-primary)]">{team.name}</h3>
                    <p className="text-sm text-[var(--text-muted)] mt-1">{team.description}</p>
                    <div className="flex items-center gap-4 mt-4 pt-4 border-t border-[var(--border-color)]">
                      <div className="flex items-center gap-1 text-sm text-[var(--text-secondary)]">
                        <Users className="w-4 h-4" />
                        {team.members_count} members
                      </div>
                      <div className="flex items-center gap-1 text-sm text-[var(--text-secondary)]">
                        <Shield className="w-4 h-4" />
                        {team.repositories_count} repos
                      </div>
                    </div>
                  </Card>
                ))}
                <Card className="p-5 border-dashed flex items-center justify-center min-h-[180px] cursor-pointer hover:bg-[var(--bg-secondary)]/50 transition-colors">
                  <div className="text-center">
                    <Plus className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2" />
                    <p className="text-[var(--text-muted)]">Create Team</p>
                  </div>
                </Card>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Invite Modal */}
      <Modal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        title="Invite Team Member"
        description="Send an invitation to join your workspace"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Email Address</label>
            <input
              type="email"
              placeholder="colleague@company.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Role</label>
            <div className="grid grid-cols-3 gap-2">
              {(['admin', 'member', 'viewer'] as const).map(role => (
                <button
                  key={role}
                  onClick={() => setInviteRole(role)}
                  className={`p-3 rounded-lg border text-center transition-colors ${
                    inviteRole === role
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-[var(--border-color)] hover:bg-[var(--bg-tertiary)]'
                  }`}
                >
                  <p className="font-medium text-[var(--text-primary)] capitalize">{role}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {role === 'admin' ? 'Full access' : role === 'member' ? 'Read & write' : 'Read only'}
                  </p>
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)]">
            <Button variant="ghost" onClick={() => setShowInviteModal(false)}>Cancel</Button>
            <Button variant="primary" leftIcon={<Mail className="w-4 h-4" />} onClick={handleInvite}>
              Send Invitation
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
