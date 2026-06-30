<?php

namespace App\Http\Controllers;

use App\Models\Cliente;
use App\Services\Auditoria;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

class ClienteController extends Controller
{
    public function index(Request $request): View
    {
        $q = Cliente::where('empresa_id', $this->empresaId());
        if ($busca = $request->get('busca')) {
            $q->where('razao_social', 'like', "%{$busca}%")->orWhere('cnpj', 'like', "%{$busca}%");
        }
        $clientes = $q->orderBy('razao_social')->paginate(25)->withQueryString();
        return view('clientes.index', compact('clientes'));
    }

    public function create(): View
    {
        return view('clientes.form', ['cliente' => new Cliente()]);
    }

    public function store(Request $request): RedirectResponse
    {
        $dados = $this->validar($request);
        $dados['empresa_id'] = $this->empresaId();
        $c = Cliente::create($dados);
        Auditoria::log('clientes', 'criar', 'clientes', $c->id, "Criou cliente {$c->razao_social}");
        return redirect()->route('clientes.index')->with('ok', 'Cliente cadastrado.');
    }

    public function edit(Cliente $cliente): View
    {
        abort_if($cliente->empresa_id !== $this->empresaId(), 403);
        return view('clientes.form', compact('cliente'));
    }

    public function update(Request $request, Cliente $cliente): RedirectResponse
    {
        abort_if($cliente->empresa_id !== $this->empresaId(), 403);
        $antes = $cliente->toArray();
        $cliente->update($this->validar($request));
        Auditoria::log('clientes', 'editar', 'clientes', $cliente->id, "Editou {$cliente->razao_social}", $antes, $cliente->fresh()->toArray());
        return redirect()->route('clientes.index')->with('ok', 'Cliente atualizado.');
    }

    public function destroy(Cliente $cliente): RedirectResponse
    {
        abort_if($cliente->empresa_id !== $this->empresaId(), 403);
        Auditoria::log('clientes', 'excluir', 'clientes', $cliente->id, "Excluiu {$cliente->razao_social}");
        $cliente->delete();
        return redirect()->route('clientes.index')->with('ok', 'Cliente excluído.');
    }

    private function validar(Request $request): array
    {
        return $request->validate([
            'razao_social' => ['required', 'string', 'max:190'],
            'cnpj'         => ['nullable', 'string', 'max:18'],
            'endereco'     => ['nullable', 'string', 'max:255'],
            'lat'          => ['nullable', 'numeric'],
            'lng'          => ['nullable', 'numeric'],
            'contato'      => ['nullable', 'string', 'max:120'],
        ]);
    }
}
