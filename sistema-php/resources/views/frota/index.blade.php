@extends('layouts.app')
@section('titulo', 'Frota')
@section('conteudo')
<h1>Frota</h1>

<div class="toolbar">
    <form method="GET">
        <input type="text" name="busca" placeholder="Placa ou modelo" value="{{ request('busca') }}">
        <select name="tipo" onchange="this.form.submit()">
            <option value="">Todos</option>
            <option value="cavalo"  @selected(request('tipo')==='cavalo')>Cavalos</option>
            <option value="carreta" @selected(request('tipo')==='carreta')>Carretas</option>
        </select>
        <button class="btn sec sm" type="submit">Filtrar</button>
    </form>
    @perm('frota.criar')
        <a class="btn" href="{{ route('frota.create') }}" style="margin-left:auto;">+ Novo veículo</a>
    @endperm
</div>

<table>
    <thead>
        <tr><th>Placa</th><th>Tipo</th><th>Modelo</th><th>Motorista</th><th>Status</th><th>Bloqueio</th><th></th></tr>
    </thead>
    <tbody>
    @forelse($veiculos as $v)
        <tr>
            <td><strong>{{ $v->placa }}</strong></td>
            <td>{{ ucfirst($v->tipo) }}</td>
            <td>{{ $v->modelo }}</td>
            <td>{{ $v->motorista?->nome ?? '—' }}</td>
            <td>{{ str_replace('_',' ', ucfirst($v->status)) }}</td>
            <td>
                @if($v->bloqueio_ativo)
                    <span class="pill bloq">{{ $v->bloqueio_motivo }}{{ $v->bloqueio_origem==='os' ? ' (OS)' : '' }}</span>
                @else
                    <span class="pill ok">Livre</span>
                @endif
            </td>
            <td style="white-space:nowrap;">
                @perm('frota.editar')<a class="btn sec sm" href="{{ route('frota.edit',$v) }}">Editar</a>@endperm
                @perm('frota.excluir')
                    <form method="POST" action="{{ route('frota.destroy',$v) }}" style="display:inline"
                          onsubmit="return confirm('Excluir {{ $v->placa }}?')">
                        @csrf @method('DELETE')
                        <button class="btn danger sm" type="submit">×</button>
                    </form>
                @endperm
            </td>
        </tr>
    @empty
        <tr><td colspan="7" style="text-align:center;color:#64748b;">Nenhum veículo cadastrado.</td></tr>
    @endforelse
    </tbody>
</table>

<div style="margin-top:1rem;">{{ $veiculos->links() }}</div>
@endsection
