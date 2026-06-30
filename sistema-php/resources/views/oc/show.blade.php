@extends('layouts.app')
@section('titulo', $oc->num)
@section('conteudo')
<h1>Ordem {{ $oc->num }}</h1>
<div class="card" style="max-width:800px;">
    <div class="form-grid">
        <div><div class="kpi-label">Data</div>{{ optional($oc->data)->format('d/m/Y') }} {{ $oc->hora }}</div>
        <div><div class="kpi-label">Base</div>{{ $oc->base }}</div>
        <div><div class="kpi-label">Cavalo</div>{{ $oc->cavalo_placa ?? '—' }}</div>
        <div><div class="kpi-label">Motorista</div>{{ $oc->motorista_nome ?? '—' }}</div>
        <div><div class="kpi-label">Responsável</div>{{ $oc->resp }}</div>
    </div>
    @if($oc->obs)<p style="margin-top:1rem;"><strong>Obs:</strong> {{ $oc->obs }}</p>@endif

    <h3 style="margin-top:1.2rem;font-size:1rem;">Entregas</h3>
    <table>
        <thead><tr><th>#</th><th>Destino</th><th>Produto</th><th>Volume (L)</th><th>Requisição</th></tr></thead>
        <tbody>
        @foreach($oc->entregas as $e)
            <tr><td>{{ $e->seq }}</td><td>{{ $e->dest }}</td><td>{{ $e->prod }}</td>
                <td>{{ number_format((int)$e->vol,0,',','.') }}</td><td>{{ $e->req }}</td></tr>
        @endforeach
        </tbody>
    </table>
    <div style="margin-top:1rem;"><a class="btn sec" href="{{ route('oc.index') }}">Voltar</a></div>
</div>
@endsection
