@extends('layouts.app')
@section('titulo', 'Produtos')
@section('conteudo')
<h1>Produtos</h1>
<div class="toolbar">
    @perm('produtos.criar')<a class="btn" href="{{ route('produtos.create') }}" style="margin-left:auto;">+ Novo</a>@endperm
</div>
<table>
    <thead><tr><th>Nome</th><th>Código ANP</th><th>Unidade</th><th></th></tr></thead>
    <tbody>
    @forelse($produtos as $p)
        <tr>
            <td><strong>{{ $p->nome }}</strong></td>
            <td>{{ $p->codigo_anp }}</td>
            <td>{{ $p->unidade }}</td>
            <td style="white-space:nowrap;">
                @perm('produtos.editar')<a class="btn sec sm" href="{{ route('produtos.edit',$p) }}">Editar</a>@endperm
                @perm('produtos.excluir')
                    <form method="POST" action="{{ route('produtos.destroy',$p) }}" style="display:inline" onsubmit="return confirm('Excluir?')">
                        @csrf @method('DELETE')<button class="btn danger sm">×</button>
                    </form>
                @endperm
            </td>
        </tr>
    @empty
        <tr><td colspan="4" style="text-align:center;color:#64748b;">Nenhum produto.</td></tr>
    @endforelse
    </tbody>
</table>
<div style="margin-top:1rem;">{{ $produtos->links() }}</div>
@endsection
