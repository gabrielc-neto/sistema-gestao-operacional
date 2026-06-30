<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ViagemEvento extends Model
{
    protected $table = 'viagem_eventos';
    public $timestamps = false;
    protected $fillable = ['viagem_id', 'tipo', 'descricao', 'ocorrido_em'];
    protected $casts = ['ocorrido_em' => 'datetime'];
}
