<?php

namespace App\Http\Controllers;

use App\Models\Manutencao;
use App\Models\Motorista;
use App\Models\OrdemServico;
use App\Models\Veiculo;
use Illuminate\View\View;

class DashboardController extends Controller
{
    public function index(): View
    {
        $eid = $this->empresaId();

        $totais = [
            'veiculos'    => Veiculo::where('empresa_id', $eid)->count(),
            'cavalos'     => Veiculo::where('empresa_id', $eid)->where('tipo', 'cavalo')->count(),
            'carretas'    => Veiculo::where('empresa_id', $eid)->where('tipo', 'carreta')->count(),
            'motoristas'  => Motorista::where('empresa_id', $eid)->where('status', 'ativo')->count(),
            'bloqueados'  => Veiculo::where('empresa_id', $eid)->where('bloqueio_ativo', true)->count(),
            'os_abertas'  => OrdemServico::where('empresa_id', $eid)->where('status', 'aberta')->count(),
        ];

        // Documentos/itens vencendo nos próximos 30 dias
        $vencendo = Manutencao::where('empresa_id', $eid)
            ->whereNotNull('venc')
            ->whereBetween('venc', [now()->toDateString(), now()->addDays(30)->toDateString()])
            ->orderBy('venc')
            ->limit(15)
            ->get();

        return view('dashboard', compact('totais', 'vencendo'));
    }
}
