<?php

namespace App\Http\Controllers;

use App\Models\Manutencao;
use App\Models\Veiculo;
use App\Services\Auditoria;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

class ManutencaoController extends Controller
{
    /** 27 tipos catalogados (doc / motorista / mecânica). */
    public const TIPOS = [
        'Documentação' => ['civ', 'cipp', 'crlv', 'tacografo', 'extintor', 'rntrc', 'seguro', 'licenca_parana', 'licenca_federal', 'aet'],
        'Motorista'    => ['cnh_venc', 'aso', 'toxicologico', 'mopp', 'nr20', 'nr35'],
        'Mecânica'     => ['oleo', 'bateria', 'engraxe', 'pneus', 'freios', 'suspensao', 'alinhamento', 'arrefecimento', 'embreagem', 'diferencial', 'preventiva'],
    ];

    public function index(Request $request): View
    {
        $q = Manutencao::where('empresa_id', $this->empresaId());
        if ($placa = $request->get('placa')) {
            $q->where('placa', 'like', '%' . strtoupper($placa) . '%');
        }
        if ($tipo = $request->get('tipo')) {
            $q->where('tipo', $tipo);
        }
        $itens = $q->orderBy('venc')->paginate(30)->withQueryString();
        return view('manutencao.index', compact('itens'));
    }

    public function create(): View
    {
        return view('manutencao.form', [
            'item'     => new Manutencao(),
            'tipos'    => self::TIPOS,
            'veiculos' => $this->veiculos(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $dados = $this->validar($request);
        $dados['empresa_id'] = $this->empresaId();
        $dados['placa'] = strtoupper(preg_replace('/[\s-]/', '', $dados['placa'] ?? ''));
        $item = Manutencao::create($dados);
        Auditoria::log('manutencao', 'criar', 'manutencoes', $item->id, "Criou item {$item->tipo} ({$item->placa})");
        return redirect()->route('manutencao.index')->with('ok', 'Item de manutenção cadastrado.');
    }

    public function edit(Manutencao $manutencao): View
    {
        abort_if($manutencao->empresa_id !== $this->empresaId(), 403);
        return view('manutencao.form', [
            'item'     => $manutencao,
            'tipos'    => self::TIPOS,
            'veiculos' => $this->veiculos(),
        ]);
    }

    public function update(Request $request, Manutencao $manutencao): RedirectResponse
    {
        abort_if($manutencao->empresa_id !== $this->empresaId(), 403);
        $antes = $manutencao->toArray();
        $dados = $this->validar($request);
        $dados['placa'] = strtoupper(preg_replace('/[\s-]/', '', $dados['placa'] ?? ''));
        $manutencao->update($dados);
        Auditoria::log('manutencao', 'editar', 'manutencoes', $manutencao->id, "Editou item {$manutencao->tipo}", $antes, $manutencao->fresh()->toArray());
        return redirect()->route('manutencao.index')->with('ok', 'Item atualizado.');
    }

    public function destroy(Manutencao $manutencao): RedirectResponse
    {
        abort_if($manutencao->empresa_id !== $this->empresaId(), 403);
        Auditoria::log('manutencao', 'excluir', 'manutencoes', $manutencao->id, "Excluiu item {$manutencao->tipo}");
        $manutencao->delete();
        return redirect()->route('manutencao.index')->with('ok', 'Item excluído.');
    }

    private function validar(Request $request): array
    {
        return $request->validate([
            'veiculo_id'  => ['nullable', 'exists:veiculos,id'],
            'placa'       => ['nullable', 'string', 'max:8'],
            'tipo'        => ['required', 'string', 'max:30'],
            'data_realiz' => ['nullable', 'date'],
            'venc'        => ['nullable', 'date'],
            'local'       => ['nullable', 'string', 'max:160'],
            'numero_doc'  => ['nullable', 'string', 'max:60'],
            'km_atual'    => ['nullable', 'string', 'max:12'],
            'resp'        => ['nullable', 'string', 'max:120'],
            'obs'         => ['nullable', 'string'],
        ]);
    }

    private function veiculos()
    {
        return Veiculo::where('empresa_id', $this->empresaId())->orderBy('placa')->get();
    }
}
