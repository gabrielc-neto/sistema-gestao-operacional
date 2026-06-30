<?php

namespace App\Http\Controllers;

use App\Models\Produto;
use App\Services\Auditoria;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

class ProdutoController extends Controller
{
    public function index(): View
    {
        $produtos = Produto::where('empresa_id', $this->empresaId())->orderBy('nome')->paginate(50);
        return view('produtos.index', compact('produtos'));
    }

    public function create(): View
    {
        return view('produtos.form', ['produto' => new Produto()]);
    }

    public function store(Request $request): RedirectResponse
    {
        $dados = $this->validar($request);
        $dados['empresa_id'] = $this->empresaId();
        $p = Produto::create($dados);
        Auditoria::log('produtos', 'criar', 'produtos', $p->id, "Criou produto {$p->nome}");
        return redirect()->route('produtos.index')->with('ok', 'Produto cadastrado.');
    }

    public function edit(Produto $produto): View
    {
        abort_if($produto->empresa_id !== $this->empresaId(), 403);
        return view('produtos.form', compact('produto'));
    }

    public function update(Request $request, Produto $produto): RedirectResponse
    {
        abort_if($produto->empresa_id !== $this->empresaId(), 403);
        $produto->update($this->validar($request));
        Auditoria::log('produtos', 'editar', 'produtos', $produto->id, "Editou {$produto->nome}");
        return redirect()->route('produtos.index')->with('ok', 'Produto atualizado.');
    }

    public function destroy(Produto $produto): RedirectResponse
    {
        abort_if($produto->empresa_id !== $this->empresaId(), 403);
        Auditoria::log('produtos', 'excluir', 'produtos', $produto->id, "Excluiu {$produto->nome}");
        $produto->delete();
        return redirect()->route('produtos.index')->with('ok', 'Produto excluído.');
    }

    private function validar(Request $request): array
    {
        return $request->validate([
            'nome'       => ['required', 'string', 'max:80'],
            'codigo_anp' => ['nullable', 'string', 'max:20'],
            'unidade'    => ['required', 'string', 'max:12'],
        ]);
    }
}
