<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Motorista extends Model
{
    protected $table = 'motoristas';

    protected $fillable = [
        'empresa_id', 'nome', 'cnh', 'cat', 'tel', 'status',
        'cnh_venc', 'mopp_venc', 'nr20_venc', 'nr35_venc', 'obs',
    ];

    protected $casts = [
        'cnh_venc'  => 'date',
        'mopp_venc' => 'date',
        'nr20_venc' => 'date',
        'nr35_venc' => 'date',
    ];

    public function ferias(): HasMany
    {
        return $this->hasMany(Ferias::class);
    }
}
