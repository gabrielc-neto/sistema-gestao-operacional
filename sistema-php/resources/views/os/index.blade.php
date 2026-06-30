@extends('layouts.app')
@section('titulo', 'Ordens de Serviço')
@section('conteudo')
<h1>Ordens de Serviço</h1>
<div class="toolbar">
    @perm('os.criar')<a class="btn" href="{{ route('os.create') }}" style="margin-left:auto;">+ Abrir OS</a>@endperm
</div>
<table>
    <thead><tr><th>Número</th><th>Data/Hora</th><th>Serviço</th><th>Placa</th><th>Motorista</th><th>Status</th><th></th></tr></thead>
    <tbody>
    @forelse($ordens as $os)
        <tr>
            <td><strong>{{ $os->numero }}</strong></td>
            <td>{{ optional($os->data_hora)->format('d/m/Y H:i') }}</td>
            <td>{{ $os->tipo_servico }}</td>
            <td>{{ $os->placa }}</td>
            <td>{{ $os->motorista_nome ?? '—' }}</td>
            <td>
                @if($os->status==='aberta') <span class="pill alerta">ABERTA</span>
                @elseif($os->status==='finalizada') <span class="pill ok">FINALIZADA</span>
                @else <span class="pill">{{ strtoupper($os->status) }}</span> @endif
            </td>
            <td style="white-space:nowrap;">
                @if($os->status==='aberta')
                    @perm('os.editar')
                        @if($os->podeEditar())<a class="btn sec sm" href="{{ route('os.edit',$os) }}">Editar</a>@endif
                    @endperm
                    @perm('os.finalizar')
                        <form method="POST" action="{{ route('os.finalizar',$os) }}" style="display:inline" onsubmit="return confirm('Finalizar {{ $os->numero }} e liberar o veículo?')">
                            @csrf<button class="btn sm" type="submit">Finalizar</button>
                        </form>
                    @endperm
                @endif
            </td>
        </tr>
    @empty
        <tr><td colspan="7" style="text-align:center;color:#64748b;">Nenhuma OS.</td></tr>
    @endforelse
    </tbody>
</table>
<div style="margin-top:1rem;">{{ $ordens->links() }}</div>
@endsection
