<?php

namespace App\Http\Controllers;

use App\Models\Motorista;
use App\Services\Auditoria;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

class MotoristaController extends Controller
{
    public function index(Request $request): View
    {
        $q = Motorista::where('empresa_id', $this->empresaId());
        if ($busca = $request->get('busca')) {
            $q->where('nome', 'like', "%{$busca}%");
        }
        $motoristas = $q->orderBy('nome')->paginate(25)->withQueryString();
        return view('motoristas.index', compact('motoristas'));
    }

    public function create(): View
    {
        return view('motoristas.form', ['motorista' => new Motorista()]);
    }

    public function store(Request $request): RedirectResponse
    {
        $dados = $this->validar($request);
        $dados['empresa_id'] = $this->empresaId();
        $m = Motorista::create($dados);
        Auditoria::log('motoristas', 'criar', 'motoristas', $m->id, "Criou motorista {$m->nome}", null, $m->toArray());
        return redirect()->route('motoristas.index')->with('ok', "Motorista {$m->nome} cadastrado.");
    }

    public function edit(Motorista $motorista): View
    {
        abort_if($motorista->empresa_id !== $this->empresaId(), 403);
        return view('motoristas.form', compact('motorista'));
    }

    public function update(Request $request, Motorista $motorista): RedirectResponse
    {
        abort_if($motorista->empresa_id !== $this->empresaId(), 403);
        $antes = $motorista->toArray();
        $motorista->update($this->validar($request));
        Auditoria::log('motoristas', 'editar', 'motoristas', $motorista->id, "Editou {$motorista->nome}", $antes, $motorista->fresh()->toArray());
        return redirect()->route('motoristas.index')->with('ok', "Motorista atualizado.");
    }

    public function destroy(Motorista $motorista): RedirectResponse
    {
        abort_if($motorista->empresa_id !== $this->empresaId(), 403);
        Auditoria::log('motoristas', 'excluir', 'motoristas', $motorista->id, "Excluiu {$motorista->nome}", $motorista->toArray());
        $motorista->delete();
        return redirect()->route('motoristas.index')->with('ok', 'Motorista excluído.');
    }

    private function validar(Request $request): array
    {
        return $request->validate([
            'nome'      => ['required', 'string', 'max:160'],
            'cnh'       => ['nullable', 'string', 'max:20'],
            'cat'       => ['nullable', 'string', 'max:5'],
            'tel'       => ['nullable', 'string', 'max:20'],
            'status'    => ['required', 'in:ativo,inativo,desligado'],
            'cnh_venc'  => ['nullable', 'date'],
            'mopp_venc' => ['nullable', 'date'],
            'nr20_venc' => ['nullable', 'date'],
            'nr35_venc' => ['nullable', 'date'],
            'obs'       => ['nullable', 'string'],
        ]);
    }
}
