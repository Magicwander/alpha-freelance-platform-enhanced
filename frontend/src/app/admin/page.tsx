'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency, formatDate } from '@/lib/utils'
import { apiClient } from '@/lib/api'
import { 
  UsersIcon, 
  BriefcaseIcon, 
  ExclamationTriangleIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/solid'

interface AdminStats {
  totalUsers: number
  totalProjects: number
  totalDisputes: number
  totalRevenue: number
  activeProjects: number
  completedProjects: number
}

interface DisputeWithDetails {
  id: number
  project: {
    id: number
    title: string
    budget: number
  }
  user: {
    id: number
    name: string
    email: string
  }
  type: string
  description: string
  status: string
  created_at: string
  resolution?: string
  admin_notes?: string
}

interface ProjectWithDetails {
  id: number
  title: string
  budget: number
  status: string
  user: {
    id: number
    name: string
    email: string
  }
  assigned_to?: {
    id: number
    name: string
    email: string
  }
  bids_count: number
  created_at: string
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalProjects: 0,
    totalDisputes: 0,
    totalRevenue: 0,
    activeProjects: 0,
    completedProjects: 0
  })
  const [disputes, setDisputes] = useState<DisputeWithDetails[]>([])
  const [projects, setProjects] = useState<ProjectWithDetails[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDispute, setSelectedDispute] = useState<DisputeWithDetails | null>(null)
  const [resolution, setResolution] = useState('')
  const [adminNotes, setAdminNotes] = useState('')
  const [disputeStatus, setDisputeStatus] = useState('')
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    loadAdminData()
  }, [])

  const loadAdminData = async () => {
    try {
      setLoading(true)
      
      // Load disputes
      const disputesResponse = await apiClient.getDisputes()
      setDisputes(disputesResponse.disputes || [])
      
      // Load projects
      const projectsResponse = await apiClient.getProjects()
      setProjects(projectsResponse.projects || [])
      
      // Calculate stats (mock data for now)
      setStats({
        totalUsers: 156,
        totalProjects: projectsResponse.projects?.length || 0,
        totalDisputes: disputesResponse.disputes?.length || 0,
        totalRevenue: 125000,
        activeProjects: projectsResponse.projects?.filter((p: any) => p.status === 'in_progress').length || 0,
        completedProjects: projectsResponse.projects?.filter((p: any) => p.status === 'completed').length || 0
      })
      
    } catch (err: any) {
      console.error('Failed to load admin data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleResolveDispute = async (disputeId: number) => {
    try {
      await apiClient.updateDispute(disputeId.toString(), {
        status: disputeStatus as any,
        resolution,
        admin_notes: adminNotes
      })
      
      setSuccessMessage('Dispute resolved successfully!')
      setShowSuccessDialog(true)
      setTimeout(() => setShowSuccessDialog(false), 3000)
      
      // Reset form
      setSelectedDispute(null)
      setResolution('')
      setAdminNotes('')
      setDisputeStatus('')
      
      // Reload data
      loadAdminData()
    } catch (err: any) {
      console.error('Failed to resolve dispute:', err)
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'open': return 'destructive'
      case 'in_progress': return 'default'
      case 'resolved': return 'secondary'
      case 'closed': return 'outline'
      default: return 'default'
    }
  }

  const getProjectStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'open': return 'default'
      case 'in_progress': return 'secondary'
      case 'completed': return 'outline'
      case 'cancelled': return 'destructive'
      default: return 'default'
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading admin dashboard...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-gray-600">Manage platform operations and resolve disputes</p>
      </div>

      {/* Success Dialog */}
      {showSuccessDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <CheckCircleIcon className="h-6 w-6 text-green-500 mr-2" />
              <h3 className="text-lg font-semibold">Success</h3>
            </div>
            <p className="text-gray-600 mb-4">{successMessage}</p>
            <Button onClick={() => setShowSuccessDialog(false)} className="w-full">
              OK
            </Button>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">+12% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <BriefcaseIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProjects}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeProjects} active, {stats.completedProjects} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Disputes</CardTitle>
            <ExclamationTriangleIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{disputes.filter(d => d.status === 'open').length}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalDisputes} total disputes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Platform Revenue</CardTitle>
            <CurrencyDollarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">+8% from last month</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="disputes" className="space-y-6">
        <TabsList>
          <TabsTrigger value="disputes">Disputes</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="disputes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Dispute Management</CardTitle>
              <CardDescription>Review and resolve platform disputes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {disputes.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No disputes found
                  </div>
                ) : (
                  disputes.map((dispute) => (
                    <div key={dispute.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-semibold">Dispute #{dispute.id}</h3>
                          <p className="text-sm text-gray-600">
                            Project: {dispute.project?.title || 'Unknown Project'}
                          </p>
                          <p className="text-sm text-gray-600">
                            User: {dispute.user?.name || 'Unknown User'} ({dispute.user?.email})
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant={getStatusBadgeVariant(dispute.status)}>
                            {dispute.status.replace('_', ' ').toUpperCase()}
                          </Badge>
                          <p className="text-sm text-gray-500 mt-1">
                            {formatDate(dispute.created_at)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="mb-3">
                        <p className="text-sm font-medium mb-1">Type: {dispute.type.replace('_', ' ')}</p>
                        <p className="text-sm text-gray-700">{dispute.description}</p>
                      </div>

                      {dispute.status === 'open' && (
                        <div className="border-t pt-3">
                          <Button
                            onClick={() => {
                              setSelectedDispute(dispute)
                              setDisputeStatus('in_progress')
                            }}
                            size="sm"
                          >
                            Resolve Dispute
                          </Button>
                        </div>
                      )}

                      {dispute.resolution && (
                        <div className="border-t pt-3 mt-3">
                          <p className="text-sm font-medium mb-1">Resolution:</p>
                          <p className="text-sm text-gray-700">{dispute.resolution}</p>
                          {dispute.admin_notes && (
                            <>
                              <p className="text-sm font-medium mb-1 mt-2">Admin Notes:</p>
                              <p className="text-sm text-gray-700">{dispute.admin_notes}</p>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Project Overview</CardTitle>
              <CardDescription>Monitor all platform projects and assignments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {projects.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No projects found
                  </div>
                ) : (
                  projects.map((project) => (
                    <div key={project.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-semibold">{project.title}</h3>
                          <p className="text-sm text-gray-600">
                            Client: {project.user?.name} ({project.user?.email})
                          </p>
                          {project.assigned_to && (
                            <p className="text-sm text-gray-600">
                              Assigned to: {project.assigned_to.name} ({project.assigned_to.email})
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <Badge variant={getProjectStatusBadgeVariant(project.status)}>
                            {project.status.replace('_', ' ').toUpperCase()}
                          </Badge>
                          <p className="text-sm text-gray-500 mt-1">
                            {formatCurrency(project.budget)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>{project.bids_count || 0} bids</span>
                        <span>Created: {formatDate(project.created_at)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment Management</CardTitle>
              <CardDescription>Track payments and platform fees</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-green-800">Total Processed</h4>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalRevenue)}</p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-blue-800">Platform Fees</h4>
                    <p className="text-2xl font-bold text-blue-600">{formatCurrency(stats.totalRevenue * 0.05)}</p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-orange-800">Pending Payments</h4>
                    <p className="text-2xl font-bold text-orange-600">{formatCurrency(15000)}</p>
                  </div>
                </div>
                
                <div className="text-center py-8 text-gray-500">
                  Payment transaction details would be displayed here
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dispute Resolution Modal */}
      {selectedDispute && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Resolve Dispute #{selectedDispute.id}</h3>
            
            <div className="mb-4">
              <h4 className="font-medium mb-2">Dispute Details</h4>
              <p className="text-sm text-gray-600 mb-1">
                Project: {selectedDispute.project?.title}
              </p>
              <p className="text-sm text-gray-600 mb-1">
                User: {selectedDispute.user?.name} ({selectedDispute.user?.email})
              </p>
              <p className="text-sm text-gray-600 mb-2">
                Type: {selectedDispute.type.replace('_', ' ')}
              </p>
              <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                {selectedDispute.description}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Status</label>
                <Select value={disputeStatus} onValueChange={setDisputeStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Resolution</label>
                <Textarea
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  placeholder="Describe the resolution..."
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Admin Notes</label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Internal notes..."
                  rows={2}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedDispute(null)
                  setResolution('')
                  setAdminNotes('')
                  setDisputeStatus('')
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleResolveDispute(selectedDispute.id)}
                disabled={!disputeStatus || !resolution}
              >
                Resolve Dispute
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}