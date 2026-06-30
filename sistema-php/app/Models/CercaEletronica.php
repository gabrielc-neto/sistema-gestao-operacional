<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CercaEletronica extends Model
{
    protected $table = 'cercas_eletronicas';
    public $timestamps = false;
    protected $guarded = [];
    protected $casts = ['pontos' => 'array'];
}
