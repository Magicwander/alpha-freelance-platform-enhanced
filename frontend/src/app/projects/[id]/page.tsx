'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { mockProjects, mockBids, mockUsers, mockAIBreakdown } from '@/lib/mockData'
import { formatCurrency, formatDate } from '@/lib/utils'
import { 
  ClockIcon, 
  CurrencyDollarIcon, 
  UserIcon, 
  StarIcon,
  SparklesIcon,
  CheckCircleIcon
} from '@heroicons/react/24/solid'
import { 
  ChatBubbleLeftRightIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline'
import Image from 'next/image'
import Link from 'next/link'

export default function ProjectDetailPage() {
  const params = useParams()
  const projectId = params.id as string
  
  const [bidAmount, setBidAmount] = useState('')
  const [bidProposal, setBidProposal] = useState('')
  const [deliveryTime, setDeliveryTime] = useState('')
  const [showBidForm, setShowBidForm] = useState(false)

  const project = mockProjects.find(p => p.id === projectId)
  const projectBids = mockBids.filter(bid => bid.projectId === projectId)
  const aiBreakdown = project?.aiBreakdown || mockAIBreakdown

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Project Not Found</h1>
          <Link href="/projects">
            <Button>Back to Projects</Button>
          </Link>
        </div>
      </div>
    )
  }

  const lowestBid = projectBids.length > 0 ? Math.min(...projectBids.map(bid => bid.amount)) : null

  const handleSubmitBid = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle bid submission
    console.log('Bid submitted:', { bidAmount, bidProposal, deliveryTime })
    setShowBidForm(false)
    // Reset form
    setBidAmount('')
    setBidProposal('')
    setDeliveryTime('')
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="mb-8">
          <ol className="flex items-center space-x-2 text-sm text-gray-500">
            <li><Link href="/projects" className="hover:text-blue-600">Projects</Link></li>
            <li>/</li>
            <li className="text-gray-900 truncate">{project.title}</li>
          </ol>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Project Header */}
            <Card>
              <CardHeader>
                {project.images && project.images.length > 0 && (
                  <div className="mb-6 -mx-6 -mt-6">
                    <Image
                      src={project.images[0]}
                      alt={project.title}
                      width={800}
                      height={400}
                      className="w-full h-64 object-cover rounded-t-lg"
                    />
                  </div>
                )}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-2xl mb-4">{project.title}</CardTitle>
                    <div className="flex items-center gap-4 mb-4">
                      <Badge variant="secondary">{project.category}</Badge>
                      <Badge 
                        variant={project.status === 'open' ? 'default' : 
                                project.status === 'in_progress' ? 'secondary' : 'outline'}
                      >
                        {project.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-green-600 mb-1">
                      {formatCurrency(project.budget)}
                    </div>
                    <div className="text-sm text-gray-500">Budget</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed mb-6">
                  {project.description}
                </CardDescription>

                <div className="mb-6">
                  <h4 className="font-semibold mb-3">Required Skills:</h4>
                  <div className="flex flex-wrap gap-2">
                    {project.skills.map((skill) => (
                      <Badge key={skill} variant="outline">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center">
                    <ClockIcon className="h-4 w-4 mr-1" />
                    Posted {formatDate(project.createdAt)}
                  </div>
                  <div className="flex items-center">
                    <UserIcon className="h-4 w-4 mr-1" />
                    {projectBids.length} bids received
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* AI Breakdown */}
            {aiBreakdown && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <SparklesIcon className="h-6 w-6 text-purple-600 mr-2" />
                    AI Project Breakdown
                  </CardTitle>
                  <CardDescription>
                    Powered by Mistral AI - Estimated completion time: {aiBreakdown.estimatedTime} hours
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {aiBreakdown.steps.map((step) => (
                      <div key={step.id} className="border-l-4 border-blue-500 pl-4">
                        <h4 className="font-semibold text-gray-900 mb-1">
                          {step.order}. {step.title}
                        </h4>
                        <p className="text-gray-600 text-sm mb-2">{step.description}</p>
                        <div className="text-xs text-gray-500">
                          Estimated: {step.estimatedHours} hours
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-2">AI Recommendations:</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      {aiBreakdown.recommendations.map((rec, index) => (
                        <li key={index} className="flex items-start">
                          <CheckCircleIcon className="h-4 w-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Bids */}
            <Card>
              <CardHeader>
                <CardTitle>Bids ({projectBids.length})</CardTitle>
                {lowestBid && (
                  <div className="text-sm text-gray-600">
                    Lowest bid: <span className="font-semibold text-green-600">{formatCurrency(lowestBid)}</span>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {projectBids.map((bid) => (
                    <div key={bid.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center">
                          <Image
                            src={bid.provider.avatar || '/placeholder-avatar.png'}
                            alt={bid.provider.name}
                            width={40}
                            height={40}
                            className="rounded-full mr-3"
                          />
                          <div>
                            <h4 className="font-semibold">{bid.provider.name}</h4>
                            <div className="flex items-center text-sm text-gray-500">
                              <StarIcon className="h-4 w-4 text-yellow-400 mr-1" />
                              {bid.provider.rating} ({bid.provider.totalProjects} projects)
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold text-green-600">
                            {formatCurrency(bid.amount)}
                          </div>
                          <div className="text-sm text-gray-500">
                            {bid.deliveryTime} days
                          </div>
                        </div>
                      </div>
                      <p className="text-gray-700 text-sm">{bid.proposal}</p>
                      <div className="mt-3 text-xs text-gray-500">
                        Submitted {formatDate(bid.createdAt)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Bid Form */}
            {project.status === 'open' && (
              <Card>
                <CardHeader>
                  <CardTitle>Place Your Bid</CardTitle>
                </CardHeader>
                <CardContent>
                  {!showBidForm ? (
                    <Button 
                      onClick={() => setShowBidForm(true)}
                      className="w-full"
                    >
                      Submit a Bid
                    </Button>
                  ) : (
                    <form onSubmit={handleSubmitBid} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Bid Amount (USD)
                        </label>
                        <Input
                          type="number"
                          placeholder="Enter your bid"
                          value={bidAmount}
                          onChange={(e) => setBidAmount(e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Delivery Time (days)
                        </label>
                        <Input
                          type="number"
                          placeholder="Days to complete"
                          value={deliveryTime}
                          onChange={(e) => setDeliveryTime(e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Proposal
                        </label>
                        <textarea
                          className="w-full p-3 border border-gray-300 rounded-md resize-none"
                          rows={4}
                          placeholder="Describe your approach and experience..."
                          value={bidProposal}
                          onChange={(e) => setBidProposal(e.target.value)}
                          required
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button type="submit" className="flex-1">
                          Submit Bid
                        </Button>
                        <Button 
                          type="button" 
                          variant="outline"
                          onClick={() => setShowBidForm(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Project Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Project Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Budget:</span>
                  <span className="font-semibold">{formatCurrency(project.budget)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Bids:</span>
                  <span className="font-semibold">{projectBids.length}</span>
                </div>
                {lowestBid && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Lowest Bid:</span>
                    <span className="font-semibold text-green-600">{formatCurrency(lowestBid)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Posted:</span>
                  <span className="font-semibold">{formatDate(project.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <Badge variant={project.status === 'open' ? 'default' : 'secondary'}>
                    {project.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Contact */}
            <Card>
              <CardHeader>
                <CardTitle>Need Help?</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button variant="outline" className="w-full justify-start">
                    <ChatBubbleLeftRightIcon className="h-4 w-4 mr-2" />
                    Contact Support
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <DocumentTextIcon className="h-4 w-4 mr-2" />
                    Report Project
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}