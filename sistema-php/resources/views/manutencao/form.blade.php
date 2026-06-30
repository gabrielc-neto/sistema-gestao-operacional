@extends('layouts.app')
@section('titulo', $item->exists ? 'Editar item' : 'Novo item')
@section('conteudo')
<h1>{{ $item->exists ? 'Editar item de manutenção' : 'Novo item de manutenção' }}</h1>
<div class="card" style="max-width:720px;">
<form method="POST" action="{{ $item->exists ? route('manutencao.update',$item) : route('manutencao.store') }}">
    @csrf @if($item->exists) @method('PUT') @endif
    <div class="form-grid">
        <div>
            <label>Veículo (placa)</label>
            <input name="placa" value="{{ old('placa',$item->placa) }}" list="placas" style="text-transform:uppercase;">
            <datalist id="placas">@foreach($veiculos as $v)<option value="{{ $v->placa }}">@endforeach</datalist>
        </div>
        <div>
            <label>Tipo *</label>
            <select name="tipo" required>
                @foreach($tipos as $grupo => $lista)
                    <optgroup label="{{ $grupo }}">
                        @foreach($lista as $t)<option value="{{ $t }}" @selected(old('tipo',$item->tipo)===$t)>{{ $t }}</option>@endforeach
                    </optgroup>
                @endforeach
            </select>
        </div>
        <div><label>Data realização</label><input type="date" name="data_realiz" value="{{ old('data_realiz',optional($item->data_realiz)->format('Y-m-d')) }}"></div>
        <div><label>Vencimento</label><input type="date" name="venc" value="{{ old('venc',optional($item->venc)->format('Y-m-d')) }}"></div>
        <div><label>Local/Oficina</label><input name="local" value="{{ old('local',$item->local) }}"></div>
        <div><label>Nº documento</label><input name="numero_doc" value="{{ old('numero_doc',$item->numero_doc) }}"></div>
        <div><label>KM atual</label><input name="km_atual" value="{{ old('km_atual',$item->km_atual) }}"></div>
        <div><label>Responsável</label><input name="resp" value="{{ old('resp',$item->resp) }}"></div>
    </div>
    <label>Observações</label><textarea name="obs" rows="2">{{ old('obs',$item->obs) }}</textarea>
    <div style="margin-top:1rem;display:flex;gap:.5rem;">
        <button class="btn">Salvar</button>
        <a class="btn sec" href="{{ route('manutencao.index') }}">Cancelar</a>
    </div>
</form>
</div>
@endsection
