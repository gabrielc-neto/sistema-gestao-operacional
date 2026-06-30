@extends('layouts.app')
@section('titulo', 'Nova OC')
@section('conteudo')
<h1>Nova Ordem de Carregamento</h1>
<div class="card" style="max-width:900px;">
<form method="POST" action="{{ route('oc.store') }}">
    @csrf
    <div class="form-grid">
        <div><label>Data</label><input type="date" name="data" value="{{ old('data',date('Y-m-d')) }}"></div>
        <div><label>Hora</label><input name="hora" value="{{ old('hora',date('H:i')) }}" placeholder="HH:MM"></div>
        <div>
            <label>Base *</label>
            <select name="base" required>
                @foreach($bases as $b)<option value="{{ $b }}" @selected(old('base')===$b)>{{ $b }}</option>@endforeach
            </select>
        </div>
        <div>
            <label>Cavalo</label>
            <select name="cavalo_id">
                <option value="">—</option>
                @foreach($cavalos as $c)
                    <option value="{{ $c->id }}" @disabled($c->bloqueio_ativo) @selected(old('cavalo_id')==$c->id)>
                        {{ $c->placa }}{{ $c->bloqueio_ativo ? ' (BLOQUEADO)' : '' }}
                    </option>
                @endforeach
            </select>
        </div>
        <div>
            <label>Motorista</label>
            <select name="motorista_id">
                <option value="">—</option>
                @foreach($motoristas as $m)<option value="{{ $m->id }}" @selected(old('motorista_id')==$m->id)>{{ $m->nome }}</option>@endforeach
            </select>
        </div>
        <div><label>Responsável</label><input name="resp" value="{{ old('resp',auth()->user()->nome) }}"></div>
    </div>

    <h3 style="margin:1.2rem 0 .4rem;font-size:1rem;">Entregas</h3>
    <table id="entregas">
        <thead><tr><th>Destino</th><th>Produto</th><th>Volume (L)</th><th>Requisição</th><th></th></tr></thead>
        <tbody>
            <tr>
                <td><input name="entregas[0][dest]"></td>
                <td><select name="entregas[0][prod]"><option value="">—</option>@foreach($produtos as $p)<option>{{ $p }}</option>@endforeach</select></td>
                <td><input type="number" name="entregas[0][vol]"></td>
                <td><input name="entregas[0][req]"></td>
                <td><button type="button" class="btn danger sm" onclick="this.closest('tr').remove()">×</button></td>
            </tr>
        </tbody>
    </table>
    <button type="button" class="btn sec sm" style="margin-top:.5rem;" onclick="addEntrega()">+ Adicionar entrega</button>

    <label style="margin-top:1rem;">Observações</label><textarea name="obs" rows="2">{{ old('obs') }}</textarea>
    <div style="margin-top:1rem;display:flex;gap:.5rem;">
        <button class="btn">Criar OC</button>
        <a class="btn sec" href="{{ route('oc.index') }}">Cancelar</a>
    </div>
</form>
</div>

<script>
let idx = 1;
const PRODUTOS = @json($produtos);
function addEntrega() {
    const tb = document.querySelector('#entregas tbody');
    const tr = document.createElement('tr');
    const opts = '<option value="">—</option>' + PRODUTOS.map(p => `<option>${p}</option>`).join('');
    tr.innerHTML = `
        <td><input name="entregas[${idx}][dest]"></td>
        <td><select name="entregas[${idx}][prod]">${opts}</select></td>
        <td><input type="number" name="entregas[${idx}][vol]"></td>
        <td><input name="entregas[${idx}][req]"></td>
        <td><button type="button" class="btn danger sm" onclick="this.closest('tr').remove()">×</button></td>`;
    tb.appendChild(tr);
    idx++;
}
</script>
@endsection
