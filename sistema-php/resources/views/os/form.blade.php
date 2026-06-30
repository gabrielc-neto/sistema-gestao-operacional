@extends('layouts.app')
@section('titulo', $os->exists ? 'Editar OS' : 'Abrir OS')
@section('conteudo')
<h1>{{ $os->exists ? "Editar {$os->numero}" : 'Abrir Ordem de Serviço' }}</h1>

@unless($os->exists)
    <p style="color:#854d0e;">⚠️ Abrir a OS <strong>bloqueia o veículo</strong> automaticamente. Só libera ao finalizar.</p>
@endunless

<div class="card" style="max-width:680px;">
<form method="POST" action="{{ $os->exists ? route('os.update',$os) : route('os.store') }}">
    @csrf @if($os->exists) @method('PUT') @endif
    <div class="form-grid">
        <div><label>Tipo de serviço *</label><input name="tipo_servico" value="{{ old('tipo_servico',$os->tipo_servico) }}" placeholder="Troca de óleo, Freios..." required></div>
        @unless($os->exists)
            <div><label>Placa *</label><input name="placa" value="{{ old('placa',$os->placa) }}" required style="text-transform:uppercase;"></div>
        @else
            <div><label>Placa</label><input value="{{ $os->placa }}" disabled></div>
        @endunless
        <div>
            <label>Motorista</label>
            <select name="motorista_id">
                <option value="">—</option>
                @foreach($motoristas as $m)
                    <option value="{{ $m->id }}" @selected(old('motorista_id',$os->motorista_id)==$m->id)>{{ $m->nome }}</option>
                @endforeach
            </select>
        </div>
    </div>
    <label>Observações</label><textarea name="obs" rows="3">{{ old('obs',$os->obs) }}</textarea>
    <div style="margin-top:1rem;display:flex;gap:.5rem;">
        <button class="btn">{{ $os->exists ? 'Salvar' : 'Abrir OS' }}</button>
        <a class="btn sec" href="{{ route('os.index') }}">Cancelar</a>
    </div>
</form>
</div>
@endsection
