<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Usina extends Model
{
    protected $table = 'usinas';
    protected $fillable = ['empresa_id', 'nome', 'endereco', 'lat', 'lng', 'produtos_disponiveis'];
    protected $casts = ['produtos_disponiveis' => 'array'];
}
