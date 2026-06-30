<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Setor extends Model
{
    protected $table = 'setores';
    protected $fillable = ['empresa_id', 'nome', 'descricao', 'status'];

    public function cargos(): HasMany
    {
        return $this->hasMany(Cargo::class);
    }
}
