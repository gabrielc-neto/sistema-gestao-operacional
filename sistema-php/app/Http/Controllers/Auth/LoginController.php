<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Services\Auditoria;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\View\View;

class LoginController extends Controller
{
    public function mostrar(): View
    {
        return view('auth.login');
    }

    public function entrar(Request $request): RedirectResponse
    {
        $dados = $request->validate([
            'email'    => ['required', 'email'],
            'password' => ['required'],
        ]);

        $email = strtolower(trim($dados['email']));

        // Só usuários ativos podem logar (regra do sistema original).
        if (Auth::attempt(['email' => $email, 'password' => $dados['password'], 'ativo' => 1], $request->boolean('remember'))) {
            $request->session()->regenerate();
            Auditoria::log('auth', 'login', 'usuarios', Auth::id(), 'Login efetuado');
            return redirect()->intended(route('dashboard'));
        }

        return back()->withErrors([
            'email' => 'Credenciais inválidas ou usuário inativo.',
        ])->onlyInput('email');
    }

    public function sair(Request $request): RedirectResponse
    {
        Auditoria::log('auth', 'logout', 'usuarios', Auth::id(), 'Logout');
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();
        return redirect()->route('login');
    }
}
