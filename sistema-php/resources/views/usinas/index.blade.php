@extends('layouts.app')
@section('titulo', 'Usinas')
@section('conteudo')
<h1>Usinas</h1>
<div class="toolbar">
    @perm('usinas.criar')<a class="btn" href="{{ route('usinas.create') }}" style="margin-left:auto;">+ Nova</a>@endperm
</div>
<table>
    <thead><tr><th>Nome</th><th>Endereço</th><th>Produtos</th><th></th></tr></thead>
    <tbody>
    @forelse($usinas as $u)
        <tr>
            <td><strong>{{ $u->nome }}</strong></td>
            <td>{{ $u->endereco }}</td>
            <td>{{ implode(', ', (array)($u->produtos_disponiveis ?? [])) }}</td>
            <td style="white-space:nowrap;">
                @perm('usinas.editar')<a class="btn sec sm" href="{{ route('usinas.edit',$u) }}">Editar</a>@endperm
                @perm('usinas.excluir')
                    <form method="POST" action="{{ route('usinas.destroy',$u) }}" style="display:inline" onsubmit="return confirm('Excluir?')">
                        @csrf @method('DELETE')<button class="btn danger sm">×</button>
                    </form>
                @endperm
            </td>
        </tr>
    @empty
        <tr><td colspan="4" style="text-align:center;color:#64748b;">Nenhuma usina.</td></tr>
    @endforelse
    </tbody>
</table>
<div style="margin-top:1rem;">{{ $usinas->links() }}</div>
@endsection
