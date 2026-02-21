'use client'

import Header from '@/components/layout/Header'
import Sidebar from '@/components/layout/Sidebar'
import { Badge, Button, Card, Input, Modal, Select, Skeleton } from '@/components/ui'
import { useToast } from '@/contexts/ToastContext'
import { DEMO_REPOSITORIES, isDemoMode } from '@/lib/demoData'
import type { Repository } from '@/lib/supabase/types'
import { repositoryService } from '@/services/supabase'
import {
    ExternalLink,
    Filter,
    GitBranch,
    Github,
    Gitlab,
    Play,
    Plus,
    RefreshCw,
    Search,
    Trash2
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

const providerIcons: Record<string, React.ReactNode> = {
  github: <Github className="w-5 h-5" />,
  gitlab: <Gitlab className="w-5 h-5" />,
  bitbucket: <GitBranch className="w-5 h-5" />,
  azure: <GitBranch className="w-5 h-5" />,
}

const providerColors: Record<string, string> = {
  github: 'bg-gray-600',
  gitlab: 'bg-orange-500',
  bitbucket: 'bg-blue-500',
  azure: 'bg-blue-600',
}

export default function RepositoriesPage() {
  const [repositories, setRepositories] = useState<Repository[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [scanningRepoId, setScanningRepoId] = useState<number | null>(null)
  const toast = useToast()

  // New repository form
  const [newRepo, setNewRepo] = useState<{
    name: string
    url: string
    provider: 'github' | 'gitlab' | 'bitbucket' | 'azure'
    branch: string
  }>({
    name: '',
    url: '',
    provider: 'github',
    branch: 'main',
  })

  const fetchRepositories = useCallback(async () => {
    try {
      // Check for demo mode
      if (isDemoMode()) {
        setRepositories(DEMO_REPOSITORIES as unknown as Repository[])
        setLoading(false)
        return
      }

      const data = await repositoryService.getAll()
      setRepositories(data)
    } catch (error) {
      toast.error('Failed to load repositories')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchRepositories()
  }, [fetchRepositories])

  const handleAddRepository = async () => {
    if (!newRepo.name || !newRepo.url) {
      toast.error('Missing fields', 'Please fill in all required fields')
      return
    }

    try {
      const repo = await repositoryService.create(newRepo)
      setRepositories([...repositories, repo])
      setIsAddModalOpen(false)
      setNewRepo({ name: '', url: '', provider: 'github', branch: 'main' })
      toast.success('Repository added', `${repo.name} has been added successfully`)
    } catch (error) {
      toast.error('Failed to add repository')
    }
  }

  const handleScanRepository = async (repoId: number) => {
    setScanningRepoId(repoId)
    try {
      await repositoryService.scan(repoId)
      toast.success('Scan started', 'Repository scan has been initiated')
    } catch (error) {
      toast.error('Failed to start scan')
    } finally {
      setScanningRepoId(null)
    }
  }

  const handleDeleteRepository = async (repoId: number) => {
    try {
      await repositoryService.delete(repoId)
      setRepositories(repositories.filter(r => r.id !== repoId))
      toast.success('Repository removed')
    } catch (error) {
      toast.error('Failed to delete repository')
    }
  }

  const filteredRepositories = repositories.filter(repo => {
    const matchesSearch = repo.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = filterStatus === 'all' || repo.status === filterStatus
    return matchesSearch && matchesFilter
  })

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          alertCount={5}
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
        />
        
        <main className="flex-1 overflow-y-auto p-6 bg-[var(--bg-primary)]">
          <div className="max-w-[1800px] mx-auto">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">Repositories</h1>
                <p className="text-[var(--text-muted)] mt-1">Manage and monitor your connected repositories</p>
              </div>
              <Button
                variant="primary"
                leftIcon={<Plus className="w-5 h-5" />}
                onClick={() => setIsAddModalOpen(true)}
              >
                Add Repository
              </Button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="Search repositories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-md text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-[var(--text-muted)]" />
                <Select
                  options={[
                    { value: 'all', label: 'All Status' },
                    { value: 'active', label: 'Active' },
                    { value: 'inactive', label: 'Inactive' },
                    { value: 'error', label: 'Error' },
                  ]}
                  value={filterStatus}
                  onChange={setFilterStatus}
                  className="w-40"
                />
              </div>
            </div>

            {/* Repository Grid */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Skeleton.Card key={i} />
                ))}
              </div>
            ) : filteredRepositories.length === 0 ? (
              <Card className="text-center py-12">
                <GitBranch className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4" />
                <h3 className="text-lg font-medium text-[var(--text-secondary)] mb-2">No repositories found</h3>
                <p className="text-[var(--text-muted)] mb-6">
                  {searchQuery ? 'Try adjusting your search' : 'Add your first repository to start scanning'}
                </p>
                <Button
                  variant="primary"
                  leftIcon={<Plus className="w-5 h-5" />}
                  onClick={() => setIsAddModalOpen(true)}
                >
                  Add Repository
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredRepositories.map((repo) => (
                  <Card key={repo.id} hover className="relative group">
                    {/* Status Indicator */}
                    <div className="absolute top-4 right-4">
                      <Badge
                        variant={
                          repo.status === 'active' ? 'success' :
                          repo.status === 'error' ? 'critical' : 'default'
                        }
                        dot
                      >
                        {repo.status}
                      </Badge>
                    </div>

                    {/* Provider Icon & Name */}
                    <div className="flex items-start gap-3 mb-4">
                      <div className={`w-10 h-10 rounded-lg ${providerColors[repo.provider]} flex items-center justify-center text-white`}>
                        {providerIcons[repo.provider]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-[var(--text-primary)] truncate">{repo.name}</h3>
                        <p className="text-sm text-[var(--text-muted)] truncate">{repo.url}</p>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4 mb-4 py-4 border-y border-[var(--border-color)]/50">
                      <div className="text-center">
                        <p className="text-lg font-semibold text-[var(--text-primary)]">{repo.secrets_count}</p>
                        <p className="text-xs text-[var(--text-muted)]">Secrets</p>
                      </div>
                      <div className="text-center border-x border-[var(--border-color)]/50">
                        <p className="text-lg font-semibold text-[var(--text-primary)]">{repo.branch}</p>
                        <p className="text-xs text-[var(--text-muted)]">Branch</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium text-[var(--text-primary)]">
                          {repo.last_scan_at ? new Date(repo.last_scan_at).toLocaleDateString() : 'Never'}
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">Last Scan</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        leftIcon={scanningRepoId === repo.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                        onClick={() => handleScanRepository(repo.id)}
                        disabled={scanningRepoId === repo.id}
                        className="flex-1"
                      >
                        {scanningRepoId === repo.id ? 'Scanning...' : 'Scan Now'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(repo.url, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        onClick={() => handleDeleteRepository(repo.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Add Repository Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Repository"
        description="Connect a new repository for secret scanning"
      >
        <div className="space-y-4">
          <Input
            label="Repository Name"
            placeholder="my-awesome-project"
            value={newRepo.name}
            onChange={(e) => setNewRepo({ ...newRepo, name: e.target.value })}
          />
          <Input
            label="Repository URL"
            placeholder="https://github.com/username/repo"
            value={newRepo.url}
            onChange={(e) => setNewRepo({ ...newRepo, url: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Provider"
              options={[
                { value: 'github', label: 'GitHub' },
                { value: 'gitlab', label: 'GitLab' },
                { value: 'bitbucket', label: 'Bitbucket' },
                { value: 'azure', label: 'Azure DevOps' },
              ]}
              value={newRepo.provider}
              onChange={(value) => setNewRepo({ ...newRepo, provider: value as any })}
            />
            <Input
              label="Branch"
              placeholder="main"
              value={newRepo.branch}
              onChange={(e) => setNewRepo({ ...newRepo, branch: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[var(--border-color)]">
            <Button variant="ghost" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAddRepository}>
              Add Repository
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
