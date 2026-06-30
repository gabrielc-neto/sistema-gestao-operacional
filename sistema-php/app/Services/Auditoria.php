<?php

namespace App\Services;

use App\Models\Historico;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;

/**
 * Log de auditoria completo (CLAUDE.md — Requisitos de UX §1):
 * quem, o quê, quando, valor antes/depois.
 *
 * Uso:
 *   Auditoria::log('frota', 'editar', 'veiculos', $v->id, 'Editou placa', $antes, $depois);
 */
class Auditoria
{
    public static function log(
        string $modulo,
        string $acao,
        ?string $entidade = null,
        $entidadeId = null,
        ?string $descricao = null,
        ?array $antes = null,
        ?array $depois = null,
    ): void {
        $u = Auth::user();

        Historico::create([
            'empresa_id'   => $u?->empresa_id ?? 1,
            'usuario_id'   => $u?->id,
            'usuario_nome' => $u?->nome,
            'modulo'       => $modulo,
            'acao'         => $acao,
            'entidade'     => $entidade,
            'entidade_id'  => $entidadeId !== null ? (string) $entidadeId : null,
            'descricao'    => $descricao,
            'valor_antes'  => $antes,
            'valor_depois' => $depois,
            'ip'           => Request::ip(),
            'created_at'   => now(),
        ]);
    }
}
