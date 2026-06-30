@extends('layouts.app')
@section('titulo', 'Entrar — Pontual Logística')
@section('conteudo')
<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;
            background:linear-gradient(135deg,#1e3a8a,#2563eb);">
    <div class="card" style="width:360px;">
        <h1 style="text-align:center;color:#1e3a8a;">⛽ Pontual Logística</h1>
        <p style="text-align:center;color:#64748b;margin-top:-.5rem;">Gestão Operacional</p>

        @if($errors->any())
            <div class="alert err">{{ $errors->first() }}</div>
        @endif

        <form method="POST" action="{{ route('login') }}">
            @csrf
            <label>E-mail</label>
            <input type="email" name="email" value="{{ old('email') }}" autofocus required>
            <label>Senha</label>
            <input type="password" name="password" required>
            <label style="display:flex;align-items:center;gap:.4rem;margin-top:.6rem;">
                <input type="checkbox" name="remember" style="width:auto;"> Lembrar de mim
            </label>
            <button class="btn" type="submit" style="width:100%;margin-top:1rem;">Entrar</button>
        </form>
    </div>
</div>
@endsection
