<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * OS de manutenção mecânica. Regras de negócio (CLAUDE.md §6):
 *  - Abrir OS bloqueia o veículo (bloqueio.origem = 'os').
 *  - Editável só por 24h após abertura.
 *  - Finalizar libera o veículo se não houver outra OS aberta no mesmo veículo.
 */
class OrdemServico extends Model
{
    protected $table = 'ordens_servico';

    protected $fillable = [
        'empresa_id', 'numero', 'data_hora', 'tipo_servico', 'veiculo_id', 'placa',
        'motorista_id', 'motorista_nome', 'status', 'obs', 'criado_por', 'finalizada_em',
    ];

    protected $casts = [
        'data_hora'     => 'datetime',
        'finalizada_em' => 'datetime',
    ];

    public function veiculo(): BelongsTo
    {
        return $this->belongsTo(Veiculo::class);
    }

    /** Pode editar? Apenas nas primeiras 24h e enquanto aberta. */
    public function podeEditar(): bool
    {
        return $this->status === 'aberta'
            && $this->data_hora
            && $this->data_hora->gt(Carbon::now()->subDay());
    }
}
