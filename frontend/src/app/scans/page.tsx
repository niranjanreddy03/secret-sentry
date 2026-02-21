'use client'

import Header from '@/components/layout/Header'
import Sidebar from '@/components/layout/Sidebar'
import { Badge, Button, Card, Modal, Select, Skeleton } from '@/components/ui'
import { useToast } from '@/contexts/ToastContext'
import { DEMO_REPOSITORIES, DEMO_SCANS, isDemoMode } from '@/lib/demoData'
import type { Repository, Scan } from '@/lib/supabase/types'
import { repositoryService, scanService } from '@/services/supabase'
import {
    AlertTriangle,
    CheckCircle,
    Clock,
    Download,
    Eye,
    FileText,
    FolderGit2,
    Loader2,
    Play,
    RefreshCw,
    Search,
    Target,
    XCircle
} from 'lucide-react'
import React, { useEffect, useState } from 'react'

// Extended scan type with repository name
type ScanWithRepo = Scan & { repository_name?: string }

const statusConfig: Record<string, { color: string; icon: React.ElementType; label: string; animate?: boolean }> = {
  pending: { color: 'gray', icon: Clock, label: 'Pending' },
  running: { color: 'blue', icon: Loader2, label: 'Running', animate: true },
  completed: { color: 'green', icon: CheckCircle, label: 'Completed' },
  failed: { color: 'red', icon: XCircle, label: 'Failed' },
  cancelled: { color: 'yellow', icon: AlertTriangle, label: 'Cancelled' },
}

const triggerLabels: Record<string, string> = {
  webhook: 'Webhook',
  manual: 'Manual',
  scheduled: 'Scheduled',
  api: 'API',
}

