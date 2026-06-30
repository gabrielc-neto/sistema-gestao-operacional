<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Atrelamento extends Model
{
    protected $table = 'atrelamentos';
    public $timestamps = false;
    protected $fillable = [
        'empresa_id', 'num', 'data', 'hora', 'op', 'cavalo_id', 'cavalo_placa', 'km',
        'c1_placa', 't1', 'c2_placa', 't2', 'motorista_nome', 'local', 'status', 'obs', 'created_at',
    ];
    protected $casts = ['data' => 'date', 'created_at' => 'datetime'];
}
