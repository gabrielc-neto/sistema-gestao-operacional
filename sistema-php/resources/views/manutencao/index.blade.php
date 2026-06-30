@extends('layouts.app')
@section('titulo', 'Manutenção')
@section('conteudo')
<h1>Manutenção / Documentação</h1>
<div class="toolbar">
    <form method="GET">
        <input name="placa" placeholder="Placa" value="{{ request('placa') }}">
        <button class="btn sec sm">Filtrar</button>
    </form>
    @perm('manutencao.criar')<a class="btn" href="{{ route('manutencao.create') }}" style="margin-left:auto;">+ Novo item</a>@endperm
</div>
<table>
    <thead><tr><th>Placa</th><th>Tipo</th><th>Realização</th><th>Vencimento</th><th>Status</th><th></th></tr></thead>
    <tbody>
    @forelse($itens as $i)
        <tr>
            <td>{{ $i->placa }}</td>
            <td>{{ $i->tipo }}</td>
            <td>{{ optional($i->data_realiz)->format('d/m/Y') }}</td>
            <td>{{ optional($i->venc)->format('d/m/Y') ?? '—' }}</td>
            <td><span class="pill {{ $i->status }}">{{ strtoupper($i->status) }}</span></td>
            <td style="white-space:nowrap;">
                @perm('manutencao.editar')<a class="btn sec sm" href="{{ route('manutencao.edit',$i) }}">Editar</a>@endperm
                @perm('manutencao.excluir')
                    <form method="POST" action="{{ route('manutencao.destroy',$i) }}" style="display:inline" onsubmit="return confirm('Excluir?')">
                        @csrf @method('DELETE')<button class="btn danger sm">×</button>
                    </form>
                @endperm
            </td>
        </tr>
    @empty
        <tr><td colspan="6" style="text-align:center;color:#64748b;">Nenhum item.</td></tr>
    @endforelse
    </tbody>
</table>
<div style="margin-top:1rem;">{{ $itens->links() }}</div>
@endsection
