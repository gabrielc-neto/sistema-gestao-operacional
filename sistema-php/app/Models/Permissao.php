<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Catálogo mestre de permissões <modulo>.<acao>. */
class Permissao extends Model
{
    protected $table = 'permissoes_catalogo';
    public $timestamps = false;
    protected $fillable = ['nome', 'modulo', 'acao', 'descricao'];
}
