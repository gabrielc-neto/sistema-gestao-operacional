@extends('layouts.app')
@section('titulo', $motorista->exists ? 'Editar motorista' : 'Novo motorista')
@section('conteudo')
<h1>{{ $motorista->exists ? "Editar {$motorista->nome}" : 'Novo motorista' }}</h1>
<div class="card" style="max-width:720px;">
<form method="POST" action="{{ $motorista->exists ? route('motoristas.update',$motorista) : route('motoristas.store') }}">
    @csrf @if($motorista->exists) @method('PUT') @endif
    <div class="form-grid">
        <div><label>Nome *</label><input name="nome" value="{{ old('nome',$motorista->nome) }}" required></div>
        <div><label>CNH</label><input name="cnh" value="{{ old('cnh',$motorista->cnh) }}"></div>
        <div><label>Categoria</label><input name="cat" value="{{ old('cat',$motorista->cat) }}" placeholder="D, E"></div>
        <div><label>Telefone</label><input name="tel" value="{{ old('tel',$motorista->tel) }}"></div>
        <div>
            <label>Status *</label>
            <select name="status" required>
                @foreach(['ativo','inativo','desligado'] as $s)
                    <option value="{{ $s }}" @selected(old('status',$motorista->status ?? 'ativo')===$s)>{{ ucfirst($s) }}</option>
                @endforeach
            </select>
        </div>
        <div><label>CNH vencimento</label><input type="date" name="cnh_venc" value="{{ old('cnh_venc',optional($motorista->cnh_venc)->format('Y-m-d')) }}"></div>
        <div><label>MOPP vencimento</label><input type="date" name="mopp_venc" value="{{ old('mopp_venc',optional($motorista->mopp_venc)->format('Y-m-d')) }}"></div>
        <div><label>NR-20 vencimento</label><input type="date" name="nr20_venc" value="{{ old('nr20_venc',optional($motorista->nr20_venc)->format('Y-m-d')) }}"></div>
        <div><label>NR-35 vencimento</label><input type="date" name="nr35_venc" value="{{ old('nr35_venc',optional($motorista->nr35_venc)->format('Y-m-d')) }}"></div>
    </div>
    <label>Observações</label><textarea name="obs" rows="2">{{ old('obs',$motorista->obs) }}</textarea>
    <div style="margin-top:1rem;display:flex;gap:.5rem;">
        <button class="btn">Salvar</button>
        <a class="btn sec" href="{{ route('motoristas.index') }}">Cancelar</a>
    </div>
</form>
</div>
@endsection
