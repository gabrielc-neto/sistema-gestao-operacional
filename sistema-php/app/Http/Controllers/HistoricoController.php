<?php

namespace App\Http\Controllers;

use App\Models\Historico;
use Illuminate\Http\Request;
use Illuminate\View\View;

class HistoricoController extends Controller
{
    public function index(Request $request): View
    {
        $q = Historico::where('empresa_id', $this->empresaId());
        if ($modulo = $request->get('modulo')) {
            $q->where('modulo', $modulo);
        }
        if ($busca = $request->get('busca')) {
            $q->where('descricao', 'like', "%{$busca}%");
        }
        $eventos = $q->orderByDesc('created_at')->paginate(50)->withQueryString();
        $modulos = Historico::where('empresa_id', $this->empresaId())
            ->distinct()->orderBy('modulo')->pluck('modulo');
        return view('historico.index', compact('eventos', 'modulos'));
    }
}
