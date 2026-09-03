#!/usr/bin/env python3
"""
Seed admin user no PostgreSQL (backend-vps).
Uso:
  python scripts/seed_admin_pg.py --email admin@pontual.com --senha 'minhasenha123' --nome 'Admin Pontual'
Ou defina variáveis de ambiente ADMIN_EMAIL, ADMIN_SENHA, ADMIN_NOME.
"""
import os, sys, argparse
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend-vps'))

try:
    import bcrypt
except ImportError:
    print("Instalando bcrypt...")
    os.system(f"{sys.executable} -m pip install bcrypt")
    import bcrypt

try:
    import pg8000.native as pg
except ImportError:
    print("Instalando pg8000...")
    os.system(f"{sys.executable} -m pip install pg8000")
    import pg8000.native as pg

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--email", default=os.getenv("ADMIN_EMAIL", "admin@pontual.com"))
    parser.add_argument("--senha", default=os.getenv("ADMIN_SENHA"))
    parser.add_argument("--nome", default=os.getenv("ADMIN_NOME", "Admin Pontual"))
    args = parser.parse_args()

    if not args.senha:
        print("ERRO: defina --senha ou ADMIN_SENHA")
        sys.exit(1)

    if len(args.senha) < 6:
        print("ERRO: senha deve ter pelo menos 6 caracteres")
        sys.exit(1)

    # Conecta no PostgreSQL local
    conn = pg.Connection(
        host="127.0.0.1",
        port=5432,
        database="pontual",
        user="pontual_app",
        password="pontual123"
    )

    email = args.email.lower().strip()
    hash_senha = bcrypt.hashpw(args.senha.encode(), bcrypt.gensalt()).decode()

    # Verifica se já existe
    rows = conn.run("SELECT id, email FROM usuarios_auth WHERE email = $1", [email])
    if rows:
        uid = rows[0][0]
        print(f"Usuário já existe: {email} (id={uid})")
        # Atualiza senha e garante super_admin
        conn.run(
            "UPDATE usuarios_auth SET senha_hash = $1, is_super_admin = true, ativo = true WHERE id = $2",
            [hash_senha, uid]
        )
        print("Senha atualizada e super_admin garantido.")
    else:
        # Insere novo
        rows = conn.run(
            """INSERT INTO usuarios_auth (email, senha_hash, nome, is_super_admin, ativo)
               VALUES ($1, $2, $3, true, true) RETURNING id""",
            [email, hash_senha, args.nome]
        )
        uid = rows[0][0]
        print(f"Admin criado: {email} (id={uid})")

    conn.close()
    print("\nPronto. Use estas credenciais no frontend:")
    print(f"  Email: {email}")
    print(f"  Senha: {args.senha}")

if __name__ == "__main__":
    main()