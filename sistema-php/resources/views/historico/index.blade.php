@extends('layouts.app')
@section('titulo', 'Histórico')
@section('conteudo')
<h1>Histórico de Auditoria</h1>
<div class="toolbar">
    <form method="GET">
        <select name="modulo" onchange="this.form.submit()">
            <option value="">Todos os módulos</option>
            @foreach($modulos as $m)<option value="{{ $m }}" @selected(request('modulo')===$m)>{{ $m }}</option>@endforeach
        </select>
        <input name="busca" placeholder="Descrição" value="{{ request('busca') }}">
        <button class="btn sec sm">Filtrar</button>
    </form>
</div>
<table>
    <thead><tr><th>Quando</th><th>Usuário</th><th>Módulo</th><th>Ação</th><th>Descrição</th></tr></thead>
    <tbody>
    @forelse($eventos as $e)
        <tr>
            <td style="white-space:nowrap;">{{ optional($e->created_at)->format('d/m/Y H:i') }}</td>
            <td>{{ $e->usuario_nome ?? '—' }}</td>
            <td>{{ $e->modulo }}</td>
            <td>{{ $e->acao }}</td>
            <td>{{ $e->descricao }}</td>
        </tr>
    @empty
        <tr><td colspan="5" style="text-align:center;color:#64748b;">Sem registros.</td></tr>
    @endforelse
    </tbody>
</table>
<div style="margin-top:1rem;">{{ $eventos->links() }}</div>
@endsection
