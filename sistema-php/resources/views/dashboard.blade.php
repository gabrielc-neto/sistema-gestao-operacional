@extends('layouts.app')
@section('titulo', 'Dashboard')
@section('conteudo')
<h1>Dashboard</h1>

<div class="grid" style="margin-bottom:1.5rem;">
    <div class="card"><div class="kpi">{{ $totais['veiculos'] }}</div><div class="kpi-label">Veículos</div></div>
    <div class="card"><div class="kpi">{{ $totais['cavalos'] }}</div><div class="kpi-label">Cavalos</div></div>
    <div class="card"><div class="kpi">{{ $totais['carretas'] }}</div><div class="kpi-label">Carretas</div></div>
    <div class="card"><div class="kpi">{{ $totais['motoristas'] }}</div><div class="kpi-label">Motoristas ativos</div></div>
    <div class="card"><div class="kpi" style="color:#dc2626;">{{ $totais['bloqueados'] }}</div><div class="kpi-label">Veículos bloqueados</div></div>
    <div class="card"><div class="kpi" style="color:#d97706;">{{ $totais['os_abertas'] }}</div><div class="kpi-label">OS abertas</div></div>
</div>

<div class="card">
    <h2 style="font-size:1.1rem;margin-top:0;">⚠️ Vencendo nos próximos 30 dias</h2>
    @if($vencendo->isEmpty())
        <p style="color:#64748b;">Nada vencendo no período.</p>
    @else
    <table>
        <thead><tr><th>Placa</th><th>Tipo</th><th>Vencimento</th><th>Status</th></tr></thead>
        <tbody>
        @foreach($vencendo as $m)
            <tr>
                <td>{{ $m->placa }}</td>
                <td>{{ $m->tipo }}</td>
                <td>{{ optional($m->venc)->format('d/m/Y') }}</td>
                <td><span class="pill {{ $m->status }}">{{ strtoupper($m->status) }}</span></td>
            </tr>
        @endforeach
        </tbody>
    </table>
    @endif
</div>
@endsection
