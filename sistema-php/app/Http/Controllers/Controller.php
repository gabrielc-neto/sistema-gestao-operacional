<?php

namespace App\Http\Controllers;

abstract class Controller
{
    /** empresa_id do usuário logado (escopo multi-tenant). */
    protected function empresaId(): int
    {
        return (int) (auth()->user()->empresa_id ?? 1);
    }
}
