<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Frota: cavalos e carretas.
 * Bloqueio (bloqueio_ativo) é compartilhado entre OS de manutenção (origem 'os')
 * e bloqueio manual. Veículo bloqueado não pode gerar OC.
 */
class Veiculo extends Model
{
    protected $table = 'veiculos';

    protected $fillable = [
        'empresa_id', 'placa', 'tipo', 'status', 'modelo', 'fabricante',
        'ano_modelo', 'ano_fab', 'chassi', 'renavam', 'tara',
        'cap', 'comp', 'motorista_id', 'c1_veiculo_id', 't1', 'c2_veiculo_id', 't2',
        'bloqueio_ativo', 'bloqueio_motivo', 'bloqueio_origem', 'bloqueio_obs', 'obs',
    ];

    protected $casts = ['bloqueio_ativo' => 'boolean'];

    public function motorista(): BelongsTo
    {
        return $this->belongsTo(Motorista::class);
    }

    public function compartimentos(): HasMany
    {
        return $this->hasMany(Compartimento::class);
    }

    public function manutencoes(): HasMany
    {
        return $this->hasMany(Manutencao::class);
    }

    public function setPlacaAttribute($value): void
    {
        // Normaliza: UPPER, sem traço/espaço
        $this->attributes['placa'] = strtoupper(preg_replace('/[\s-]/', '', (string) $value));
    }
}
