<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payment extends Model
{
    protected $fillable = [
        'project_id',
        'payer_id',
        'payee_id',
        'amount',
        'type',
        'status',
        'transaction_hash',
        'refund_reason',
        'released_at',
        'refunded_at',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'released_at' => 'datetime',
        'refunded_at' => 'datetime',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function payer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'payer_id');
    }

    public function payee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'payee_id');
    }
}