export default function ScansPage() {
  const [scans, setScans] = useState<ScanWithRepo[]>([])
  const [repositories, setRepositories] = useState<Repository[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [selectedScan, setSelectedScan] = useState<ScanWithRepo | null>(null)
  const [showNewScanModal, setShowNewScanModal] = useState(false)
  const toast = useToast()

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Check for demo mode
        if (isDemoMode()) {
          setScans(DEMO_SCANS as unknown as ScanWithRepo[])
          setRepositories(DEMO_REPOSITORIES as unknown as Repository[])
          setLoading(false)
          return
        }

        const [scansData, reposData] = await Promise.all([
          scanService.getAll(),
          repositoryService.getAll()
        ])
        setScans(scansData as ScanWithRepo[])
        setRepositories(reposData)
      } catch (err) {
        console.error('Failed to fetch data:', err)
        toast.error('Failed to load scans')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [toast])

  const filteredScans = scans.filter((scan) => {
    const repoName = scan.repository_name || ''
    const branch = scan.branch || ''
    const scanId = scan.scan_id || ''
    const matchesSearch =
      repoName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      branch.toLowerCase().includes(searchQuery.toLowerCase()) ||
      scanId.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || scan.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleNewScan = () => {
    toast.success('Scan initiated', 'A new scan has been queued')
    setShowNewScanModal(false)
  }

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '--'
    if (seconds < 60) return `${seconds}s`
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }

  const formatDate = (date: string | null) => {
    if (!date) return '--'
    return new Date(date).toLocaleString()
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header alertCount={3} onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

        <main className="flex-1 overflow-y-auto p-4 bg-[var(--bg-primary)]">
          <div className="max-w-[1600px] mx-auto space-y-4">
            {/* Page Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg font-medium text-[var(--text-primary)]">Scans</h1>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Monitor and manage security scans
                </p>
              </div>
              <button onClick={() => setShowNewScanModal(true)} className="btn-primary flex items-center px-4 py-2">
                <Play className="w-4 h-4 mr-2" />
                New Scan
              </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Card className="p-3">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-[var(--bg-tertiary)] rounded-md">
                    <Target className="w-4 h-4 text-[var(--text-muted)]" />
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">Total Scans</p>
                    <p className="text-xl font-semibold text-[var(--text-primary)]">{scans.length}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-3">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-[var(--bg-tertiary)] rounded-md">
                    <CheckCircle className="w-4 h-4 text-[#4ade80]" />
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">Completed</p>
                    <p className="text-xl font-semibold text-[var(--text-primary)]">
                      {scans.filter((s) => s.status === 'completed').length}
                    </p>
                  </div>
                </div>
              </Card>
              <Card className="p-3">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-[var(--bg-tertiary)] rounded-md">
                    <Loader2 className="w-4 h-4 text-[#fbbf24]" />
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">In Progress</p>
                    <p className="text-xl font-semibold text-[var(--text-primary)]">
                      {scans.filter((s) => s.status === 'running' || s.status === 'pending').length}
                    </p>
                  </div>
                </div>
              </Card>
              <Card className="p-3">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-[var(--bg-tertiary)] rounded-md">
                    <AlertTriangle className="w-4 h-4 text-[#f87171]" />
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">Secrets Found</p>
                    <p className="text-xl font-semibold text-[var(--text-primary)]">
                      {scans.reduce((sum, s) => sum + (s.secrets_found || 0), 0)}
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="Search scans..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-md text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--text-muted)]"
                />
              </div>
              <Select
                value={statusFilter}
                onChange={(value) => setStatusFilter(value)}
                className="w-full sm:w-40"
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'pending', label: 'Pending' },
                  { value: 'running', label: 'Running' },
                  { value: 'completed', label: 'Completed' },
                  { value: 'failed', label: 'Failed' },
                ]}
              />
              <Button variant="secondary" size="sm" onClick={() => setLoading(true)}>
                <RefreshCw className="w-4 h-4" />
                Refresh
              </Button>
            </div>

            {/* Scans Table */}
            <Card className="overflow-hidden" noPadding>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[var(--bg-tertiary)] border-b border-[var(--border-color)]">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-muted)]">
                        Repository
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-muted)]">
                        Branch
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-muted)]">
                        Status
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-muted)]">
                        Secrets
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-muted)]">
                        Files
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-muted)]">
                        Duration
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-muted)]">
                        Trigger
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-muted)]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-color)]">
                    {loading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i}>
                          <td colSpan={8} className="px-4 py-3">
                            <Skeleton className="h-6 w-full" />
                          </td>
                        </tr>
                      ))
                    ) : filteredScans.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-8 text-sm text-[var(--text-muted)]">
                          No scans found
                        </td>
                      </tr>
                    ) : (
                      filteredScans.map((scan) => {
                        const status = statusConfig[scan.status]
                        const StatusIcon = status.icon

                        return (
                          <tr
                            key={scan.id}
                            className="hover:bg-[var(--bg-tertiary)] transition-colors"
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <FolderGit2 className="w-4 h-4 text-[var(--text-muted)]" />
                                <div>
                                  <p className="text-sm font-medium text-[var(--text-primary)]">
                                    {scan.repository_name}
                                  </p>
                                  <p className="text-xs text-[var(--text-muted)]">{scan.scan_id}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-xs text-[var(--text-secondary)] bg-[var(--bg-tertiary)] px-2 py-0.5 rounded">{scan.branch}</span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5">
                                <StatusIcon
                                  className={`w-3.5 h-3.5 ${
                                    status.animate ? 'animate-spin' : ''
                                  } ${
                                    status.color === 'green'
                                      ? 'text-[#4ade80]'
                                      : status.color === 'red'
                                      ? 'text-[#f87171]'
                                      : status.color === 'blue'
                                      ? 'text-[#60a5fa]'
                                      : status.color === 'yellow'
                                      ? 'text-[#fbbf24]'
                                      : 'text-[var(--text-muted)]'
                                  }`}
                                />
                                <span className="text-sm text-[var(--text-secondary)]">{status.label}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {(scan.secrets_found || 0) > 0 ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-sm text-[var(--text-primary)]">
                                    {scan.secrets_found}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-sm text-[var(--text-muted)]">--</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm text-[var(--text-secondary)]">
                                {scan.files_scanned || 0} files
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                              {formatDuration(scan.duration_seconds)}
                            </td>
                            <td className="px-4 py-3">
                              <div>
                                <p className="text-sm text-[var(--text-secondary)]">
                                  {triggerLabels[scan.trigger_type as keyof typeof triggerLabels] ||
                                    scan.trigger_type}
                                </p>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => setSelectedScan(scan)}
                                  className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] transition-colors"
                                  title="View Details"
                                >
                                  <Eye className="w-4 h-4 text-[var(--text-muted)]" />
                                </button>
                                <button
                                  className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] transition-colors"
                                  title="Download Report"
                                >
                                  <Download className="w-4 h-4 text-[var(--text-muted)]" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </main>

        {/* Scan Details Modal */}
        {selectedScan && (
          <Modal
            isOpen={!!selectedScan}
            onClose={() => setSelectedScan(null)}
            title="Scan Details"
          >
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-[var(--text-muted)]">Repository</p>
                  <p className="text-[var(--text-primary)] font-medium">{selectedScan.repository_name}</p>
                </div>
                <div>
                  <p className="text-sm text-[var(--text-muted)]">Branch</p>
                  <p className="text-[var(--text-primary)]">{selectedScan.branch}</p>
                </div>
                <div>
                  <p className="text-sm text-[var(--text-muted)]">Status</p>
                  <Badge variant={selectedScan.status === 'completed' ? 'success' : selectedScan.status === 'failed' ? 'critical' : 'info'}>
                    {selectedScan.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-[var(--text-muted)]">Files Scanned</p>
                  <p className="text-[var(--text-primary)]">{selectedScan.files_scanned}</p>
                </div>
                <div>
                  <p className="text-sm text-[var(--text-muted)]">Secrets Found</p>
                  <p className="text-[var(--text-primary)]">{selectedScan.secrets_found}</p>
                </div>
                <div>
                  <p className="text-sm text-[var(--text-muted)]">Trigger Type</p>
                  <p className="text-[var(--text-primary)]">{selectedScan.trigger_type}</p>
                </div>
                <div>
                  <p className="text-sm text-[var(--text-muted)]">Started At</p>
                  <p className="text-[var(--text-primary)]">{formatDate(selectedScan.started_at)}</p>
                </div>
                <div>
                  <p className="text-sm text-[var(--text-muted)]">Duration</p>
                  <p className="text-[var(--text-primary)]">{formatDuration(selectedScan.duration_seconds)}</p>
                </div>
              </div>

              {selectedScan.error_message && (
                <div className="p-3 bg-[#f87171]/10 border border-[#f87171]/20 rounded">
                  <p className="text-sm text-[#f87171]">{selectedScan.error_message}</p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="secondary" onClick={() => setSelectedScan(null)}>
                  Close
                </Button>
                <Button>
                  <FileText className="w-4 h-4 mr-2" />
                  View Full Report
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* New Scan Modal */}
        <Modal
          isOpen={showNewScanModal}
          onClose={() => setShowNewScanModal(false)}
          title="Start New Scan"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-[var(--text-muted)] mb-2">Repository</label>
              <Select 
                className="w-full"
                placeholder="Select a repository"
                options={[
                  { value: '1', label: 'frontend-app' },
                  { value: '2', label: 'backend-api' },
                  { value: '3', label: 'infra-config' },
                  { value: '4', label: 'mobile-app' },
                ]}
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-muted)] mb-2">Branch</label>
              <input
                type="text"
                placeholder="main"
                className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-zinc-600"
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-muted)] mb-2">Scan Type</label>
              <Select 
                className="w-full"
                options={[
                  { value: 'full', label: 'Full Scan' },
                  { value: 'quick', label: 'Quick Scan' },
                  { value: 'incremental', label: 'Incremental' },
                ]}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="secondary" onClick={() => setShowNewScanModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleNewScan}>
                <Play className="w-4 h-4 mr-2" />
                Start Scan
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  )
}
