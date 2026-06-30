@extends('layouts.app')
@section('titulo', $cliente->exists ? 'Editar cliente' : 'Novo cliente')
@section('conteudo')
<h1>{{ $cliente->exists ? 'Editar cliente' : 'Novo cliente' }}</h1>
<div class="card" style="max-width:680px;">
<form method="POST" action="{{ $cliente->exists ? route('clientes.update',$cliente) : route('clientes.store') }}">
    @csrf @if($cliente->exists) @method('PUT') @endif
    <div class="form-grid">
        <div><label>Razão social *</label><input name="razao_social" value="{{ old('razao_social',$cliente->razao_social) }}" required></div>
        <div><label>CNPJ</label><input name="cnpj" value="{{ old('cnpj',$cliente->cnpj) }}"></div>
        <div><label>Contato</label><input name="contato" value="{{ old('contato',$cliente->contato) }}"></div>
        <div><label>Latitude</label><input name="lat" value="{{ old('lat',$cliente->lat) }}"></div>
        <div><label>Longitude</label><input name="lng" value="{{ old('lng',$cliente->lng) }}"></div>
    </div>
    <label>Endereço</label><input name="endereco" value="{{ old('endereco',$cliente->endereco) }}">
    <div style="margin-top:1rem;display:flex;gap:.5rem;">
        <button class="btn">Salvar</button>
        <a class="btn sec" href="{{ route('clientes.index') }}">Cancelar</a>
    </div>
</form>
</div>
@endsection
