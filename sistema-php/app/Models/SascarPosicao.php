<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SascarPosicao extends Model
{
    protected $table = 'sascar_posicoes';
    public $timestamps = false;
    protected $guarded = [];
    protected $casts = ['dentro_de' => 'array'];
}
