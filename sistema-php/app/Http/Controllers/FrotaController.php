<?php

namespace App\Http\Controllers;

use App\Models\Motorista;
use App\Models\Veiculo;
use App\Services\Auditoria;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

class FrotaController extends Controller
{
    private const STATUS = ['ativo', 'disponivel', 'em_viagem', 'manutencao', 'inativo'];
    private const MOTIVOS_BLOQUEIO = ['CIV', 'CIPP', 'Manutenção', 'Documentos vencidos', 'Revisão', 'Outro'];

    public function index(Request $request): View
    {
        $q = Veiculo::where('empresa_id', $this->empresaId());

        if ($busca = $request->get('busca')) {
            $q->where(fn ($w) => $w->where('placa', 'like', "%{$busca}%")
                ->orWhere('modelo', 'like', "%{$busca}%"));
        }
        if ($tipo = $request->get('tipo')) {
            $q->where('tipo', $tipo);
        }

        $veiculos = $q->orderBy('tipo')->orderBy('placa')->paginate(25)->withQueryString();

        return view('frota.index', compact('veiculos'));
    }

    public function create(): View
    {
        return view('frota.form', [
            'veiculo'   => new Veiculo(),
            'motoristas'=> $this->motoristas(),
            'statusOpts'=> self::STATUS,
            'motivos'   => self::MOTIVOS_BLOQUEIO,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $dados = $this->validar($request);
        $dados['empresa_id'] = $this->empresaId();

        $veiculo = Veiculo::create($dados);
        Auditoria::log('frota', 'criar', 'veiculos', $veiculo->id, "Criou veículo {$veiculo->placa}", null, $veiculo->toArray());

        return redirect()->route('frota.index')->with('ok', "Veículo {$veiculo->placa} cadastrado.");
    }

    public function edit(Veiculo $veiculo): View
    {
        $this->autoriza($veiculo);
        return view('frota.form', [
            'veiculo'   => $veiculo,
            'motoristas'=> $this->motoristas(),
            'statusOpts'=> self::STATUS,
            'motivos'   => self::MOTIVOS_BLOQUEIO,
        ]);
    }

    public function update(Request $request, Veiculo $veiculo): RedirectResponse
    {
        $this->autoriza($veiculo);
        $antes = $veiculo->toArray();
        $veiculo->update($this->validar($request, $veiculo->id));
        Auditoria::log('frota', 'editar', 'veiculos', $veiculo->id, "Editou veículo {$veiculo->placa}", $antes, $veiculo->fresh()->toArray());

        return redirect()->route('frota.index')->with('ok', "Veículo {$veiculo->placa} atualizado.");
    }

    public function destroy(Veiculo $veiculo): RedirectResponse
    {
        $this->autoriza($veiculo);
        $placa = $veiculo->placa;
        Auditoria::log('frota', 'excluir', 'veiculos', $veiculo->id, "Excluiu veículo {$placa}", $veiculo->toArray());
        $veiculo->delete();

        return redirect()->route('frota.index')->with('ok', "Veículo {$placa} excluído.");
    }

    /** Bloqueio manual de veículo. OS de manutenção bloqueia automaticamente. */
    public function bloquear(Request $request, Veiculo $veiculo): RedirectResponse
    {
        $this->autoriza($veiculo);
        $dados = $request->validate([
            'bloqueio_motivo' => ['required', 'string'],
            'bloqueio_obs'    => ['nullable', 'string'],
        ]);
        $veiculo->update([
            'bloqueio_ativo'  => true,
            'bloqueio_motivo' => $dados['bloqueio_motivo'],
            'bloqueio_origem' => 'manual',
            'bloqueio_obs'    => $dados['bloqueio_obs'] ?? null,
            'status'          => 'manutencao',
        ]);
        Auditoria::log('frota', 'bloquear', 'veiculos', $veiculo->id, "Bloqueou {$veiculo->placa}: {$dados['bloqueio_motivo']}");

        return back()->with('ok', "Veículo {$veiculo->placa} bloqueado.");
    }

    public function desbloquear(Veiculo $veiculo): RedirectResponse
    {
        $this->autoriza($veiculo);
        // Não desbloquear manualmente se a origem é OS (deve finalizar a OS).
        if ($veiculo->bloqueio_origem === 'os') {
            return back()->withErrors(['bloqueio' => 'Bloqueio por OS — finalize a Ordem de Serviço para liberar.']);
        }
        $veiculo->update([
            'bloqueio_ativo'  => false,
            'bloqueio_motivo' => null,
            'bloqueio_origem' => null,
            'bloqueio_obs'    => null,
            'status'          => 'ativo',
        ]);
        Auditoria::log('frota', 'desbloquear', 'veiculos', $veiculo->id, "Desbloqueou {$veiculo->placa}");

        return back()->with('ok', "Veículo {$veiculo->placa} desbloqueado.");
    }

    // ----------------------------------------------------------------
    private function validar(Request $request, ?int $id = null): array
    {
        return $request->validate([
            'placa'      => ['required', 'string', 'max:8'],
            'tipo'       => ['required', 'in:cavalo,carreta'],
            'status'     => ['required', 'in:' . implode(',', self::STATUS)],
            'modelo'     => ['nullable', 'string', 'max:80'],
            'fabricante' => ['nullable', 'string', 'max:80'],
            'ano_modelo' => ['nullable', 'string', 'max:9'],
            'ano_fab'    => ['nullable', 'string', 'max:9'],
            'chassi'     => ['nullable', 'string', 'max:40'],
            'renavam'    => ['nullable', 'string', 'max:20'],
            'tara'       => ['nullable', 'string', 'max:12'],
            'cap'        => ['nullable', 'string', 'max:12'],
            'comp'       => ['nullable', 'string', 'max:20'],
            'motorista_id' => ['nullable', 'exists:motoristas,id'],
            'obs'        => ['nullable', 'string'],
        ]);
    }

    private function motoristas()
    {
        return Motorista::where('empresa_id', $this->empresaId())
            ->where('status', 'ativo')->orderBy('nome')->get();
    }

    private function autoriza(Veiculo $veiculo): void
    {
        abort_if($veiculo->empresa_id !== $this->empresaId(), 403);
    }
}
