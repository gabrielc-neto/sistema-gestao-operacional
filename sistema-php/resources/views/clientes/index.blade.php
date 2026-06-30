@extends('layouts.app')
@section('titulo', 'Clientes')
@section('conteudo')
<h1>Clientes (Postos)</h1>
<div class="toolbar">
    <form method="GET"><input name="busca" placeholder="Razão social / CNPJ" value="{{ request('busca') }}"><button class="btn sec sm">Buscar</button></form>
    @perm('clientes.criar')<a class="btn" href="{{ route('clientes.create') }}" style="margin-left:auto;">+ Novo</a>@endperm
</div>
<table>
    <thead><tr><th>Razão social</th><th>CNPJ</th><th>Endereço</th><th>Contato</th><th></th></tr></thead>
    <tbody>
    @forelse($clientes as $c)
        <tr>
            <td><strong>{{ $c->razao_social }}</strong></td>
            <td>{{ $c->cnpj }}</td>
            <td>{{ $c->endereco }}</td>
            <td>{{ $c->contato }}</td>
            <td style="white-space:nowrap;">
                @perm('clientes.editar')<a class="btn sec sm" href="{{ route('clientes.edit',$c) }}">Editar</a>@endperm
                @perm('clientes.excluir')
                    <form method="POST" action="{{ route('clientes.destroy',$c) }}" style="display:inline" onsubmit="return confirm('Excluir?')">
                        @csrf @method('DELETE')<button class="btn danger sm">×</button>
                    </form>
                @endperm
            </td>
        </tr>
    @empty
        <tr><td colspan="5" style="text-align:center;color:#64748b;">Nenhum cliente.</td></tr>
    @endforelse
    </tbody>
</table>
<div style="margin-top:1rem;">{{ $clientes->links() }}</div>
@endsection
