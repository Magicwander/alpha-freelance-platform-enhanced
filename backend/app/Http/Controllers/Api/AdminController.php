<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Project;
use App\Models\Payment;
use App\Models\Dispute;
use App\Models\Wallet;
use App\Models\Review;
use App\Models\Bid;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class AdminController extends Controller
{

    public function dashboard()
    {
        $stats = [
            'total_users' => User::count(),
            'total_projects' => Project::count(),
            'total_payments' => Payment::sum('amount'),
            'active_disputes' => Dispute::where('status', 'open')->count(),
            'recent_users' => User::latest()->take(5)->get(),
            'recent_projects' => Project::with('user')->latest()->take(5)->get(),
            'recent_payments' => Payment::with(['fromUser', 'toUser'])->latest()->take(5)->get(),
        ];

        return response()->json($stats);
    }

    public function users(Request $request)
    {
        $query = User::with('wallet');
        
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        if ($request->has('role')) {
            $query->where('role', $request->role);
        }

        $users = $query->paginate(20);
        return response()->json($users);
    }

    public function projects(Request $request)
    {
        $query = Project::with(['user', 'assignedUser']);
        
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $projects = $query->paginate(20);
        return response()->json($projects);
    }

    public function payments(Request $request)
    {
        $query = Payment::with(['fromUser', 'toUser', 'project']);
        
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $payments = $query->paginate(20);
        return response()->json($payments);
    }

    public function disputes(Request $request)
    {
        $query = Dispute::with(['raisedByUser', 'againstUser', 'project']);
        
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $disputes = $query->paginate(20);
        return response()->json($disputes);
    }

    public function updateUserStatus(Request $request, User $user)
    {
        $request->validate([
            'is_verified' => 'boolean',
            'status' => 'in:active,suspended,banned'
        ]);

        $user->update($request->only(['is_verified', 'status']));

        return response()->json([
            'message' => 'User status updated successfully',
            'user' => $user
        ]);
    }

    public function resolveDispute(Request $request, Dispute $dispute)
    {
        $request->validate([
            'resolution' => 'required|string',
            'winner' => 'required|in:raised_by,against_user',
            'refund_amount' => 'nullable|numeric|min:0'
        ]);

        DB::transaction(function() use ($request, $dispute) {
            $dispute->update([
                'status' => 'resolved',
                'resolution' => $request->resolution,
                'resolved_by' => auth()->id(),
                'resolved_at' => now()
            ]);

            // Handle refund if specified
            if ($request->refund_amount > 0) {
                $winner = $request->winner === 'raised_by' ? $dispute->raisedByUser : $dispute->againstUser;
                $winner->wallet->increment('balance_usdt', $request->refund_amount);
            }
        });

        return response()->json([
            'message' => 'Dispute resolved successfully',
            'dispute' => $dispute->fresh(['raisedByUser', 'againstUser'])
        ]);
    }

    public function systemStats()
    {
        $stats = [
            'users_by_role' => User::select('role', DB::raw('count(*) as count'))
                ->groupBy('role')
                ->get(),
            'projects_by_status' => Project::select('status', DB::raw('count(*) as count'))
                ->groupBy('status')
                ->get(),
            'payments_by_month' => Payment::select(
                DB::raw('strftime("%Y-%m", created_at) as month'),
                DB::raw('SUM(amount) as total'),
                DB::raw('COUNT(*) as count')
            )
                ->where('created_at', '>=', now()->subMonths(12))
                ->groupBy('month')
                ->orderBy('month')
                ->get(),
            'total_platform_fees' => Payment::where('type', 'platform_fee')->sum('amount'),
            'total_wallet_balance' => Wallet::sum('balance_usdt')
        ];

        return response()->json($stats);
    }

    /**
     * Generate comprehensive user activity report
     */
    public function generateUserReport(Request $request)
    {
        $startDate = $request->get('start_date', now()->subMonth());
        $endDate = $request->get('end_date', now());
        
        $userReport = User::select([
            'users.id',
            'users.name',
            'users.email',
            'users.role',
            'users.created_at',
            'users.is_verified',
            DB::raw('COUNT(DISTINCT projects.id) as total_projects'),
            DB::raw('COUNT(DISTINCT bids.id) as total_bids'),
            DB::raw('COUNT(DISTINCT reviews_given.id) as reviews_given'),
            DB::raw('COUNT(DISTINCT reviews_received.id) as reviews_received'),
            DB::raw('AVG(reviews_received.rating) as average_rating'),
            DB::raw('COALESCE(SUM(payments_sent.amount), 0) as total_spent'),
            DB::raw('COALESCE(SUM(payments_received.amount), 0) as total_earned'),
            DB::raw('wallets.balance_usdt as wallet_balance')
        ])
        ->leftJoin('projects', 'users.id', '=', 'projects.user_id')
        ->leftJoin('bids', 'users.id', '=', 'bids.user_id')
        ->leftJoin('reviews as reviews_given', 'users.id', '=', 'reviews_given.reviewer_id')
        ->leftJoin('reviews as reviews_received', 'users.id', '=', 'reviews_received.reviewed_user_id')
        ->leftJoin('payments as payments_sent', 'users.id', '=', 'payments_sent.payer_id')
        ->leftJoin('payments as payments_received', 'users.id', '=', 'payments_received.payee_id')
        ->leftJoin('wallets', 'users.id', '=', 'wallets.user_id')
        ->whereBetween('users.created_at', [$startDate, $endDate])
        ->groupBy([
            'users.id', 'users.name', 'users.email', 'users.role', 
            'users.created_at', 'users.is_verified', 'wallets.balance_usdt'
        ])
        ->orderBy('total_earned', 'desc')
        ->get();

        return response()->json([
            'message' => 'User activity report generated successfully',
            'report_period' => [
                'start_date' => $startDate,
                'end_date' => $endDate
            ],
            'total_users' => $userReport->count(),
            'users' => $userReport,
            'summary' => [
                'total_projects_created' => $userReport->sum('total_projects'),
                'total_bids_placed' => $userReport->sum('total_bids'),
                'total_reviews_given' => $userReport->sum('reviews_given'),
                'total_platform_volume' => $userReport->sum('total_spent'),
                'average_user_rating' => $userReport->where('average_rating', '>', 0)->avg('average_rating')
            ]
        ]);
    }

    /**
     * Generate project completion and performance report
     */
    public function generateProjectReport(Request $request)
    {
        $startDate = $request->get('start_date', now()->subMonth());
        $endDate = $request->get('end_date', now());
        
        $projectReport = Project::select([
            'projects.id',
            'projects.title',
            'projects.category',
            'projects.budget',
            'projects.status',
            'projects.created_at',
            'projects.updated_at',
            'users.name as client_name',
            'assigned_user.name as freelancer_name',
            DB::raw('COUNT(bids.id) as total_bids'),
            DB::raw('MIN(bids.amount) as lowest_bid'),
            DB::raw('MAX(bids.amount) as highest_bid'),
            DB::raw('AVG(bids.amount) as average_bid'),
            DB::raw('julianday(projects.updated_at) - julianday(projects.created_at) as completion_days'),
            DB::raw('COUNT(DISTINCT reviews.id) as review_count'),
            DB::raw('AVG(reviews.rating) as average_rating')
        ])
        ->join('users', 'projects.user_id', '=', 'users.id')
        ->leftJoin('users as assigned_user', 'projects.assigned_to', '=', 'assigned_user.id')
        ->leftJoin('bids', 'projects.id', '=', 'bids.project_id')
        ->leftJoin('reviews', 'projects.id', '=', 'reviews.project_id')
        ->whereBetween('projects.created_at', [$startDate, $endDate])
        ->groupBy([
            'projects.id', 'projects.title', 'projects.category', 'projects.budget',
            'projects.status', 'projects.created_at', 'projects.updated_at',
            'users.name', 'assigned_user.name'
        ])
        ->orderBy('projects.created_at', 'desc')
        ->get();

        $categoryStats = Project::select([
            'category',
            DB::raw('COUNT(*) as project_count'),
            DB::raw('AVG(budget) as average_budget'),
            DB::raw('SUM(CASE WHEN status = "completed" THEN 1 ELSE 0 END) as completed_count'),
            DB::raw('(SUM(CASE WHEN status = "completed" THEN 1 ELSE 0 END) / COUNT(*) * 100) as completion_rate')
        ])
        ->whereBetween('created_at', [$startDate, $endDate])
        ->groupBy('category')
        ->orderBy('project_count', 'desc')
        ->get();

        return response()->json([
            'message' => 'Project performance report generated successfully',
            'report_period' => [
                'start_date' => $startDate,
                'end_date' => $endDate
            ],
            'projects' => $projectReport,
            'category_statistics' => $categoryStats,
            'summary' => [
                'total_projects' => $projectReport->count(),
                'completed_projects' => $projectReport->where('status', 'completed')->count(),
                'average_completion_time' => $projectReport->where('completion_days', '>', 0)->avg('completion_days'),
                'total_project_value' => $projectReport->sum('budget'),
                'average_project_rating' => $projectReport->where('average_rating', '>', 0)->avg('average_rating')
            ]
        ]);
    }

    /**
     * Generate financial transactions report
     */
    public function generateFinancialReport(Request $request)
    {
        $startDate = $request->get('start_date', now()->subMonth());
        $endDate = $request->get('end_date', now());
        
        $paymentReport = Payment::select([
            'payments.id',
            'payments.amount',
            'payments.type',
            'payments.status',
            'payments.created_at',
            'payments.payment_method',
            'payer.name as payer_name',
            'payee.name as payee_name',
            'projects.title as project_title'
        ])
        ->leftJoin('users as payer', 'payments.payer_id', '=', 'payer.id')
        ->leftJoin('users as payee', 'payments.payee_id', '=', 'payee.id')
        ->leftJoin('projects', 'payments.project_id', '=', 'projects.id')
        ->whereBetween('payments.created_at', [$startDate, $endDate])
        ->orderBy('payments.created_at', 'desc')
        ->get();

        $monthlyRevenue = Payment::select([
            DB::raw('strftime("%Y-%m", created_at) as month'),
            DB::raw('SUM(CASE WHEN type = "escrow" AND status = "completed" THEN amount ELSE 0 END) as escrow_completed'),
            DB::raw('SUM(CASE WHEN type = "deposit" THEN amount ELSE 0 END) as deposits'),
            DB::raw('SUM(CASE WHEN type = "withdrawal" THEN amount ELSE 0 END) as withdrawals'),
            DB::raw('COUNT(*) as transaction_count')
        ])
        ->whereBetween('created_at', [$startDate, $endDate])
        ->groupBy('month')
        ->orderBy('month')
        ->get();

        return response()->json([
            'message' => 'Financial report generated successfully',
            'report_period' => [
                'start_date' => $startDate,
                'end_date' => $endDate
            ],
            'transactions' => $paymentReport,
            'monthly_revenue' => $monthlyRevenue,
            'summary' => [
                'total_transactions' => $paymentReport->count(),
                'total_volume' => $paymentReport->sum('amount'),
                'completed_escrows' => $paymentReport->where('type', 'escrow')->where('status', 'completed')->sum('amount'),
                'total_deposits' => $paymentReport->where('type', 'deposit')->sum('amount'),
                'total_withdrawals' => $paymentReport->where('type', 'withdrawal')->sum('amount'),
                'pending_transactions' => $paymentReport->where('status', 'pending')->count()
            ]
        ]);
    }

    /**
     * Generate dispute resolution report
     */
    public function generateDisputeReport(Request $request)
    {
        $startDate = $request->get('start_date', now()->subMonth());
        $endDate = $request->get('end_date', now());
        
        $disputeReport = Dispute::select([
            'disputes.id',
            'disputes.type',
            'disputes.status',
            'disputes.created_at',
            'disputes.resolved_at',
            'complainant.name as complainant_name',
            'respondent.name as respondent_name',
            'projects.title as project_title',
            'projects.budget as project_budget',
            DB::raw('julianday(COALESCE(disputes.resolved_at, datetime("now"))) - julianday(disputes.created_at) as resolution_days')
        ])
        ->join('users as complainant', 'disputes.complainant_id', '=', 'complainant.id')
        ->join('users as respondent', 'disputes.respondent_id', '=', 'respondent.id')
        ->join('projects', 'disputes.project_id', '=', 'projects.id')
        ->whereBetween('disputes.created_at', [$startDate, $endDate])
        ->orderBy('disputes.created_at', 'desc')
        ->get();

        $disputeStats = Dispute::select([
            'type',
            DB::raw('COUNT(*) as count'),
            DB::raw('AVG(julianday(COALESCE(resolved_at, datetime("now"))) - julianday(created_at)) as avg_resolution_days'),
            DB::raw('SUM(CASE WHEN status = "resolved" THEN 1 ELSE 0 END) as resolved_count')
        ])
        ->whereBetween('created_at', [$startDate, $endDate])
        ->groupBy('type')
        ->get();

        return response()->json([
            'message' => 'Dispute resolution report generated successfully',
            'report_period' => [
                'start_date' => $startDate,
                'end_date' => $endDate
            ],
            'disputes' => $disputeReport,
            'dispute_statistics' => $disputeStats,
            'summary' => [
                'total_disputes' => $disputeReport->count(),
                'resolved_disputes' => $disputeReport->where('status', 'resolved')->count(),
                'pending_disputes' => $disputeReport->where('status', 'open')->count(),
                'average_resolution_time' => $disputeReport->where('resolved_at', '!=', null)->avg('resolution_days'),
                'resolution_rate' => $disputeReport->count() > 0 ? 
                    ($disputeReport->where('status', 'resolved')->count() / $disputeReport->count() * 100) : 0
            ]
        ]);
    }

    /**
     * Export data in CSV format
     */
    public function exportData(Request $request)
    {
        $type = $request->get('type', 'users'); // users, projects, payments, disputes
        $startDate = $request->get('start_date', now()->subMonth());
        $endDate = $request->get('end_date', now());
        
        $filename = $type . '_export_' . now()->format('Y-m-d_H-i-s') . '.csv';
        
        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ];
        
        $callback = function() use ($type, $startDate, $endDate) {
            $file = fopen('php://output', 'w');
            
            switch ($type) {
                case 'users':
                    fputcsv($file, ['ID', 'Name', 'Email', 'Role', 'Created At', 'Verified', 'Total Projects', 'Wallet Balance']);
                    User::with('wallet')
                        ->whereBetween('created_at', [$startDate, $endDate])
                        ->chunk(100, function($users) use ($file) {
                            foreach ($users as $user) {
                                fputcsv($file, [
                                    $user->id,
                                    $user->name,
                                    $user->email,
                                    $user->role,
                                    $user->created_at,
                                    $user->is_verified ? 'Yes' : 'No',
                                    $user->projects()->count(),
                                    $user->wallet ? $user->wallet->balance_usdt : 0
                                ]);
                            }
                        });
                    break;
                    
                case 'projects':
                    fputcsv($file, ['ID', 'Title', 'Category', 'Budget', 'Status', 'Client', 'Freelancer', 'Created At']);
                    Project::with(['user', 'assignedUser'])
                        ->whereBetween('created_at', [$startDate, $endDate])
                        ->chunk(100, function($projects) use ($file) {
                            foreach ($projects as $project) {
                                fputcsv($file, [
                                    $project->id,
                                    $project->title,
                                    $project->category,
                                    $project->budget,
                                    $project->status,
                                    $project->user->name,
                                    $project->assignedUser ? $project->assignedUser->name : 'N/A',
                                    $project->created_at
                                ]);
                            }
                        });
                    break;
                    
                case 'payments':
                    fputcsv($file, ['ID', 'Amount', 'Type', 'Status', 'Payer', 'Payee', 'Project', 'Created At']);
                    Payment::with(['payer', 'payee', 'project'])
                        ->whereBetween('created_at', [$startDate, $endDate])
                        ->chunk(100, function($payments) use ($file) {
                            foreach ($payments as $payment) {
                                fputcsv($file, [
                                    $payment->id,
                                    $payment->amount,
                                    $payment->type,
                                    $payment->status,
                                    $payment->payer ? $payment->payer->name : 'N/A',
                                    $payment->payee ? $payment->payee->name : 'N/A',
                                    $payment->project ? $payment->project->title : 'N/A',
                                    $payment->created_at
                                ]);
                            }
                        });
                    break;
            }
            
            fclose($file);
        };
        
        return response()->stream($callback, 200, $headers);
    }
}