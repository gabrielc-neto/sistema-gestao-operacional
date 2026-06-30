<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Produto extends Model
{
    protected $table = 'produtos';
    protected $fillable = ['empresa_id', 'nome', 'codigo_anp', 'unidade'];
}
