<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Manutencao extends Model
{
    protected $table = 'manutencoes';
    protected $fillable = [
        'empresa_id', 'veiculo_id', 'placa', 'tipo', 'data_realiz', 'venc',
        'local', 'numero_doc', 'km_atual', 'resp', 'obs',
    ];
    protected $casts = ['data_realiz' => 'date', 'venc' => 'date'];

    public function veiculo(): BelongsTo
    {
        return $this->belongsTo(Veiculo::class);
    }

    public function anexos(): HasMany
    {
        return $this->hasMany(ManutencaoAnexo::class);
    }

    /** Status calculado pelo vencimento: vencido | alerta | ok | sem_data. */
    public function getStatusAttribute(): string
    {
        if (!$this->venc) {
            return 'sem_data';
        }
        $hoje = Carbon::today();
        if ($this->venc->lt($hoje)) {
            return 'vencido';
        }
        if ($this->venc->lte($hoje->copy()->addDays(30))) {
            return 'alerta';
        }
        return 'ok';
    }
}
