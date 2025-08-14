<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Project;
use App\Models\Payment;
use App\Models\Dispute;
use App\Models\Wallet;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
        $this->middleware(function ($request, $next) {
            if ($request->user()->role !== 'admin') {
                return response()->json(['message' => 'Unauthorized. Admin access required.'], 403);
            }
            return $next($request);
        });
    }

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
                DB::raw('DATE_FORMAT(created_at, "%Y-%m") as month'),
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
}