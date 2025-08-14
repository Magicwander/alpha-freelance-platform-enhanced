<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable, HasApiTokens;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'avatar',
        'bio',
        'skills',
        'rating',
        'total_projects',
        'is_verified',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'skills' => 'array',
            'rating' => 'decimal:2',
            'is_verified' => 'boolean',
        ];
    }

    // Relationships
    public function projects()
    {
        return $this->hasMany(Project::class);
    }

    public function bids()
    {
        return $this->hasMany(Bid::class);
    }

    public function wallet()
    {
        return $this->hasOne(Wallet::class);
    }

    public function sentPayments()
    {
        return $this->hasMany(Payment::class, 'from_user_id');
    }

    public function receivedPayments()
    {
        return $this->hasMany(Payment::class, 'to_user_id');
    }

    public function raisedDisputes()
    {
        return $this->hasMany(Dispute::class, 'raised_by');
    }

    public function disputesAgainst()
    {
        return $this->hasMany(Dispute::class, 'against_user');
    }

    public function givenReviews()
    {
        return $this->hasMany(Review::class, 'reviewer_id');
    }

    public function receivedReviews()
    {
        return $this->hasMany(Review::class, 'reviewed_user_id');
    }
}
