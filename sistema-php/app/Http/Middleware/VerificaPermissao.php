<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Middleware RBAC. Uso nas rotas: ->middleware('perm:frota.editar')
 * Super admin sempre passa. Substitui as Firestore Rules + checagem na API.
 */
class VerificaPermissao
{
    public function handle(Request $request, Closure $next, string $permissao): Response
    {
        $usuario = $request->user();

        if (!$usuario || !$usuario->ativo) {
            abort(403, 'Usuário inativo ou não autenticado.');
        }

        if (!$usuario->temPermissao($permissao)) {
            abort(403, "Sem permissão: {$permissao}");
        }

        return $next($request);
    }
}
