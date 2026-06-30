<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OcEntrega extends Model
{
    protected $table = 'oc_entregas';
    public $timestamps = false;
    protected $fillable = ['oc_id', 'seq', 'dest', 'cliente_id', 'prod', 'vol', 'req', 'status'];

    public function ordem(): BelongsTo
    {
        return $this->belongsTo(OrdemCarregamento::class, 'oc_id');
    }
}
