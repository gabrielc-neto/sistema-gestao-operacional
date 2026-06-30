@extends('layouts.app')
@section('titulo', 'Motoristas')
@section('conteudo')
<h1>Motoristas</h1>
<div class="toolbar">
    <form method="GET"><input name="busca" placeholder="Nome" value="{{ request('busca') }}"><button class="btn sec sm">Buscar</button></form>
    @perm('motoristas.criar')<a class="btn" href="{{ route('motoristas.create') }}" style="margin-left:auto;">+ Novo</a>@endperm
</div>
<table>
    <thead><tr><th>Nome</th><th>CNH</th><th>Cat.</th><th>Telefone</th><th>CNH venc.</th><th>Status</th><th></th></tr></thead>
    <tbody>
    @forelse($motoristas as $m)
        <tr>
            <td><strong>{{ $m->nome }}</strong></td>
            <td>{{ $m->cnh }}</td>
            <td>{{ $m->cat }}</td>
            <td>{{ $m->tel }}</td>
            <td>{{ optional($m->cnh_venc)->format('d/m/Y') }}</td>
            <td>{{ ucfirst($m->status) }}</td>
            <td style="white-space:nowrap;">
                @perm('motoristas.editar')<a class="btn sec sm" href="{{ route('motoristas.edit',$m) }}">Editar</a>@endperm
                @perm('motoristas.excluir')
                    <form method="POST" action="{{ route('motoristas.destroy',$m) }}" style="display:inline" onsubmit="return confirm('Excluir?')">
                        @csrf @method('DELETE')<button class="btn danger sm">×</button>
                    </form>
                @endperm
            </td>
        </tr>
    @empty
        <tr><td colspan="7" style="text-align:center;color:#64748b;">Nenhum motorista.</td></tr>
    @endforelse
    </tbody>
</table>
<div style="margin-top:1rem;">{{ $motoristas->links() }}</div>
@endsection
