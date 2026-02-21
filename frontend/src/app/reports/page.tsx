'use client'

import Header from '@/components/layout/Header'
import Sidebar from '@/components/layout/Sidebar'
import { Badge, Button, Card, Modal, Select, Skeleton } from '@/components/ui'
import { useToast } from '@/contexts/ToastContext'
import { DEMO_REPORTS, DEMO_REPOSITORIES, DEMO_SCANS, DEMO_SECRETS, isDemoMode } from '@/lib/demoData'
import { generateQuickReport } from '@/lib/pdfGenerator'
import { formatDateTime } from '@/lib/utils'
import { Report, reportService, Repository, repositoryService, Scan, scanService, Secret, secretService } from '@/services/api'
import {
    AlertCircle,
    ChevronRight,
    Download,
    FileCheck,
    FileText,
    Loader2,
    Plus,
    RefreshCw
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [scans, setScans] = useState<Scan[]>([])
  const [repositories, setRepositories] = useState<Repository[]>([])
  const [secrets, setSecrets] = useState<Secret[]>([])
  const [loading, setLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [reportType, setReportType] = useState('weekly')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const toast = useToast()

  const fetchData = useCallback(async () => {
    try {
      // Check if demo mode
      if (isDemoMode()) {
        setReports(DEMO_REPORTS as any)
        setScans(DEMO_SCANS.map(s => ({
          ...s,
          repository_id: s.repository.id,
          started_at: s.created_at,
        })) as Scan[])
        setRepositories(DEMO_REPOSITORIES.map(r => ({
          ...r,
          provider: r.provider as any,
          last_scan: r.last_scan_at,
          criticality_tier: 'tier_2' as const,
          open_findings_count: r.secrets_count,
          critical_findings_count: Math.floor(r.secrets_count / 3),
        })) as Repository[])
        setSecrets(DEMO_SECRETS.map(s => ({
          id: s.id,
          type: s.secret_type,
          risk_level: s.severity as any,
          file_path: s.file_path,
          line_number: s.line_number,
          repository_name: s.repository.name,
          repository_id: s.repository.id,
          detected_at: s.detected_at,
          status: s.status as any,
          masked_value: s.masked_value,
          confidence: 0.95,
          business_impact_score: s.severity === 'critical' ? 95 : s.severity === 'high' ? 75 : 50,
        })) as Secret[])
        setLoading(false)
        return
      }

      const [reportsData, scansData, reposData, secretsData] = await Promise.all([
        reportService.getAll(),
        scanService.getAll(),
        repositoryService.getAll(),
        secretService.getAll(),
      ])
      setReports(reportsData)
      setScans(scansData)
      setRepositories(reposData)
      setSecrets(secretsData)
    } catch (error) {
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleGenerateReport = async () => {
    setIsGenerating(true)
    try {
      // Generate PDF directly
      generateQuickReport(
        secrets,
        repositories,
        scans,
        reportType as 'weekly' | 'monthly' | 'custom'
      )

      // Add to reports list
      const newReport: Report = {
        id: Date.now(),
        name: `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Security Report - ${new Date().toLocaleDateString()}`,
        type: reportType as any,
        status: 'ready',
        size: `${(Math.random() * 3 + 1).toFixed(1)} MB`,
        generated_at: new Date().toISOString(),
      }
      setReports([newReport, ...reports])
      setIsModalOpen(false)
      toast.success('Report generated!', 'PDF downloaded to your device')
    } catch (error) {
      console.error('PDF generation error:', error)
      toast.error('Failed to generate report')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownload = async (report: Report) => {
    try {
      // For demo mode or local reports, regenerate the PDF
      if (isDemoMode() || report.id > 1000000) {
        generateQuickReport(
          secrets,
          repositories,
          scans,
          report.type as 'weekly' | 'monthly' | 'custom'
        )
        toast.success('Download started', `${report.name}`)
      } else {
        await reportService.download(report.id)
        toast.success('Download started', `${report.name}`)
      }
    } catch (error) {
      // Fallback to local generation
      generateQuickReport(
        secrets,
        repositories,
        scans,
        report.type as 'weekly' | 'monthly' | 'custom'
      )
      toast.success('Download started', `${report.name}`)
    }
  }

  const getStatusConfig = (status: Report['status']) => {
    switch (status) {
      case 'ready':
        return { icon: FileCheck, color: 'text-green-400', bg: 'bg-green-500/20', label: 'Ready' }
      case 'generating':
        return { icon: Loader2, color: 'text-blue-400', bg: 'bg-blue-500/20', label: 'Generating', animate: true }
      case 'failed':
        return { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/20', label: 'Failed' }
      default:
        return { icon: FileText, color: 'text-[var(--text-muted)]', bg: 'bg-[var(--bg-tertiary)]', label: status }
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          alertCount={5}
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
        />
        
        <main className="flex-1 overflow-y-auto p-6 bg-[var(--bg-primary)]">
          <div className="max-w-[1600px] mx-auto">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">Reports</h1>
                <p className="text-[var(--text-muted)] mt-1">Generate and download security reports</p>
              </div>
              <Button
                variant="primary"
                leftIcon={<Plus className="w-5 h-5" />}
                onClick={() => setIsModalOpen(true)}
              >
                Generate Report
              </Button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Reports List */}
              <div className="xl:col-span-2">
                <Card>
                  <Card.Header 
                    title="Generated Reports" 
                    description="Download your security analysis reports"
                  />
                  
                  {loading ? (
                    <Skeleton.Table rows={5} columns={4} />
                  ) : reports.length === 0 ? (
                    <div className="text-center py-12">
                      <FileText className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-[var(--text-secondary)] mb-2">No reports yet</h3>
                      <p className="text-[var(--text-muted)] mb-6">Generate your first security report</p>
                      <Button
                        variant="primary"
                        leftIcon={<Plus className="w-5 h-5" />}
                        onClick={() => setIsModalOpen(true)}
                      >
                        Generate Report
                      </Button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="text-xs text-[var(--text-muted)] uppercase bg-[var(--bg-secondary)]">
                          <tr>
                            <th className="px-4 py-3 text-left">Report</th>
                            <th className="px-4 py-3 text-left">Type</th>
                            <th className="px-4 py-3 text-left">Status</th>
                            <th className="px-4 py-3 text-left">Size</th>
                            <th className="px-4 py-3 text-left">Generated</th>
                            <th className="px-4 py-3 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-color)]">
                          {reports.map((report) => {
                            const statusConfig = getStatusConfig(report.status)
                            const StatusIcon = statusConfig.icon
                            
                            return (
                              <tr key={report.id} className="hover:bg-[var(--bg-secondary)]">
                                <td className="px-4 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center">
                                      <FileText className="w-5 h-5 text-[var(--accent)]" />
                                    </div>
                                    <span className="font-medium text-[var(--text-primary)]">{report.name}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-4">
                                  <Badge variant="default" size="sm">
                                    {report.type}
                                  </Badge>
                                </td>
                                <td className="px-4 py-4">
                                  <span className={`inline-flex items-center gap-1.5 ${statusConfig.color}`}>
                                    <StatusIcon className={`w-4 h-4 ${statusConfig.animate ? 'animate-spin' : ''}`} />
                                    {statusConfig.label}
                                  </span>
                                </td>
                                <td className="px-4 py-4 text-[var(--text-muted)]">
                                  {report.size}
                                </td>
                                <td className="px-4 py-4 text-[var(--text-muted)]">
                                  {formatDateTime(report.generated_at)}
                                </td>
                                <td className="px-4 py-4 text-center">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    leftIcon={<Download className="w-4 h-4" />}
                                    onClick={() => handleDownload(report)}
                                    disabled={report.status !== 'ready'}
                                  >
                                    Download
                                  </Button>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>
              </div>

              {/* Scan History */}
              <div>
                <Card>
                  <Card.Header 
                    title="Recent Scans" 
                    action={
                      <Button variant="ghost" size="sm">
                        View all <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    }
                  />
                  
                  {loading ? (
                    <div className="space-y-4">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <Skeleton variant="circular" width={40} height={40} />
                          <div className="flex-1">
                            <Skeleton variant="text" className="h-4 w-3/4 mb-2" />
                            <Skeleton variant="text" className="h-3 w-1/2" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {scans.slice(0, 5).map((scan) => (
                        <div
                          key={scan.id}
                          className="flex items-center gap-3 p-3 rounded-lg bg-[var(--bg-secondary)]/50 hover:bg-[var(--bg-secondary)] transition-colors"
                        >
                          <div className={`
                            w-10 h-10 rounded-lg flex items-center justify-center
                            ${scan.status === 'completed' ? 'bg-green-500/20' : 
                              scan.status === 'running' ? 'bg-blue-500/20' : 
                              scan.status === 'failed' ? 'bg-red-500/20' : 'bg-[var(--bg-tertiary)]'}
                          `}>
                            {scan.status === 'running' ? (
                              <RefreshCw className="w-5 h-5 text-blue-400 animate-spin" />
                            ) : (
                              <FileCheck className={`w-5 h-5 ${
                                scan.status === 'completed' ? 'text-green-400' :
                                scan.status === 'failed' ? 'text-red-400' : 'text-[var(--text-muted)]'
                              }`} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-[var(--text-primary)] truncate">{scan.repository_name}</p>
                            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                              <span>{scan.started_at}</span>
                              {scan.secrets_found > 0 && (
                                <span className="text-red-400">• {scan.secrets_found} secrets</span>
                              )}
                            </div>
                          </div>
                          <Badge
                            variant={
                              scan.status === 'completed' ? 'success' :
                              scan.status === 'running' ? 'info' :
                              scan.status === 'failed' ? 'critical' : 'default'
                            }
                            size="sm"
                          >
                            {scan.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                {/* Quick Stats */}
                <Card className="mt-6">
                  <Card.Header title="Quick Stats" />
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--text-muted)]">Total Reports</span>
                      <span className="text-[var(--text-primary)] font-semibold">{reports.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--text-muted)]">This Month</span>
                      <span className="text-[var(--text-primary)] font-semibold">
                        {reports.filter(r => new Date(r.generated_at).getMonth() === new Date().getMonth()).length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--text-muted)]">Total Scans</span>
                      <span className="text-[var(--text-primary)] font-semibold">{scans.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--text-muted)]">Secrets Detected</span>
                      <span className="text-red-400 font-semibold">
                        {scans.reduce((acc, s) => acc + s.secrets_found, 0)}
                      </span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Generate Report Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Generate Report"
        description="Create a new security analysis report"
      >
        <div className="space-y-4">
          <Select
            label="Report Type"
            options={[
              { value: 'weekly', label: 'Weekly Report' },
              { value: 'monthly', label: 'Monthly Report' },
              { value: 'custom', label: 'Custom Report' },
            ]}
            value={reportType}
            onChange={setReportType}
          />

          <div className="p-4 rounded-lg bg-[var(--bg-tertiary)]/50 border border-[var(--border-color)]">
            <h4 className="font-medium text-[var(--text-secondary)] mb-2">Report includes:</h4>
            <ul className="text-sm text-[var(--text-muted)] space-y-1">
              <li>• Security scan summary</li>
              <li>• Detected secrets breakdown</li>
              <li>• Risk distribution analysis</li>
              <li>• Repository health status</li>
              <li>• Remediation recommendations</li>
            </ul>
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[var(--border-color)]">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              leftIcon={isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
              onClick={handleGenerateReport}
              disabled={isGenerating}
            >
              {isGenerating ? 'Generating...' : 'Generate Report'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
