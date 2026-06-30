<?php

namespace App\Http\Controllers;

use App\Models\Motorista;
use App\Models\OrdemCarregamento;
use App\Models\Veiculo;
use App\Services\Auditoria;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\View\View;

class OcController extends Controller
{
    private const BASES = ['PONTUAL', 'REPLAN', 'OUTROS'];
    private const PRODUTOS = ['Etanol Anidro', 'Diesel S10', 'Diesel S500', 'Gasolina Comum', 'Gasolina Aditivada', 'Etanol Hidratado'];

    public function index(): View
    {
        $ordens = OrdemCarregamento::where('empresa_id', $this->empresaId())
            ->withCount('entregas')->orderByDesc('id')->paginate(25);
        return view('oc.index', compact('ordens'));
    }

    public function create(): View
    {
        return view('oc.form', [
            'oc'         => new OrdemCarregamento(),
            'cavalos'    => $this->cavalosDisponiveis(),
            'motoristas' => $this->motoristas(),
            'bases'      => self::BASES,
            'produtos'   => self::PRODUTOS,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $dados = $this->validar($request);
        $eid   = $this->empresaId();

        // Regra: veículo bloqueado (manutenção/OS) não gera OC.
        $cavalo = !empty($dados['cavalo_id']) ? Veiculo::find($dados['cavalo_id']) : null;
        if ($cavalo && $cavalo->bloqueio_ativo) {
            return back()->withInput()->withErrors([
                'cavalo_id' => "Veículo {$cavalo->placa} bloqueado ({$cavalo->bloqueio_motivo}). Não pode gerar OC.",
            ]);
        }

        $oc = DB::transaction(function () use ($dados, $eid, $cavalo, $request) {
            $motorista = !empty($dados['motorista_id']) ? Motorista::find($dados['motorista_id']) : null;
            $oc = OrdemCarregamento::create([
                'empresa_id'     => $eid,
                'num'            => $this->proximoNumero($eid),
                'data'           => $dados['data'] ?? now()->toDateString(),
                'hora'           => $dados['hora'] ?? now()->format('H:i'),
                'base'           => $dados['base'],
                'cavalo_id'      => $cavalo?->id,
                'cavalo_placa'   => $cavalo?->placa,
                'motorista_id'   => $motorista?->id,
                'motorista_nome' => $motorista?->nome,
                'resp'           => $dados['resp'] ?? auth()->user()->nome,
                'obs'            => $dados['obs'] ?? null,
                'created_by'     => auth()->id(),
            ]);

            foreach ($this->parseEntregas($request) as $i => $e) {
                $oc->entregas()->create($e + ['seq' => $i + 1]);
            }
            return $oc;
        });

        Auditoria::log('oc', 'criar', 'ordens_carregamento', $oc->id, "Criou {$oc->num}");
        return redirect()->route('oc.index')->with('ok', "Ordem {$oc->num} criada.");
    }

    public function show(OrdemCarregamento $oc): View
    {
        abort_if($oc->empresa_id !== $this->empresaId(), 403);
        $oc->load('entregas');
        return view('oc.show', compact('oc'));
    }

    public function destroy(OrdemCarregamento $oc): RedirectResponse
    {
        abort_if($oc->empresa_id !== $this->empresaId(), 403);
        $num = $oc->num;
        Auditoria::log('oc', 'excluir', 'ordens_carregamento', $oc->id, "Excluiu {$num}");
        $oc->delete();
        return redirect()->route('oc.index')->with('ok', "Ordem {$num} excluída.");
    }

    // ----------------------------------------------------------------
    private function validar(Request $request): array
    {
        return $request->validate([
            'data'         => ['nullable', 'date'],
            'hora'         => ['nullable', 'string', 'max:5'],
            'base'         => ['required', 'in:' . implode(',', self::BASES)],
            'cavalo_id'    => ['nullable', 'exists:veiculos,id'],
            'motorista_id' => ['nullable', 'exists:motoristas,id'],
            'resp'         => ['nullable', 'string', 'max:120'],
            'obs'          => ['nullable', 'string'],
        ]);
    }

    private function parseEntregas(Request $request): array
    {
        $out = [];
        foreach ((array) $request->input('entregas', []) as $e) {
            if (empty($e['dest']) && empty($e['prod'])) {
                continue;
            }
            $out[] = [
                'dest' => $e['dest'] ?? null,
                'prod' => $e['prod'] ?? null,
                'vol'  => isset($e['vol']) ? (int) $e['vol'] : null,
                'req'  => $e['req'] ?? null,
            ];
        }
        return $out;
    }

    private function proximoNumero(int $eid): string
    {
        $ultimo = OrdemCarregamento::where('empresa_id', $eid)->orderByDesc('id')->value('num');
        $n = $ultimo ? ((int) preg_replace('/\D/', '', $ultimo)) + 1 : 1;
        return 'OC-' . str_pad((string) $n, 4, '0', STR_PAD_LEFT);
    }

    private function cavalosDisponiveis()
    {
        return Veiculo::where('empresa_id', $this->empresaId())
            ->where('tipo', 'cavalo')->orderBy('placa')->get();
    }

    private function motoristas()
    {
        return Motorista::where('empresa_id', $this->empresaId())
            ->where('status', 'ativo')->orderBy('nome')->get();
    }
}
