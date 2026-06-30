@extends('layouts.app')
@section('titulo', $produto->exists ? 'Editar produto' : 'Novo produto')
@section('conteudo')
<h1>{{ $produto->exists ? 'Editar produto' : 'Novo produto' }}</h1>
<div class="card" style="max-width:540px;">
<form method="POST" action="{{ $produto->exists ? route('produtos.update',$produto) : route('produtos.store') }}">
    @csrf @if($produto->exists) @method('PUT') @endif
    <label>Nome *</label><input name="nome" value="{{ old('nome',$produto->nome) }}" required>
    <label>Código ANP</label><input name="codigo_anp" value="{{ old('codigo_anp',$produto->codigo_anp) }}">
    <label>Unidade *</label><input name="unidade" value="{{ old('unidade',$produto->unidade ?? 'litros') }}" required>
    <div style="margin-top:1rem;display:flex;gap:.5rem;">
        <button class="btn">Salvar</button>
        <a class="btn sec" href="{{ route('produtos.index') }}">Cancelar</a>
    </div>
</form>
</div>
@endsection
