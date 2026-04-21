<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'device_uuid',
        'avatar_color',
        'last_seen_at',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'device_uuid',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'last_seen_at' => 'datetime',
    ];

    protected $appends = [
        'formatted_created_at',
        'initials',
        'is_online',
        'display_name',
    ];

    public function getFormattedCreatedAtAttribute()
    {
        return $this->created_at->format(config('app.date_format'));
    }

    public function getDisplayNameAttribute(): string
    {
        return $this->name;
    }

    public function getInitialsAttribute(): string
    {
        return collect(explode(' ', trim($this->name)))
            ->filter()
            ->take(2)
            ->map(fn ($part) => strtoupper(substr($part, 0, 1)))
            ->implode('');
    }

    public function getIsOnlineAttribute(): bool
    {
        return $this->last_seen_at?->gt(now()->subMinutes(2)) ?? false;
    }

    public static function generateAvatarColor(): string
    {
        return collect(['sunset', 'lagoon', 'forest', 'ember', 'violet', 'sand'])
            ->random();
    }

    public function chatRooms(): BelongsToMany
    {
        return $this->belongsToMany(ChatRoom::class, 'chat_room_members', 'user_id', 'room_id')
            ->using(ChatRoomMember::class)
            ->withPivot(['id', 'role', 'joined_at', 'last_read_message_id'])
            ->withTimestamps();
    }

    public function sentMessages(): HasMany
    {
        return $this->hasMany(ChatMessage::class);
    }
}
