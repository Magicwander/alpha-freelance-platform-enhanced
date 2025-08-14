<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Models\Project;
use App\Models\Wallet;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class PaymentController extends Controller
{
    /**
     * Display a listing of payments for the authenticated user.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        
        $payments = Payment::with(['project', 'payer', 'payee'])
            ->where(function($query) use ($user) {
                $query->where('payer_id', $user->id)
                      ->orWhere('payee_id', $user->id);
            })
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return response()->json($payments);
    }

    /**
     * Display the specified payment.
     */
    public function show(Request $request, Payment $payment)
    {
        $user = $request->user();
        
        // Check if user is involved in this payment
        if ($payment->payer_id !== $user->id && $payment->payee_id !== $user->id) {
            return response()->json([
                'message' => 'Unauthorized'
            ], 403);
        }

        return response()->json([
            'payment' => $payment->load(['project', 'payer', 'payee'])
        ]);
    }

    /**
     * Create escrow payment when project starts.
     */
    public function createEscrow(Request $request, Project $project)
    {
        // Check if user owns the project
        if ($project->user_id !== $request->user()->id) {
            return response()->json([
                'message' => 'Unauthorized'
            ], 403);
        }

        // Check if project is in progress and has assigned freelancer
        if ($project->status !== 'in_progress' || !$project->assigned_to) {
            return response()->json([
                'message' => 'Project must be in progress with assigned freelancer'
            ], 400);
        }

        // Check if escrow payment already exists
        $existingPayment = Payment::where('project_id', $project->id)
            ->where('type', 'escrow')
            ->first();
            
        if ($existingPayment) {
            return response()->json([
                'message' => 'Escrow payment already exists for this project'
            ], 400);
        }

        // Get the accepted bid amount
        $acceptedBid = $project->bids()->where('status', 'accepted')->first();
        if (!$acceptedBid) {
            return response()->json([
                'message' => 'No accepted bid found'
            ], 400);
        }

        DB::beginTransaction();
        try {
            // Check client wallet balance
            $clientWallet = $request->user()->wallet;
            if ($clientWallet->balance_usdt < $acceptedBid->amount) {
                return response()->json([
                    'message' => 'Insufficient wallet balance'
                ], 400);
            }

            // Deduct from client wallet
            $clientWallet->decrement('balance_usdt', $acceptedBid->amount);

            // Create escrow payment
            $payment = Payment::create([
                'project_id' => $project->id,
                'payer_id' => $request->user()->id,
                'payee_id' => $project->assigned_to,
                'amount' => $acceptedBid->amount,
                'type' => 'escrow',
                'status' => 'held',
                'transaction_hash' => '0x' . bin2hex(random_bytes(32)),
            ]);

            DB::commit();

            return response()->json([
                'message' => 'Escrow payment created successfully',
                'payment' => $payment->load(['project', 'payer', 'payee'])
            ], 201);

        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'message' => 'Payment creation failed'
            ], 500);
        }
    }

    /**
     * Release escrow payment when project is completed.
     */
    public function releaseEscrow(Request $request, Payment $payment)
    {
        // Check if user is the project owner
        if ($payment->payer_id !== $request->user()->id) {
            return response()->json([
                'message' => 'Unauthorized'
            ], 403);
        }

        // Check if payment is in escrow
        if ($payment->type !== 'escrow' || $payment->status !== 'held') {
            return response()->json([
                'message' => 'Payment is not in escrow or already processed'
            ], 400);
        }

        // Check if project is completed
        if ($payment->project->status !== 'completed') {
            return response()->json([
                'message' => 'Project must be marked as completed first'
            ], 400);
        }

        DB::beginTransaction();
        try {
            // Add to freelancer wallet
            $freelancerWallet = Wallet::where('user_id', $payment->payee_id)->first();
            $freelancerWallet->increment('balance_usdt', $payment->amount);

            // Update payment status
            $payment->update([
                'status' => 'completed',
                'released_at' => now()
            ]);

            DB::commit();

            return response()->json([
                'message' => 'Payment released successfully',
                'payment' => $payment->load(['project', 'payer', 'payee'])
            ]);

        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'message' => 'Payment release failed'
            ], 500);
        }
    }

    /**
     * Mark project as completed (freelancer action).
     */
    public function markCompleted(Request $request, Project $project)
    {
        // Check if user is assigned to the project
        if ($project->assigned_to !== $request->user()->id) {
            return response()->json([
                'message' => 'Unauthorized'
            ], 403);
        }

        // Check if project is in progress
        if ($project->status !== 'in_progress') {
            return response()->json([
                'message' => 'Project is not in progress'
            ], 400);
        }

        $project->update(['status' => 'completed']);

        return response()->json([
            'message' => 'Project marked as completed',
            'project' => $project->load(['user', 'bids.user'])
        ]);
    }

    /**
     * Request refund (dispute scenario).
     */
    public function requestRefund(Request $request, Payment $payment)
    {
        // Check if user is the payer
        if ($payment->payer_id !== $request->user()->id) {
            return response()->json([
                'message' => 'Unauthorized'
            ], 403);
        }

        // Check if payment is in escrow
        if ($payment->type !== 'escrow' || $payment->status !== 'held') {
            return response()->json([
                'message' => 'Payment is not eligible for refund'
            ], 400);
        }

        $validator = Validator::make($request->all(), [
            'reason' => 'required|string|min:20',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $payment->update([
            'status' => 'refund_requested',
            'refund_reason' => $request->reason
        ]);

        return response()->json([
            'message' => 'Refund requested successfully',
            'payment' => $payment->load(['project', 'payer', 'payee'])
        ]);
    }

    /**
     * Process refund (admin action).
     */
    public function processRefund(Request $request, Payment $payment)
    {
        // Check if user is admin
        if ($request->user()->role !== 'admin') {
            return response()->json([
                'message' => 'Unauthorized'
            ], 403);
        }

        // Check if refund was requested
        if ($payment->status !== 'refund_requested') {
            return response()->json([
                'message' => 'No refund request found'
            ], 400);
        }

        DB::beginTransaction();
        try {
            // Refund to client wallet
            $clientWallet = Wallet::where('user_id', $payment->payer_id)->first();
            $clientWallet->increment('balance_usdt', $payment->amount);

            // Update payment status
            $payment->update([
                'status' => 'refunded',
                'refunded_at' => now()
            ]);

            // Update project status
            $payment->project->update(['status' => 'cancelled']);

            DB::commit();

            return response()->json([
                'message' => 'Refund processed successfully',
                'payment' => $payment->load(['project', 'payer', 'payee'])
            ]);

        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'message' => 'Refund processing failed'
            ], 500);
        }
    }
}