<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>@yield('titulo', 'Pontual Logística')</title>
    <style>
        :root { --azul:#1e3a8a; --azul2:#2563eb; --bg:#f1f5f9; --txt:#0f172a; --borda:#e2e8f0; }
        * { box-sizing:border-box; }
        body { margin:0; font-family:'Segoe UI',system-ui,sans-serif; background:var(--bg); color:var(--txt); }
        header { background:var(--azul); color:#fff; padding:.6rem 1rem; display:flex; align-items:center; gap:1rem; }
        header .logo { font-weight:700; font-size:1.05rem; }
        header form { margin-left:auto; }
        .layout { display:flex; min-height:calc(100vh - 48px); }
        nav { width:210px; background:#fff; border-right:1px solid var(--borda); padding:.5rem 0; }
        nav a { display:block; padding:.55rem 1rem; color:#334155; text-decoration:none; font-size:.92rem; }
        nav a:hover, nav a.ativo { background:#eff6ff; color:var(--azul2); border-left:3px solid var(--azul2); }
        main { flex:1; padding:1.2rem 1.5rem; }
        h1 { font-size:1.4rem; margin:0 0 1rem; }
        table { width:100%; border-collapse:collapse; background:#fff; border-radius:8px; overflow:hidden; }
        th, td { text-align:left; padding:.55rem .7rem; border-bottom:1px solid var(--borda); font-size:.9rem; }
        th { background:#f8fafc; color:#475569; font-weight:600; }
        .btn { display:inline-block; padding:.45rem .8rem; border-radius:6px; border:none; cursor:pointer;
               background:var(--azul2); color:#fff; text-decoration:none; font-size:.88rem; }
        .btn.sec { background:#fff; color:var(--azul2); border:1px solid var(--azul2); }
        .btn.danger { background:#dc2626; }
        .btn.sm { padding:.25rem .5rem; font-size:.8rem; }
        .card { background:#fff; border:1px solid var(--borda); border-radius:8px; padding:1rem; }
        .grid { display:grid; gap:1rem; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); }
        .kpi { font-size:1.8rem; font-weight:700; color:var(--azul); }
        .kpi-label { color:#64748b; font-size:.82rem; }
        label { display:block; font-size:.82rem; color:#475569; margin:.5rem 0 .15rem; }
        input, select, textarea { width:100%; padding:.45rem; border:1px solid #cbd5e1; border-radius:6px; font-size:.9rem; }
        .form-grid { display:grid; gap:.6rem 1rem; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); }
        .alert { padding:.6rem .9rem; border-radius:6px; margin-bottom:1rem; }
        .alert.ok { background:#dcfce7; color:#166534; }
        .alert.err { background:#fee2e2; color:#991b1b; }
        .pill { padding:.15rem .5rem; border-radius:999px; font-size:.75rem; font-weight:600; }
        .pill.vencido { background:#fee2e2; color:#991b1b; }
        .pill.alerta { background:#fef9c3; color:#854d0e; }
        .pill.ok { background:#dcfce7; color:#166534; }
        .pill.bloq { background:#fee2e2; color:#991b1b; }
        .toolbar { display:flex; gap:.5rem; align-items:center; margin-bottom:1rem; flex-wrap:wrap; }
        .toolbar form { display:flex; gap:.4rem; }
        .toolbar input,.toolbar select { width:auto; }
    </style>
</head>
<body>
@auth
<header>
    <span class="logo">⛽ Pontual Logística</span>
    <span style="font-size:.85rem;opacity:.8;">{{ auth()->user()->nome }}</span>
    <form method="POST" action="{{ route('logout') }}">
        @csrf
        <button class="btn sm sec" type="submit">Sair</button>
    </form>
</header>
<div class="layout">
    <nav>
        @php $r = request()->route()?->getName(); @endphp
        <a href="{{ route('dashboard') }}" class="{{ $r==='dashboard'?'ativo':'' }}">Dashboard</a>
        @perm('frota.ver')       <a href="{{ route('frota.index') }}" class="{{ str_starts_with($r??'','frota')?'ativo':'' }}">Frota</a> @endperm
        @perm('motoristas.ver')  <a href="{{ route('motoristas.index') }}" class="{{ str_starts_with($r??'','motoristas')?'ativo':'' }}">Motoristas</a> @endperm
        @perm('oc.ver')          <a href="{{ route('oc.index') }}" class="{{ str_starts_with($r??'','oc')?'ativo':'' }}">Ordens de Carregamento</a> @endperm
        @perm('manutencao.ver')  <a href="{{ route('manutencao.index') }}" class="{{ str_starts_with($r??'','manutencao')?'ativo':'' }}">Manutenção</a> @endperm
        @perm('os.ver')          <a href="{{ route('os.index') }}" class="{{ str_starts_with($r??'','os')?'ativo':'' }}">Ordens de Serviço</a> @endperm
        @perm('clientes.ver')    <a href="{{ route('clientes.index') }}" class="{{ str_starts_with($r??'','clientes')?'ativo':'' }}">Clientes</a> @endperm
        @perm('produtos.ver')    <a href="{{ route('produtos.index') }}" class="{{ str_starts_with($r??'','produtos')?'ativo':'' }}">Produtos</a> @endperm
        @perm('usinas.ver')      <a href="{{ route('usinas.index') }}" class="{{ str_starts_with($r??'','usinas')?'ativo':'' }}">Usinas</a> @endperm
        @perm('historico.ver')   <a href="{{ route('historico.index') }}" class="{{ str_starts_with($r??'','historico')?'ativo':'' }}">Histórico</a> @endperm
    </nav>
    <main>
        @if(session('ok'))      <div class="alert ok">{{ session('ok') }}</div> @endif
        @if($errors->any())     <div class="alert err">{{ $errors->first() }}</div> @endif
        @yield('conteudo')
    </main>
</div>
@else
    @yield('conteudo')
@endauth
</body>
</html>
