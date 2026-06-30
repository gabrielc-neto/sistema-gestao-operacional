<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Ferias extends Model
{
    protected $table = 'ferias';
    public $timestamps = false;
    protected $fillable = ['empresa_id', 'motorista_id', 'motorista_nome', 'inicio', 'fim', 'esocial', 'obs', 'created_at'];
    protected $casts = ['inicio' => 'date', 'fim' => 'date', 'esocial' => 'boolean', 'created_at' => 'datetime'];

    public function motorista(): BelongsTo
    {
        return $this->belongsTo(Motorista::class);
    }

    /** agendada | em_ferias | concluida */
    public function getSituacaoAttribute(): string
    {
        $hoje = Carbon::today();
        if ($this->inicio && $this->inicio->gt($hoje)) {
            return 'agendada';
        }
        if ($this->fim && $this->fim->lt($hoje)) {
            return 'concluida';
        }
        return 'em_ferias';
    }
}
