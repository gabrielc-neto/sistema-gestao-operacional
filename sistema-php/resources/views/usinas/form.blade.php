@extends('layouts.app')
@section('titulo', $usina->exists ? 'Editar usina' : 'Nova usina')
@section('conteudo')
<h1>{{ $usina->exists ? 'Editar usina' : 'Nova usina' }}</h1>
<div class="card" style="max-width:680px;">
<form method="POST" action="{{ $usina->exists ? route('usinas.update',$usina) : route('usinas.store') }}">
    @csrf @if($usina->exists) @method('PUT') @endif
    <div class="form-grid">
        <div><label>Nome *</label><input name="nome" value="{{ old('nome',$usina->nome) }}" required></div>
        <div><label>Latitude</label><input name="lat" value="{{ old('lat',$usina->lat) }}"></div>
        <div><label>Longitude</label><input name="lng" value="{{ old('lng',$usina->lng) }}"></div>
    </div>
    <label>Endereço</label><input name="endereco" value="{{ old('endereco',$usina->endereco) }}">
    <label>Produtos disponíveis (separados por vírgula)</label>
    <input name="produtos_disponiveis" value="{{ old('produtos_disponiveis', implode(', ', (array)($usina->produtos_disponiveis ?? []))) }}" placeholder="Diesel S10, Anidro">
    <div style="margin-top:1rem;display:flex;gap:.5rem;">
        <button class="btn">Salvar</button>
        <a class="btn sec" href="{{ route('usinas.index') }}">Cancelar</a>
    </div>
</form>
</div>
@endsection
