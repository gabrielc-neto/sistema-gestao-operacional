@extends('layouts.app')
@section('titulo', $veiculo->exists ? 'Editar veículo' : 'Novo veículo')
@section('conteudo')
<h1>{{ $veiculo->exists ? "Editar {$veiculo->placa}" : 'Novo veículo' }}</h1>

<div class="card" style="max-width:820px;">
<form method="POST" action="{{ $veiculo->exists ? route('frota.update',$veiculo) : route('frota.store') }}">
    @csrf
    @if($veiculo->exists) @method('PUT') @endif

    <div class="form-grid">
        <div>
            <label>Placa *</label>
            <input name="placa" value="{{ old('placa',$veiculo->placa) }}" required>
        </div>
        <div>
            <label>Tipo *</label>
            <select name="tipo" required>
                <option value="cavalo"  @selected(old('tipo',$veiculo->tipo)==='cavalo')>Cavalo</option>
                <option value="carreta" @selected(old('tipo',$veiculo->tipo)==='carreta')>Carreta</option>
            </select>
        </div>
        <div>
            <label>Status *</label>
            <select name="status" required>
                @foreach($statusOpts as $s)
                    <option value="{{ $s }}" @selected(old('status',$veiculo->status)===$s)>{{ str_replace('_',' ',ucfirst($s)) }}</option>
                @endforeach
            </select>
        </div>
        <div>
            <label>Motorista atrelado</label>
            <select name="motorista_id">
                <option value="">—</option>
                @foreach($motoristas as $m)
                    <option value="{{ $m->id }}" @selected(old('motorista_id',$veiculo->motorista_id)==$m->id)>{{ $m->nome }}</option>
                @endforeach
            </select>
        </div>
        <div><label>Modelo</label><input name="modelo" value="{{ old('modelo',$veiculo->modelo) }}"></div>
        <div><label>Fabricante</label><input name="fabricante" value="{{ old('fabricante',$veiculo->fabricante) }}"></div>
        <div><label>Ano fab.</label><input name="ano_fab" value="{{ old('ano_fab',$veiculo->ano_fab) }}"></div>
        <div><label>Ano modelo</label><input name="ano_modelo" value="{{ old('ano_modelo',$veiculo->ano_modelo) }}"></div>
        <div><label>Chassi</label><input name="chassi" value="{{ old('chassi',$veiculo->chassi) }}"></div>
        <div><label>Renavam</label><input name="renavam" value="{{ old('renavam',$veiculo->renavam) }}"></div>
        <div><label>Tara (kg)</label><input name="tara" value="{{ old('tara',$veiculo->tara) }}"></div>
        <div><label>Capacidade (L)</label><input name="cap" value="{{ old('cap',$veiculo->cap) }}"></div>
        <div><label>Composição</label><input name="comp" value="{{ old('comp',$veiculo->comp) }}" placeholder="LS, Bitrem, Rodotrem"></div>
    </div>
    <label>Observações</label>
    <textarea name="obs" rows="2">{{ old('obs',$veiculo->obs) }}</textarea>

    <div style="margin-top:1rem;display:flex;gap:.5rem;">
        <button class="btn" type="submit">Salvar</button>
        <a class="btn sec" href="{{ route('frota.index') }}">Cancelar</a>
    </div>
</form>
</div>

@if($veiculo->exists)
<div class="card" style="max-width:820px;margin-top:1rem;">
    <h2 style="font-size:1.05rem;margin-top:0;">Bloqueio do veículo</h2>
    @if($veiculo->bloqueio_ativo)
        <p>Bloqueado: <strong>{{ $veiculo->bloqueio_motivo }}</strong>
            ({{ $veiculo->bloqueio_origem }}) — {{ $veiculo->bloqueio_obs }}</p>
        @if($veiculo->bloqueio_origem === 'os')
            <p style="color:#991b1b;">Bloqueio por Ordem de Serviço. Finalize a OS para liberar.</p>
        @else
            <form method="POST" action="{{ route('frota.desbloquear',$veiculo) }}">
                @csrf <button class="btn" type="submit">Desbloquear</button>
            </form>
        @endif
    @else
        <form method="POST" action="{{ route('frota.bloquear',$veiculo) }}">
            @csrf
            <div class="form-grid">
                <div>
                    <label>Motivo</label>
                    <select name="bloqueio_motivo" required>
                        @foreach($motivos as $mv)<option value="{{ $mv }}">{{ $mv }}</option>@endforeach
                    </select>
                </div>
                <div><label>Observação</label><input name="bloqueio_obs"></div>
            </div>
            <button class="btn danger" type="submit" style="margin-top:.6rem;">Bloquear</button>
        </form>
    @endif
</div>
@endif
@endsection
