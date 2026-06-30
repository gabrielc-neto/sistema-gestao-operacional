<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Viagem extends Model
{
    protected $table = 'viagens';
    protected $fillable = [
        'empresa_id', 'ordem_id', 'motorista_id', 'status',
        'pos_lat', 'pos_lng', 'pos_timestamp',
    ];
    protected $casts = ['pos_timestamp' => 'datetime'];

    public function ordem(): BelongsTo
    {
        return $this->belongsTo(OrdemCarregamento::class, 'ordem_id');
    }

    public function eventos(): HasMany
    {
        return $this->hasMany(ViagemEvento::class);
    }
}
