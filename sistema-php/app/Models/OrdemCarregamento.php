<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class OrdemCarregamento extends Model
{
    protected $table = 'ordens_carregamento';

    protected $fillable = [
        'empresa_id', 'num', 'data', 'hora', 'base',
        'cavalo_id', 'cavalo_placa', 'motorista_id', 'motorista_nome', 'resp',
        'c1_placa', 't1', 'c2_placa', 't2', 'obs', 'created_by',
    ];

    protected $casts = ['data' => 'date'];

    public function entregas(): HasMany
    {
        return $this->hasMany(OcEntrega::class, 'oc_id');
    }

    public function cavalo(): BelongsTo
    {
        return $this->belongsTo(Veiculo::class, 'cavalo_id');
    }
}
