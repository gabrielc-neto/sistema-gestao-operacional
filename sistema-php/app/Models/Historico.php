<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Log de auditoria: quem, o quê, quando, valor antes/depois. */
class Historico extends Model
{
    protected $table = 'historico';
    public $timestamps = false;
    protected $fillable = [
        'empresa_id', 'usuario_id', 'usuario_nome', 'modulo', 'acao',
        'entidade', 'entidade_id', 'descricao', 'valor_antes', 'valor_depois', 'ip', 'created_at',
    ];
    protected $casts = [
        'valor_antes'  => 'array',
        'valor_depois' => 'array',
        'created_at'   => 'datetime',
    ];
}
