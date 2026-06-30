<?php

namespace App\Http\Controllers;

use App\Models\Usina;
use App\Services\Auditoria;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

class UsinaController extends Controller
{
    public function index(): View
    {
        $usinas = Usina::where('empresa_id', $this->empresaId())->orderBy('nome')->paginate(50);
        return view('usinas.index', compact('usinas'));
    }

    public function create(): View
    {
        return view('usinas.form', ['usina' => new Usina()]);
    }

    public function store(Request $request): RedirectResponse
    {
        $dados = $this->validar($request);
        $dados['empresa_id'] = $this->empresaId();
        $dados['produtos_disponiveis'] = $this->parseProdutos($request);
        $u = Usina::create($dados);
        Auditoria::log('usinas', 'criar', 'usinas', $u->id, "Criou usina {$u->nome}");
        return redirect()->route('usinas.index')->with('ok', 'Usina cadastrada.');
    }

    public function edit(Usina $usina): View
    {
        abort_if($usina->empresa_id !== $this->empresaId(), 403);
        return view('usinas.form', compact('usina'));
    }

    public function update(Request $request, Usina $usina): RedirectResponse
    {
        abort_if($usina->empresa_id !== $this->empresaId(), 403);
        $dados = $this->validar($request);
        $dados['produtos_disponiveis'] = $this->parseProdutos($request);
        $usina->update($dados);
        Auditoria::log('usinas', 'editar', 'usinas', $usina->id, "Editou {$usina->nome}");
        return redirect()->route('usinas.index')->with('ok', 'Usina atualizada.');
    }

    public function destroy(Usina $usina): RedirectResponse
    {
        abort_if($usina->empresa_id !== $this->empresaId(), 403);
        Auditoria::log('usinas', 'excluir', 'usinas', $usina->id, "Excluiu {$usina->nome}");
        $usina->delete();
        return redirect()->route('usinas.index')->with('ok', 'Usina excluída.');
    }

    private function validar(Request $request): array
    {
        return $request->validate([
            'nome'     => ['required', 'string', 'max:160'],
            'endereco' => ['nullable', 'string', 'max:255'],
            'lat'      => ['nullable', 'numeric'],
            'lng'      => ['nullable', 'numeric'],
        ]);
    }

    private function parseProdutos(Request $request): array
    {
        $raw = (string) $request->input('produtos_disponiveis', '');
        return array_values(array_filter(array_map('trim', explode(',', $raw))));
    }
}
