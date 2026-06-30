<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Cargo extends Model
{
    protected $table = 'cargos';
    protected $fillable = ['empresa_id', 'setor_id', 'nome', 'nivel', 'descricao', 'status'];

    public function setor(): BelongsTo
    {
        return $this->belongsTo(Setor::class);
    }

    /** Permissões denormalizadas no Firestore -> pivot cargo_permissao no SQL. */
    public function permissoes(): BelongsToMany
    {
        return $this->belongsToMany(Permissao::class, 'cargo_permissao', 'cargo_id', 'permissao_id');
    }
}
