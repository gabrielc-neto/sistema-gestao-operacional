@extends('layouts.app')
@section('titulo', 'Ordens de Carregamento')
@section('conteudo')
<h1>Ordens de Carregamento</h1>
<div class="toolbar">
    @perm('oc.criar')<a class="btn" href="{{ route('oc.create') }}" style="margin-left:auto;">+ Nova OC</a>@endperm
</div>
<table>
    <thead><tr><th>Número</th><th>Data</th><th>Base</th><th>Cavalo</th><th>Motorista</th><th>Entregas</th><th></th></tr></thead>
    <tbody>
    @forelse($ordens as $oc)
        <tr>
            <td><strong>{{ $oc->num }}</strong></td>
            <td>{{ optional($oc->data)->format('d/m/Y') }} {{ $oc->hora }}</td>
            <td>{{ $oc->base }}</td>
            <td>{{ $oc->cavalo_placa ?? '—' }}</td>
            <td>{{ $oc->motorista_nome ?? '—' }}</td>
            <td>{{ $oc->entregas_count }}</td>
            <td style="white-space:nowrap;">
                <a class="btn sec sm" href="{{ route('oc.show',$oc) }}">Ver</a>
                @perm('oc.excluir')
                    <form method="POST" action="{{ route('oc.destroy',$oc) }}" style="display:inline" onsubmit="return confirm('Excluir {{ $oc->num }}?')">
                        @csrf @method('DELETE')<button class="btn danger sm">×</button>
                    </form>
                @endperm
            </td>
        </tr>
    @empty
        <tr><td colspan="7" style="text-align:center;color:#64748b;">Nenhuma OC.</td></tr>
    @endforelse
    </tbody>
</table>
<div style="margin-top:1rem;">{{ $ordens->links() }}</div>
@endsection
