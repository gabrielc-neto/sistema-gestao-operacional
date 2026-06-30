<?php

namespace App\Http\Controllers;

use App\Models\Motorista;
use App\Models\OrdemServico;
use App\Models\Veiculo;
use App\Services\Auditoria;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\View\View;

/**
 * Ordens de Serviço de manutenção mecânica.
 * Regras (CLAUDE.md §6):
 *  - Abrir OS bloqueia o veículo (bloqueio.origem='os'). Veículo bloqueado não gera OC.
 *  - OS editável só por 24h após abertura.
 *  - Finalizar libera o veículo, desde que não haja OUTRA OS aberta no mesmo veículo.
 */
class OrdemServicoController extends Controller
{
    public function index(): View
    {
        $ordens = OrdemServico::where('empresa_id', $this->empresaId())
            ->orderByDesc('data_hora')->paginate(25);
        return view('os.index', compact('ordens'));
    }

    public function create(): View
    {
        return view('os.form', [
            'os'         => new OrdemServico(),
            'motoristas' => $this->motoristas(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $dados = $request->validate([
            'tipo_servico' => ['required', 'string', 'max:120'],
            'placa'        => ['required', 'string', 'max:8'],
            'motorista_id' => ['nullable', 'exists:motoristas,id'],
            'obs'          => ['nullable', 'string'],
        ]);

        $eid   = $this->empresaId();
        $placa = strtoupper(preg_replace('/[\s-]/', '', $dados['placa']));

        $veiculo = Veiculo::where('empresa_id', $eid)->where('placa', $placa)->first();

        // Regra: veículo já bloqueado não gera nova OS.
        if ($veiculo && $veiculo->bloqueio_ativo) {
            return back()->withInput()->withErrors([
                'placa' => "Veículo {$placa} está bloqueado ({$veiculo->bloqueio_motivo}). Não é possível abrir nova OS.",
            ]);
        }

        $os = DB::transaction(function () use ($dados, $eid, $placa, $veiculo) {
            $motorista = !empty($dados['motorista_id']) ? Motorista::find($dados['motorista_id']) : null;

            $os = OrdemServico::create([
                'empresa_id'     => $eid,
                'numero'         => $this->proximoNumero($eid),
                'data_hora'      => now(),
                'tipo_servico'   => $dados['tipo_servico'],
                'veiculo_id'     => $veiculo?->id,
                'placa'          => $placa,
                'motorista_id'   => $motorista?->id,
                'motorista_nome' => $motorista?->nome,
                'status'         => 'aberta',
                'obs'            => $dados['obs'] ?? null,
                'criado_por'     => auth()->user()->email,
            ]);

            // Bloqueia o veículo (mesmo campo que a tela de OC valida).
            if ($veiculo) {
                $veiculo->update([
                    'bloqueio_ativo'  => true,
                    'bloqueio_motivo' => 'Manutenção',
                    'bloqueio_origem' => 'os',
                    'bloqueio_obs'    => "OS {$os->numero} — {$dados['tipo_servico']}",
                    'status'          => 'manutencao',
                ]);
            }
            return $os;
        });

        Auditoria::log('os', 'criar', 'ordens_servico', $os->id, "Abriu {$os->numero} ({$placa}) — bloqueou veículo");

        return redirect()->route('os.index')->with('ok', "OS {$os->numero} aberta. Veículo {$placa} bloqueado.");
    }

    public function edit(OrdemServico $os): View
    {
        $this->autoriza($os);
        return view('os.form', ['os' => $os, 'motoristas' => $this->motoristas()]);
    }

    public function update(Request $request, OrdemServico $os): RedirectResponse
    {
        $this->autoriza($os);

        if (!$os->podeEditar()) {
            return back()->withErrors(['os' => 'OS não pode mais ser editada (passou de 24h ou já finalizada).']);
        }

        $dados = $request->validate([
            'tipo_servico' => ['required', 'string', 'max:120'],
            'motorista_id' => ['nullable', 'exists:motoristas,id'],
            'obs'          => ['nullable', 'string'],
        ]);
        $antes = $os->toArray();
        $motorista = !empty($dados['motorista_id']) ? Motorista::find($dados['motorista_id']) : null;
        $os->update([
            'tipo_servico'   => $dados['tipo_servico'],
            'motorista_id'   => $motorista?->id,
            'motorista_nome' => $motorista?->nome,
            'obs'            => $dados['obs'] ?? null,
        ]);
        Auditoria::log('os', 'editar', 'ordens_servico', $os->id, "Editou {$os->numero}", $antes, $os->fresh()->toArray());

        return redirect()->route('os.index')->with('ok', "OS {$os->numero} atualizada.");
    }

    /** Finaliza a OS e libera o veículo (se não houver outra OS aberta). */
    public function finalizar(OrdemServico $os): RedirectResponse
    {
        $this->autoriza($os);
        if ($os->status !== 'aberta') {
            return back()->withErrors(['os' => 'OS já finalizada/cancelada.']);
        }

        DB::transaction(function () use ($os) {
            $os->update(['status' => 'finalizada', 'finalizada_em' => now()]);

            $veiculo = $os->veiculo;
            if ($veiculo) {
                // Só libera se não houver OUTRA OS aberta no mesmo veículo.
                $outraAberta = OrdemServico::where('empresa_id', $os->empresa_id)
                    ->where('veiculo_id', $veiculo->id)
                    ->where('status', 'aberta')
                    ->where('id', '!=', $os->id)
                    ->exists();

                if (!$outraAberta && $veiculo->bloqueio_origem === 'os') {
                    $veiculo->update([
                        'bloqueio_ativo'  => false,
                        'bloqueio_motivo' => null,
                        'bloqueio_origem' => null,
                        'bloqueio_obs'    => null,
                        'status'          => 'ativo',
                    ]);
                }
            }
        });

        Auditoria::log('os', 'finalizar', 'ordens_servico', $os->id, "Finalizou {$os->numero} — liberou veículo");

        return redirect()->route('os.index')->with('ok', "OS {$os->numero} finalizada.");
    }

    // ----------------------------------------------------------------
    private function proximoNumero(int $eid): string
    {
        $ultimo = OrdemServico::where('empresa_id', $eid)
            ->orderByDesc('id')->value('numero');
        $n = $ultimo ? ((int) preg_replace('/\D/', '', $ultimo)) + 1 : 1;
        return 'OS-' . str_pad((string) $n, 5, '0', STR_PAD_LEFT);
    }

    private function motoristas()
    {
        return Motorista::where('empresa_id', $this->empresaId())
            ->where('status', 'ativo')->orderBy('nome')->get();
    }

    private function autoriza(OrdemServico $os): void
    {
        abort_if($os->empresa_id !== $this->empresaId(), 403);
    }
}
