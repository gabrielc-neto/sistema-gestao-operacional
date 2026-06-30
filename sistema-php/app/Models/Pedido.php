<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Pedido extends Model
{
    protected $table = 'pedidos';
    protected $fillable = [
        'empresa_id', 'cliente_id', 'produto_id', 'litros',
        'data_solicitada', 'status', 'nfe_vinculada',
    ];
    protected $casts = ['data_solicitada' => 'date'];

    public function cliente(): BelongsTo
    {
        return $this->belongsTo(Cliente::class);
    }

    public function produto(): BelongsTo
    {
        return $this->belongsTo(Produto::class);
    }
}
