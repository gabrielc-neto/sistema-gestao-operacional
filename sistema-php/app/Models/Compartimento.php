<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Compartimento extends Model
{
    protected $table = 'compartimentos';
    public $timestamps = false;
    protected $fillable = ['veiculo_id', 'numero', 'capacidade_litros', 'produto_id'];

    public function veiculo(): BelongsTo
    {
        return $this->belongsTo(Veiculo::class);
    }

    public function produto(): BelongsTo
    {
        return $this->belongsTo(Produto::class);
    }
}
