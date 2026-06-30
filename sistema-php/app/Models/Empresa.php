<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Tenant (multi-tenancy). Cada empresa isolada por empresa_id. */
class Empresa extends Model
{
    protected $table = 'empresas';
    protected $fillable = ['nome', 'cnpj', 'slug', 'plano', 'ativo'];
    protected $casts = ['ativo' => 'boolean'];
}
