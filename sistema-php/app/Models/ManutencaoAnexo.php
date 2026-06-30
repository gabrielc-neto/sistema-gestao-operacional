<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ManutencaoAnexo extends Model
{
    protected $table = 'manutencao_anexos';
    public $timestamps = false;
    protected $fillable = ['manutencao_id', 'nome_arquivo', 'caminho', 'mime', 'tamanho'];

    public function manutencao(): BelongsTo
    {
        return $this->belongsTo(Manutencao::class);
    }
}
